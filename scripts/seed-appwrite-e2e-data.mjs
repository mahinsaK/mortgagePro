import { randomBytes, scryptSync } from "node:crypto";
import { createE2EContext, e2eIds } from "./lib/e2e-appwrite.mjs";

const { config, databases, env, users } = createE2EContext();
const credentials = {
  alphaEmail: requireEnv("E2E_LENDER_EMAIL"),
  alphaPassword: requireEnv("E2E_LENDER_PASSWORD"),
  betaEmail: requireEnv("E2E_SECOND_LENDER_EMAIL"),
  betaPassword: requireEnv("E2E_SECOND_LENDER_PASSWORD"),
  pendingEmail: requireEnv("E2E_PENDING_LENDER_EMAIL"),
  pendingPassword: requireEnv("E2E_PENDING_LENDER_PASSWORD"),
  collectorPassword: requireEnv("E2E_COLLECTOR_PASSWORD"),
};

await seed();
console.log("Dedicated E2E records are ready. No credentials were printed.");

async function seed() {
  const now = new Date().toISOString();
  const yesterday = new Date(Date.now() - 86_400_000).toISOString();
  const nextMonth = new Date(Date.now() + 30 * 86_400_000).toISOString();

  await Promise.all([
    upsertUser(
      e2eIds.users[0],
      credentials.alphaEmail,
      credentials.alphaPassword,
      "E2E Alpha Lending",
    ),
    upsertUser(
      e2eIds.users[1],
      credentials.betaEmail,
      credentials.betaPassword,
      "E2E Beta Lending",
    ),
    upsertUser(
      e2eIds.users[2],
      credentials.pendingEmail,
      credentials.pendingPassword,
      "E2E Pending Lending",
    ),
  ]);

  await upsert(config.collections.lenders, e2eIds.lenders[0], {
    appwrite_user_id: e2eIds.users[0],
    company_name: "E2E Alpha Lending",
    email: credentials.alphaEmail,
    contact_info: JSON.stringify({ phone: "+94770000001", address: "Test Alpha" }),
    status: "active",
    currency: "LKR",
    created_at: now,
  });
  await upsert(config.collections.lenders, e2eIds.lenders[1], {
    appwrite_user_id: e2eIds.users[1],
    company_name: "E2E Beta Lending",
    email: credentials.betaEmail,
    contact_info: JSON.stringify({ phone: "+94770000002", address: "Test Beta" }),
    status: "active",
    currency: "LKR",
    created_at: now,
  });
  await upsert(config.collections.lenders, e2eIds.lenders[2], {
    appwrite_user_id: e2eIds.users[2],
    company_name: "E2E Pending Lending",
    email: credentials.pendingEmail,
    contact_info: "{}",
    status: "inactive",
    currency: "LKR",
    created_at: now,
  });

  await upsert(config.collections.borrowers, e2eIds.borrowers[0], {
    lender_id: e2eIds.lenders[0],
    name: "E2E Alpha Borrower",
    business_name: "Alpha Test Store",
    contact: "+94771111111",
    address: "Alpha test address",
    search_text: "e2e alpha borrower test store 94771111111",
    status: "active",
    created_at: now,
  });
  await upsert(config.collections.borrowers, e2eIds.borrowers[1], {
    lender_id: e2eIds.lenders[1],
    name: "E2E Beta Borrower",
    business_name: "Beta Test Store",
    contact: "+94772222222",
    address: "Beta test address",
    search_text: "e2e beta borrower test store 94772222222",
    status: "active",
    created_at: now,
  });

  await upsert(config.collections.collectors, e2eIds.collectors[0], {
    lender_id: e2eIds.lenders[0],
    name: "E2E Alpha Collector",
    contact_info: JSON.stringify({ phone: "+94773333333", area: "Alpha" }),
    password_hash: hashPassword(credentials.collectorPassword),
    status: "active",
    created_at: now,
  });
  await upsert(config.collections.collectors, e2eIds.collectors[1], {
    lender_id: e2eIds.lenders[1],
    name: "E2E Beta Collector",
    contact_info: JSON.stringify({ phone: "+94774444444", area: "Beta" }),
    password_hash: hashPassword(credentials.collectorPassword),
    status: "active",
    created_at: now,
  });

  await upsert(config.collections.loans, e2eIds.loans[0], {
    lender_id: e2eIds.lenders[0],
    borrower_id: e2eIds.borrowers[0],
    amount: 100000,
    interest_rate: 10,
    daily_payment: 5000,
    total_paid: 5000,
    remaining_amount: 95000,
    start_date: yesterday,
    end_date: nextMonth,
    status: "active",
    qr_code: e2eIds.loans[0],
    search_text: "e2e alpha borrower 94771111111",
    created_at: now,
  });
  await upsert(config.collections.loans, e2eIds.loans[1], {
    lender_id: e2eIds.lenders[1],
    borrower_id: e2eIds.borrowers[1],
    amount: 200000,
    interest_rate: 12,
    daily_payment: 7500,
    total_paid: 0,
    remaining_amount: 200000,
    start_date: yesterday,
    end_date: nextMonth,
    status: "active",
    qr_code: e2eIds.loans[1],
    search_text: "e2e beta borrower 94772222222",
    created_at: now,
  });
  await upsert(config.collections.payments, e2eIds.payments[0], {
    lender_id: e2eIds.lenders[0],
    loan_id: e2eIds.loans[0],
    collector_id: e2eIds.collectors[0],
    date: now,
    amount: 5000,
    method: "cash",
    created_at: now,
  });

  await upsert(config.collections.smsAccounts, e2eIds.smsAccounts[0], {
    lender_id: e2eIds.lenders[0],
    status: "active",
    monthly_quota: 0,
    created_at: now,
    updated_at: now,
  });
  await upsert(config.collections.smsAccounts, e2eIds.smsAccounts[1], {
    lender_id: e2eIds.lenders[1],
    status: "active",
    monthly_quota: 0,
    created_at: now,
    updated_at: now,
  });
  await upsert(
    config.collections.smsSenderRequests,
    e2eIds.smsSenderRequests[0],
    {
      lender_id: e2eIds.lenders[0],
      sender_id: "E2EAlpha",
      normalized_sender_id: "e2ealpha",
      status: "pending",
      rejection_reason: "",
      requested_at: now,
    },
  );
  await upsert(
    config.collections.smsSenderRequests,
    e2eIds.smsSenderRequests[1],
    {
      lender_id: e2eIds.lenders[1],
      sender_id: "E2EBeta",
      normalized_sender_id: "e2ebeta",
      status: "pending",
      rejection_reason: "",
      requested_at: now,
    },
  );
  await upsert(config.collections.smsTemplates, e2eIds.smsTemplates[0], {
    lender_id: e2eIds.lenders[0],
    name: "E2E Alpha reminder",
    normalized_name: "e2e alpha reminder",
    message: "E2E Alpha payment reminder.",
    created_at: now,
    updated_at: now,
  });
  await upsert(config.collections.smsTemplates, e2eIds.smsTemplates[1], {
    lender_id: e2eIds.lenders[1],
    name: "E2E Beta reminder",
    normalized_name: "e2e beta reminder",
    message: "E2E Beta payment reminder.",
    created_at: now,
    updated_at: now,
  });
}

async function upsertUser(userId, email, password, name) {
  try {
    await users.create({ userId, email, password, name });
  } catch (error) {
    if (error?.code !== 409) {
      throw error;
    }
    await users.updateEmail({ userId, email });
    await users.updatePassword({ userId, password });
    await users.updateName({ userId, name });
  }
}

async function upsert(collectionId, documentId, data) {
  try {
    await databases.createDocument({
      databaseId: config.databaseId,
      collectionId,
      documentId,
      data,
    });
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
  }
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function requireEnv(name) {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for dedicated E2E seeding.`);
  }
  return value;
}
