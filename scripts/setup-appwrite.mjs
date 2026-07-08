import { Client, Databases, Permission, Query, Role, Users } from "node-appwrite";
import { readFileSync } from "node:fs";

const env = loadEnv([".env.local", ".env.example"]);

const config = {
  endpoint: requireEnv("NEXT_PUBLIC_APPWRITE_ENDPOINT"),
  projectId: requireEnv("NEXT_PUBLIC_APPWRITE_PROJECT_ID"),
  apiKey: env.APPWRITE_API_KEY || env.API_KEY || "",
  databaseId: requireEnv("NEXT_PUBLIC_APPWRITE_DATABASE_ID"),
  collections: {
    lenders: requireEnv("NEXT_PUBLIC_APPWRITE_LENDERS_COLLECTION_ID"),
    borrowers: requireEnv("NEXT_PUBLIC_APPWRITE_BORROWERS_COLLECTION_ID"),
    collectors: requireEnv("NEXT_PUBLIC_APPWRITE_COLLECTORS_COLLECTION_ID"),
    loans: requireEnv("NEXT_PUBLIC_APPWRITE_LOANS_COLLECTION_ID"),
    payments: requireEnv("NEXT_PUBLIC_APPWRITE_PAYMENTS_COLLECTION_ID"),
  },
};

if (!config.apiKey) {
  throw new Error("APPWRITE_API_KEY or API_KEY is required for setup.");
}

const client = new Client()
  .setEndpoint(config.endpoint)
  .setProject(config.projectId)
  .setKey(config.apiKey);

const databases = new Databases(client);
const users = new Users(client);

const collectionPermissions = [
  Permission.read(Role.users()),
  Permission.create(Role.users()),
  Permission.update(Role.users()),
  Permission.delete(Role.users()),
];

const schema = [
  {
    id: config.collections.lenders,
    name: "Lenders",
    attributes: [
      stringAttr("appwrite_user_id", 64, true),
      stringAttr("company_name", 160, true),
      stringAttr("email", 160, true),
      stringAttr("contact_info", 1000, false),
      enumAttr("status", ["active", "inactive"], true),
      stringAttr("currency", 8, false, "USD"),
      datetimeAttr("created_at", true),
    ],
    indexes: [
      keyIndex("idx_appwrite_user_id", ["appwrite_user_id"]),
      keyIndex("idx_lender_status", ["status"]),
    ],
  },
  {
    id: config.collections.borrowers,
    name: "Borrowers",
    attributes: [
      stringAttr("lender_id", 64, true),
      stringAttr("name", 160, true),
      stringAttr("business_name", 160, false),
      stringAttr("contact", 160, false),
      stringAttr("address", 500, false),
      stringAttr("search_text", 2000, false),
      enumAttr("status", ["active", "inactive"], true),
      datetimeAttr("created_at", true),
    ],
    indexes: [
      keyIndex("idx_borrower_lender_id", ["lender_id"]),
      keyIndex("idx_borrower_status", ["status"]),
      keyIndex("idx_borrower_lender_created", ["lender_id", "created_at"]),
      fulltextIndex("idx_borrower_name", ["name"]),
      fulltextIndex("idx_borrower_business_name", ["business_name"]),
      fulltextIndex("idx_borrower_contact", ["contact"]),
      fulltextIndex("idx_borrower_address", ["address"]),
      fulltextIndex("idx_borrower_search_text", ["search_text"]),
    ],
  },
  {
    id: config.collections.collectors,
    name: "Collectors",
    attributes: [
      stringAttr("lender_id", 64, true),
      stringAttr("name", 160, true),
      stringAttr("contact_info", 1000, false),
      enumAttr("status", ["active", "inactive"], true),
      datetimeAttr("created_at", true),
    ],
    indexes: [
      keyIndex("idx_collector_lender_id", ["lender_id"]),
      keyIndex("idx_collector_status", ["status"]),
      keyIndex("idx_collector_lender_status", ["lender_id", "status"]),
      keyIndex("idx_collector_lender_created", ["lender_id", "created_at"]),
    ],
  },
  {
    id: config.collections.loans,
    name: "Loans",
    attributes: [
      stringAttr("lender_id", 64, true),
      stringAttr("borrower_id", 64, true),
      floatAttr("amount", true, 0),
      floatAttr("interest_rate", true, 0),
      floatAttr("daily_payment", true, 0),
      floatAttr("total_paid", false, 0, undefined, 0),
      floatAttr("remaining_amount", false, 0, undefined, 0),
      datetimeAttr("start_date", true),
      datetimeAttr("end_date", true),
      enumAttr("status", ["active", "completed", "overdue", "cancelled"], true),
      stringAttr("qr_code", 12000, true),
      stringAttr("search_text", 2000, false),
      datetimeAttr("created_at", true),
    ],
    indexes: [
      keyIndex("idx_loan_lender_id", ["lender_id"]),
      keyIndex("idx_loan_borrower_id", ["borrower_id"]),
      keyIndex("idx_loan_status", ["status"]),
      keyIndex("idx_loan_lender_status", ["lender_id", "status"]),
      keyIndex("idx_loan_lender_borrower", ["lender_id", "borrower_id"]),
      keyIndex("idx_loan_lender_created", ["lender_id", "created_at"]),
      fulltextIndex("idx_loan_search_text", ["search_text"]),
    ],
  },
  {
    id: config.collections.payments,
    name: "Payments",
    attributes: [
      stringAttr("lender_id", 64, true),
      stringAttr("loan_id", 64, true),
      stringAttr("collector_id", 64, true),
      datetimeAttr("date", true),
      floatAttr("amount", true, 0),
      enumAttr("method", ["cash", "transfer", "card", "check", "other"], true),
      datetimeAttr("created_at", true),
    ],
    indexes: [
      keyIndex("idx_payment_lender_id", ["lender_id"]),
      keyIndex("idx_payment_loan_id", ["loan_id"]),
      keyIndex("idx_payment_collector_id", ["collector_id"]),
      keyIndex("idx_payment_date", ["date"]),
      keyIndex("idx_payment_lender_date", ["lender_id", "date"]),
      keyIndex("idx_payment_lender_collector", ["lender_id", "collector_id"]),
    ],
  },
];

