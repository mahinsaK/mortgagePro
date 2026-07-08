import { randomBytes, scryptSync } from "node:crypto";
import { readFileSync } from "node:fs";
import { Client, Databases, Query, Users } from "node-appwrite";

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
  throw new Error("APPWRITE_API_KEY or API_KEY is required for seeding.");
}

const client = new Client()
  .setEndpoint(config.endpoint)
  .setProject(config.projectId)
  .setKey(config.apiKey);

const databases = new Databases(client);
const users = new Users(client);

const demoLenders = [
  {
    id: "seed_lender_northstar",
    userId: "seed_user_northstar",
    companyName: "Northstar Home Lending",
    email: "demo.northstar@mortgagepro.local",
    password: "DemoPassword123!",
    phone: "+94 77 100 0100",
    address: "100 Market Street, Colombo 03",
    currency: "LKR",
    collectors: [
      {
        id: "seed_collector_jordan",
        name: "Jordan Lee",
        phone: "+94 77 100 0102",
        area: "Colombo North",
        password: "CollectorPass123!",
      },
      {
        id: "seed_collector_maya",
        name: "Maya Fernando",
        phone: "+94 77 100 0103",
        area: "Colombo Central",
        password: "MayaCollect123!",
      },
    ],
    borrowers: [
      {
        id: "seed_borrower_avery",
        name: "Avery Johnson",
        businessName: "Johnson Market",
        contact: "+94 77 123 0101",
        address: "22 Cedar Road, Colombo 05",
        loans: [
          {
            id: "seed_loan_avery_001",
            amount: 500000,
            interestRate: 12.5,
            dailyPayment: 10000,
            startDate: "2026-07-06T00:00:00.000Z",
            endDate: "2026-08-15T00:00:00.000Z",
            payments: [
              {
                id: "seed_payment_avery_001",
                collectorId: "seed_collector_jordan",
                amount: 10000,
                date: "2026-07-07T09:30:00.000Z",
                method: "cash",
              },
              {
                id: "seed_payment_avery_002",
                collectorId: "seed_collector_maya",
                amount: 10000,
                date: "2026-07-08T09:45:00.000Z",
                method: "cash",
              },
            ],
          },
        ],
      },
      {
        id: "seed_borrower_sonia",
        name: "Sonia Perera",
        businessName: "Perera Textiles",
        contact: "+94 71 234 0102",
        address: "14 Temple Road, Kandy",
        loans: [
          {
            id: "seed_loan_sonia_001",
            amount: 350000,
            interestRate: 10,
            dailyPayment: 7500,
            startDate: "2026-07-01T00:00:00.000Z",
            endDate: "2026-08-20T00:00:00.000Z",
            payments: [
              {
                id: "seed_payment_sonia_001",
                collectorId: "seed_collector_maya",
                amount: 7500,
                date: "2026-07-08T10:20:00.000Z",
                method: "cash",
              },
            ],
          },
        ],
      },
      {
        id: "seed_borrower_ruwan",
        name: "Ruwan Silva",
        businessName: "Silva Auto Parts",
        contact: "+94 76 345 0103",
        address: "8 Galle Road, Dehiwala",
        loans: [
          {
            id: "seed_loan_ruwan_001",
            amount: 750000,
            interestRate: 14,
            dailyPayment: 15000,
            startDate: "2026-06-25T00:00:00.000Z",
            endDate: "2026-08-25T00:00:00.000Z",
            payments: [
              {
                id: "seed_payment_ruwan_001",
                collectorId: "seed_collector_jordan",
                amount: 15000,
                date: "2026-07-07T13:15:00.000Z",
                method: "transfer",
              },
              {
                id: "seed_payment_ruwan_002",
                collectorId: "seed_collector_jordan",
                amount: 15000,
                date: "2026-07-08T13:10:00.000Z",
                method: "cash",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "seed_lender_rivercity",
    userId: "seed_user_rivercity",
    companyName: "River City Capital",
    email: "demo.rivercity@mortgagepro.local",
    password: "RiverDemo123!",
    phone: "+94 77 200 0200",
    address: "41 Lake Drive, Kurunegala",
    currency: "LKR",
    collectors: [
      {
        id: "seed_collector_nina",
        name: "Nina Costa",
        phone: "+94 77 200 0202",
        area: "Kurunegala East",
        password: "NinaCollect123!",
      },
    ],
    borrowers: [
      {
        id: "seed_borrower_milan",
        name: "Milan Jayasinghe",
        businessName: "Milan Grocery",
        contact: "+94 75 456 0201",
        address: "5 Lake Drive, Kurunegala",
        loans: [
          {
            id: "seed_loan_milan_001",
            amount: 250000,
            interestRate: 11,
            dailyPayment: 5000,
            startDate: "2026-07-03T00:00:00.000Z",
            endDate: "2026-08-12T00:00:00.000Z",
            payments: [
              {
                id: "seed_payment_milan_001",
                collectorId: "seed_collector_nina",
                amount: 5000,
                date: "2026-07-08T08:40:00.000Z",
                method: "cash",
              },
            ],
          },
        ],
      },
    ],
  },
];

await main();

async function main() {
  console.log("Seeding demo Appwrite data...");
  await assertBorrowerSchema();

  for (const lender of demoLenders) {
    await seedLender(lender);
  }

  console.log("Demo seed complete.");
  console.log("Lender logins:");
  for (const lender of demoLenders) {
    console.log(`- ${lender.email} / ${lender.password}`);
  }
  console.log("Collector logins:");
  for (const lender of demoLenders) {
    for (const collector of lender.collectors) {
      console.log(
        `- ${collector.name} / ${collector.password} (${lender.companyName})`,
      );
    }
  }
}

async function seedLender(lender) {
  const now = new Date().toISOString();
  const user = await ensureUser({
    userId: lender.userId,
    email: lender.email,
    password: lender.password,
    name: lender.companyName,
  });

  await upsertDocument(config.collections.lenders, lender.id, {
    appwrite_user_id: user.$id,
    company_name: lender.companyName,
    email: lender.email,
    contact_info: JSON.stringify({
      phone: lender.phone,
      address: lender.address,
    }),
    status: "active",
    currency: lender.currency,
    created_at: now,
  });

  for (const collector of lender.collectors) {
    await upsertDocument(config.collections.collectors, collector.id, {
      lender_id: lender.id,
      name: collector.name,
      contact_info: JSON.stringify({
        phone: collector.phone,
        area: collector.area,
      }),
      password_hash: hashCollectorPassword(collector.password),
      status: "active",
      created_at: now,
    });
  }

  for (const borrower of lender.borrowers) {
    const searchText = createBorrowerSearchText({
      borrowerName: borrower.name,
      borrowerContact: borrower.contact,
      borrowerAddress: borrower.address,
    });

    await upsertDocument(config.collections.borrowers, borrower.id, {
      lender_id: lender.id,
      name: borrower.name,
      business_name: borrower.businessName,
      contact: borrower.contact,
      address: borrower.address,
      search_text: searchText,
      status: "active",
      created_at: now,
    });

    for (const loan of borrower.loans) {
      const totalPaid = loan.payments.reduce(
        (total, payment) => total + payment.amount,
        0,
      );
      const remainingAmount = Math.max(loan.amount - totalPaid, 0);

      await upsertDocument(config.collections.loans, loan.id, {
        lender_id: lender.id,
        borrower_id: borrower.id,
        amount: loan.amount,
        interest_rate: loan.interestRate,
        daily_payment: loan.dailyPayment,
        total_paid: totalPaid,
        remaining_amount: remainingAmount,
        start_date: loan.startDate,
        end_date: loan.endDate,
        status: remainingAmount <= 0 ? "completed" : "active",
        qr_code: loan.id,
        search_text: createLoanSearchText({
          borrowerName: borrower.name,
          borrowerContact: borrower.contact,
          borrowerAddress: borrower.address,
        }),
        created_at: now,
      });

      for (const payment of loan.payments) {
        await upsertDocument(config.collections.payments, payment.id, {
          lender_id: lender.id,
          loan_id: loan.id,
          collector_id: payment.collectorId,
          date: payment.date,
          amount: payment.amount,
          method: payment.method,
          created_at: payment.date,
        });
      }
    }
  }
}

async function ensureUser(user) {
  const existing = await users.list({
    queries: [Query.equal("email", user.email)],
    total: false,
  });
  const matchedUser = existing.users[0];

  if (!matchedUser) {
    const created = await users.create(user);
    console.log(`Created user: ${user.email}`);
    return created;
  }

  await users.updatePassword({
    userId: matchedUser.$id,
    password: user.password,
  });
  await users.updateName({
    userId: matchedUser.$id,
    name: user.name,
  });
  console.log(`Updated user credentials: ${user.email}`);
  return matchedUser;
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

async function assertBorrowerSchema() {
  const [contact, address, oldContactInfo] = await Promise.all([
    hasAttribute(config.collections.borrowers, "contact"),
    hasAttribute(config.collections.borrowers, "address"),
    hasAttribute(config.collections.borrowers, "contact_info"),
  ]);

  if (!contact || !address || oldContactInfo) {
    throw new Error(
      "Borrower schema is not ready. Run npm run appwrite:setup before seeding.",
    );
  }
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
    if (error?.code === 404) {
      return false;
    }

    throw error;
  }
}

function hashCollectorPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");

  return `${salt}:${hash}`;
}

function createLoanSearchText({ borrowerName, borrowerContact, borrowerAddress }) {
  return createBorrowerSearchText({
    borrowerName,
    borrowerContact,
    borrowerAddress,
  });
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
      // Missing env files are fine during seeding.
    }
  }

  return values;
}