await main();

async function main() {
  console.log("Setting up Appwrite database schema...");
  await ensureDatabase();

  for (const collection of schema) {
    await ensureCollection(collection);
    for (const attribute of collection.attributes) {
      await ensureAttribute(collection.id, attribute);
    }
    await waitForAttributes(collection.id, collection.attributes.map((attribute) => attribute.key));
    for (const index of collection.indexes) {
      await ensureIndex(collection.id, index);
    }
  }

  await migrateBorrowerContactFields();

  console.log("Seeding sample data...");
  const seed = await seedData();
  console.log("Appwrite setup complete.");
  console.log(`Seed lender: ${seed.lenderId}`);
  console.log(`Seed collector: ${seed.collectorId}`);
  console.log(`Seed loan: ${seed.loanId}`);
}

async function ensureDatabase() {
  try {
    await databases.get({ databaseId: config.databaseId });
    console.log(`Database exists: ${config.databaseId}`);
  } catch (error) {
    if (!isMissing(error)) {
      throw error;
    }

    await databases.create({
      databaseId: config.databaseId,
      name: "MortgagePro",
    });
    console.log(`Created database: ${config.databaseId}`);
  }
}

async function ensureCollection(collection) {
  try {
    await databases.getCollection({
      databaseId: config.databaseId,
      collectionId: collection.id,
    });
    console.log(`Collection exists: ${collection.id}`);
  } catch (error) {
    if (!isMissing(error)) {
      throw error;
    }

    await databases.createCollection({
      databaseId: config.databaseId,
      collectionId: collection.id,
      name: collection.name,
      permissions: collectionPermissions,
      documentSecurity: false,
      enabled: true,
    });
    console.log(`Created collection: ${collection.id}`);
  }
}

async function ensureAttribute(collectionId, attribute) {
  try {
    await databases.getAttribute({
      databaseId: config.databaseId,
      collectionId,
      key: attribute.key,
    });
    return;
  } catch (error) {
    if (!isMissing(error)) {
      throw error;
    }
  }

  if (attribute.type === "string") {
    await databases.createStringAttribute({
      databaseId: config.databaseId,
      collectionId,
      key: attribute.key,
      size: attribute.size,
      required: attribute.required,
      xdefault: attribute.xdefault,
    });
  }

  if (attribute.type === "float") {
    await databases.createFloatAttribute({
      databaseId: config.databaseId,
      collectionId,
      key: attribute.key,
      required: attribute.required,
      min: attribute.min,
      max: attribute.max,
      xdefault: attribute.xdefault,
    });
  }

  if (attribute.type === "enum") {
    await databases.createEnumAttribute({
      databaseId: config.databaseId,
      collectionId,
      key: attribute.key,
      elements: attribute.elements,
      required: attribute.required,
      xdefault: attribute.xdefault,
    });
  }

  if (attribute.type === "datetime") {
    await databases.createDatetimeAttribute({
      databaseId: config.databaseId,
      collectionId,
      key: attribute.key,
      required: attribute.required,
      xdefault: attribute.xdefault,
    });
  }

  console.log(`Created attribute: ${collectionId}.${attribute.key}`);
}

async function waitForAttributes(collectionId, keys) {
  for (const key of keys) {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const attribute = await databases.getAttribute({
        databaseId: config.databaseId,
        collectionId,
        key,
      });

      if (attribute.status === "available") {
        break;
      }

      if (attribute.status === "failed") {
        throw new Error(`Attribute failed: ${collectionId}.${key}`);
      }

      await sleep(1000);
    }
  }
}

async function ensureIndex(collectionId, index) {
  try {
    await databases.getIndex({
      databaseId: config.databaseId,
      collectionId,
      key: index.key,
    });
    return;
  } catch (error) {
    if (!isMissing(error)) {
      throw error;
    }
  }

  await databases.createIndex({
    databaseId: config.databaseId,
    collectionId,
    key: index.key,
    type: index.type,
    attributes: index.attributes,
  });
  console.log(`Created index: ${collectionId}.${index.key}`);
}

async function seedData() {
  const now = new Date().toISOString();
  const lenderId = "seed_lender_northstar";
  const borrowerId = "seed_borrower_avery";
  const collectorId = "seed_collector_jordan";
  const loanId = "seed_loan_avery_001";
  const paymentId = "seed_payment_avery_001";
  const lenderUser = await ensureUser({
    userId: "seed_lender_user",
    email: "demo.lender@mortgagepro.local",
    password: "DemoPassword123!",
    name: "Northstar Home Lending",
  });

  await upsertDocument(config.collections.lenders, lenderId, {
    appwrite_user_id: lenderUser.$id,
    company_name: "Northstar Home Lending",
    email: "demo.lender@mortgagepro.local",
    contact_info: JSON.stringify({
      phone: "+1 555 0100",
      address: "100 Market Street, Austin, TX",
    }),
    status: "active",
    currency: "USD",
    created_at: now,
  });

  await upsertDocument(config.collections.borrowers, borrowerId, {
    lender_id: lenderId,
    name: "Avery Johnson",
    business_name: "Johnson Market",
    contact: "+1 555 0101",
    address: "22 Cedar Road, Austin, TX",
    search_text: createBorrowerSearchText({
      borrowerName: "Avery Johnson",
      borrowerContact: "+1 555 0101",
      borrowerAddress: "22 Cedar Road, Austin, TX",
    }),
    status: "active",
    created_at: now,
  });

  await upsertDocument(config.collections.collectors, collectorId, {
    lender_id: lenderId,
    name: "Jordan Lee",
    contact_info: JSON.stringify({
      phone: "+1 555 0102",
      area: "Austin North",
    }),
    status: "active",
    created_at: now,
  });

  await upsertDocument(config.collections.loans, loanId, {
    lender_id: lenderId,
    borrower_id: borrowerId,
    amount: 5000,
    interest_rate: 12.5,
    daily_payment: 125,
    total_paid: 125,
    remaining_amount: 4875,
    start_date: "2026-07-06T00:00:00.000Z",
    end_date: "2026-08-15T00:00:00.000Z",
    status: "active",
    qr_code: loanId,
    search_text: createLoanSearchText({
      borrowerName: "Avery Johnson",
      borrowerContact: "+1 555 0101",
      borrowerAddress: "22 Cedar Road, Austin, TX",
    }),
    created_at: now,
  });

  await upsertDocument(config.collections.payments, paymentId, {
    lender_id: lenderId,
    loan_id: loanId,
    collector_id: collectorId,
    date: now,
    amount: 125,
    method: "cash",
    created_at: now,
  });

  await backfillBorrowerSearchText(lenderId);
  await backfillLoanSearchText(lenderId);
  await backfillLoanPaymentTotals(lenderId);

  return {
    lenderId,
    collectorId,
    loanId,
  };
}

async function ensureUser(user) {
  const existing = await users.list({
    queries: [Query.equal("email", user.email)],
  });

  if (existing.users.length > 0) {
    return existing.users[0];
  }

  return users.create(user);
}

async function upsertDocument(collectionId, documentId, data) {
  try {
    await databases.createDocument({
      databaseId: config.databaseId,
      collectionId,
      documentId,
      data,
    });
    console.log(`Created document: ${collectionId}.${documentId}`);
  } catch (error) {
    if (error?.code !== 409) {
      throw error;
    }

    await databases.updateDocument({
      databaseId: config.databaseId,
      collectionId,
      documentId,
      data,
    });
    console.log(`Updated document: ${collectionId}.${documentId}`);
  }
}

async function migrateBorrowerContactFields() {
  if (!(await hasAttribute(config.collections.borrowers, "contact_info"))) {
    return;
  }

  const borrowers = await databases.listDocuments({
    databaseId: config.databaseId,
    collectionId: config.collections.borrowers,
    queries: [
      Query.limit(5000),
      Query.select(["$id", "contact_info", "contact", "address"]),
    ],
  });

  for (const borrower of borrowers.documents) {
    const parsed = parseBorrowerContactInfo(String(borrower.contact_info ?? ""));
    const contact = String(borrower.contact ?? "") || parsed.contact;
    const address = String(borrower.address ?? "") || parsed.address;

    await databases.updateDocument({
      databaseId: config.databaseId,
      collectionId: config.collections.borrowers,
      documentId: borrower.$id,
      data: { contact, address },
    });
    console.log(`Migrated borrower contact fields: ${borrower.$id}`);
  }

  await deleteAttributeIfExists(config.collections.borrowers, "contact_info");
}

async function hasAttribute(collectionId, key) {
  try {
    await databases.getAttribute({
      databaseId: config.databaseId,
      collectionId,
      key,
    });
    return true;
  } catch (error) {
    if (isMissing(error)) {
      return false;
    }

    throw error;
  }
}

async function deleteAttributeIfExists(collectionId, key) {
  if (!(await hasAttribute(collectionId, key))) {
    return;
  }

  await databases.deleteAttribute({
    databaseId: config.databaseId,
    collectionId,
    key,
  });
  console.log(`Deleted attribute: ${collectionId}.${key}`);
}

function stringAttr(key, size, required, xdefault) {
  return { type: "string", key, size, required, xdefault };
}

function floatAttr(key, required, min, max, xdefault) {
  return { type: "float", key, required, min, max, xdefault };
}

function enumAttr(key, elements, required, xdefault) {
  return { type: "enum", key, elements, required, xdefault };
}

function datetimeAttr(key, required, xdefault) {
  return { type: "datetime", key, required, xdefault };
}

function keyIndex(key, attributes) {
  return { key, type: "key", attributes };
}

function fulltextIndex(key, attributes) {
  return { key, type: "fulltext", attributes };
}

async function backfillBorrowerSearchText(lenderId) {
  const borrowers = await databases.listDocuments({
    databaseId: config.databaseId,
    collectionId: config.collections.borrowers,
    queries: [
      Query.equal("lender_id", lenderId),
      Query.limit(5000),
      Query.select(["$id", "name", "contact", "address", "search_text"]),
    ],
  });

  for (const borrower of borrowers.documents) {
    const searchText = createBorrowerSearchText({
      borrowerName: String(borrower.name ?? ""),
      borrowerContact: String(borrower.contact ?? ""),
      borrowerAddress: String(borrower.address ?? ""),
    });

    if (borrower.search_text === searchText) {
      continue;
    }

    await databases.updateDocument({
      databaseId: config.databaseId,
      collectionId: config.collections.borrowers,
      documentId: borrower.$id,
      data: { search_text: searchText },
    });
    console.log(`Updated borrower search text: ${borrower.$id}`);
  }
}

async function backfillLoanSearchText(lenderId) {
  const [borrowers, loans] = await Promise.all([
    databases.listDocuments({
      databaseId: config.databaseId,
      collectionId: config.collections.borrowers,
      queries: [Query.equal("lender_id", lenderId), Query.limit(5000)],
    }),
    databases.listDocuments({
      databaseId: config.databaseId,
      collectionId: config.collections.loans,
      queries: [Query.equal("lender_id", lenderId), Query.limit(5000)],
    }),
  ]);
  const borrowersById = new Map(
    borrowers.documents.map((borrower) => [borrower.$id, borrower]),
  );

  for (const loan of loans.documents) {
    const borrower = borrowersById.get(String(loan.borrower_id ?? ""));

    if (!borrower) {
      continue;
    }

    const searchText = createLoanSearchText({
      borrowerName: String(borrower.name ?? ""),
      borrowerContact: String(borrower.contact ?? ""),
      borrowerAddress: String(borrower.address ?? ""),
    });

    if (loan.search_text === searchText) {
      continue;
    }

    await databases.updateDocument({
      databaseId: config.databaseId,
      collectionId: config.collections.loans,
      documentId: loan.$id,
      data: { search_text: searchText },
    });
    console.log(`Updated loan search text: ${loan.$id}`);
  }
}

async function backfillLoanPaymentTotals(lenderId) {
  const [loans, payments] = await Promise.all([
    databases.listDocuments({
      databaseId: config.databaseId,
      collectionId: config.collections.loans,
      queries: [
        Query.equal("lender_id", lenderId),
        Query.limit(5000),
        Query.select(["$id", "amount", "total_paid", "remaining_amount"]),
      ],
    }),
    databases.listDocuments({
      databaseId: config.databaseId,
      collectionId: config.collections.payments,
      queries: [
        Query.equal("lender_id", lenderId),
        Query.limit(5000),
        Query.select(["loan_id", "amount"]),
      ],
    }),
  ]);
  const totalsByLoanId = new Map();

  for (const payment of payments.documents) {
    const loanId = String(payment.loan_id ?? "");
    const currentTotal = totalsByLoanId.get(loanId) ?? 0;

    totalsByLoanId.set(loanId, currentTotal + Number(payment.amount ?? 0));
  }

  for (const loan of loans.documents) {
    const totalPaid = totalsByLoanId.get(loan.$id) ?? 0;
    const remainingAmount = Math.max(Number(loan.amount ?? 0) - totalPaid, 0);

    if (
      Number(loan.total_paid ?? 0) === totalPaid &&
      Number(loan.remaining_amount ?? 0) === remainingAmount
    ) {
      continue;
    }

    await databases.updateDocument({
      databaseId: config.databaseId,
      collectionId: config.collections.loans,
      documentId: loan.$id,
      data: {
        total_paid: totalPaid,
        remaining_amount: remainingAmount,
      },
    });
    console.log(`Updated loan payment totals: ${loan.$id}`);
  }
}

function createLoanSearchText({ borrowerName, borrowerContact, borrowerAddress }) {
  return createBorrowerSearchText({ borrowerName, borrowerContact, borrowerAddress });
}

function createBorrowerSearchText({
  borrowerName,
  borrowerContact,
  borrowerAddress,
}) {
  const baseText = [borrowerName, borrowerContact, borrowerAddress].join(" ");
  const normalizedWords = normalizeSearchText(baseText).split(" ").filter(Boolean);
  const digitWords = baseText.match(/\d+/g) ?? [];
  const tokens = new Set(normalizedWords);

  for (const word of [...normalizedWords, ...digitWords]) {
    for (const fragment of searchFragments(word)) {
      tokens.add(fragment);
    }
  }

  return Array.from(tokens).join(" ").slice(0, 2000);
}

function normalizeSearchText(value) {
  return value.toLowerCase().replaceAll(/[^a-z0-9]+/g, " ").trim();
}

function searchFragments(value) {
  const normalized = normalizeSearchText(value).replaceAll(" ", "");
  const fragments = new Set();
  const maxLength = Math.min(12, normalized.length);

  for (let length = 3; length <= maxLength; length += 1) {
    for (let index = 0; index <= normalized.length - length; index += 1) {
      fragments.add(normalized.slice(index, index + length));
    }
  }

  return fragments;
}


function isMissing(error) {
  return error?.code === 404;
}

function parseBorrowerContactInfo(value) {
  if (!value) {
    return { contact: "", address: "" };
  }

  try {
    const parsed = JSON.parse(value);
    return {
      contact: String(parsed.phone ?? ""),
      address: String(parsed.address ?? ""),
    };
  } catch {
    return { contact: value, address: "" };
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function requireEnv(name) {
  const value = env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function loadEnv(files) {
  const values = {};

  for (const file of files) {
    try {
      const content = readFileSync(file, "utf8");
      for (const line of content.split(/\r?\n/)) {
        const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
        if (!match) {
          continue;
        }

        const [, key, rawValue] = match;
        values[key] = rawValue.replace(/^["']|["']$/g, "");
      }
    } catch {
      // Missing env files are fine during setup.
    }
  }

  return values;
}
