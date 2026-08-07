import { randomBytes } from "node:crypto";
import { Account, Client, Databases, Users } from "node-appwrite";
import { loadScriptEnv } from "./lib/load-env.mjs";

const env = loadScriptEnv();
const config = {
  endpoint: requireEnv("NEXT_PUBLIC_APPWRITE_ENDPOINT"),
  projectId: requireEnv("NEXT_PUBLIC_APPWRITE_PROJECT_ID"),
  databaseId: requireEnv("NEXT_PUBLIC_APPWRITE_DATABASE_ID"),
  runtimeKey: requireEnv("APPWRITE_RUNTIME_API_KEY"),
  setupKey: requireEnv("APPWRITE_SETUP_API_KEY"),
  collections: {
    lenders: requireEnv("NEXT_PUBLIC_APPWRITE_LENDERS_COLLECTION_ID"),
    borrowers: requireEnv("NEXT_PUBLIC_APPWRITE_BORROWERS_COLLECTION_ID"),
    collectors: requireEnv("NEXT_PUBLIC_APPWRITE_COLLECTORS_COLLECTION_ID"),
    loans: requireEnv("NEXT_PUBLIC_APPWRITE_LOANS_COLLECTION_ID"),
    payments: requireEnv("NEXT_PUBLIC_APPWRITE_PAYMENTS_COLLECTION_ID"),
    authRateLimits:
      env.APPWRITE_AUTH_RATE_LIMITS_COLLECTION_ID || "auth_rate_limits",
    securityEvents:
      env.APPWRITE_SECURITY_EVENTS_COLLECTION_ID || "security_events",
  },
};

const setupDatabases = createDatabasesWithKey(config.setupKey);
const runtimeDatabases = createDatabasesWithKey(config.runtimeKey);
const setupUsers = createUsersWithKey(config.setupKey);
const loginClient = new Client()
  .setEndpoint(config.endpoint)
  .setProject(config.projectId)
  .setKey(config.runtimeKey);
const loginAccount = new Account(loginClient);
let sessionAccount;
let guardProbe;
let runtimeProbe;
let directCreateProbe;
let testUserId;

try {
  const suffix = randomBytes(6).toString("hex");
  testUserId = id(`isolation_user_${suffix}`);
  const email = `isolation-${suffix}@mortgagepro.local`;
  const password = `${randomBytes(24).toString("base64url")}Aa1!`;

  await setupUsers.create({
    userId: testUserId,
    email,
    password,
    name: "Isolation verifier",
  });

  const session = await loginAccount.createEmailPasswordSession({
    email,
    password,
  });

  if (!session.secret) {
    throw new Error("The Appwrite test session did not return a session secret.");
  }

  const sessionClient = new Client()
    .setEndpoint(config.endpoint)
    .setProject(config.projectId)
    .setSession(session.secret);
  const sessionDatabases = new Databases(sessionClient);
  sessionAccount = new Account(sessionClient);
  guardProbe = makeProbe(`guard_${suffix}`, session.userId);
  runtimeProbe = makeProbe(`runtime_${suffix}`, session.userId);
  directCreateProbe = makeProbe(`direct_${suffix}`, session.userId);

  await createProbeSet(setupDatabases, guardProbe);
  console.log("Created isolated throwaway records with the local setup key.");

  for (const collection of collectionNames()) {
    await expectDenied(`${collection}:list`, () =>
      sessionDatabases.listDocuments({
        databaseId: config.databaseId,
        collectionId: config.collections[collection],
      }),
    );
    await expectDenied(`${collection}:create`, () =>
      sessionDatabases.createDocument({
        databaseId: config.databaseId,
        collectionId: config.collections[collection],
        documentId: directCreateProbe[collection].id,
        data: directCreateProbe[collection].data,
      }),
    );
    await expectDenied(`${collection}:update`, () =>
      sessionDatabases.updateDocument({
        databaseId: config.databaseId,
        collectionId: config.collections[collection],
        documentId: guardProbe[collection].id,
        data: harmlessUpdate(collection),
      }),
    );
    await expectDenied(`${collection}:delete`, () =>
      sessionDatabases.deleteDocument({
        databaseId: config.databaseId,
        collectionId: config.collections[collection],
        documentId: guardProbe[collection].id,
      }),
    );
  }

  await createProbeSet(runtimeDatabases, runtimeProbe);
  for (const collection of collectionNames()) {
    await runtimeDatabases.updateDocument({
      databaseId: config.databaseId,
      collectionId: config.collections[collection],
      documentId: runtimeProbe[collection].id,
      data: harmlessUpdate(collection),
    });
    console.log(`PASS runtime:${collection}:create-update`);
  }
  await deleteProbeSet(runtimeDatabases, runtimeProbe);
  runtimeProbe = undefined;
  console.log("PASS runtime key document CRUD smoke test");
  console.log("Appwrite direct-client isolation verification passed.");
} finally {
  await deleteProbeSet(setupDatabases, directCreateProbe);
  await deleteProbeSet(setupDatabases, runtimeProbe);
  await deleteProbeSet(setupDatabases, guardProbe);

  if (sessionAccount) {
    try {
      await sessionAccount.deleteSession({ sessionId: "current" });
    } catch {
      // The verification result is more important than logout cleanup errors.
    }
  }

  if (testUserId) {
    try {
      await setupUsers.delete({ userId: testUserId });
    } catch {
      console.error("Cleanup warning for the temporary isolation user.");
    }
  }
}

function createDatabasesWithKey(key) {
  const client = new Client()
    .setEndpoint(config.endpoint)
    .setProject(config.projectId)
    .setKey(key);
  return new Databases(client);
}

function createUsersWithKey(key) {
  const client = new Client()
    .setEndpoint(config.endpoint)
    .setProject(config.projectId)
    .setKey(key);
  return new Users(client);
}

function collectionNames() {
  return [
    "lenders",
    "borrowers",
    "collectors",
    "loans",
    "payments",
    "authRateLimits",
    "securityEvents",
  ];
}

function makeProbe(prefix, appwriteUserId) {
  const now = new Date().toISOString();
  const lenderId = id(`${prefix}_l`);
  const borrowerId = id(`${prefix}_b`);
  const collectorId = id(`${prefix}_c`);
  const loanId = id(`${prefix}_n`);
  const paymentId = id(`${prefix}_p`);

  return {
    lenders: {
      id: lenderId,
      data: {
        appwrite_user_id: appwriteUserId,
        company_name: "Isolation probe",
        email: `${prefix}@example.invalid`,
        contact_info: "",
        status: "active",
        currency: "USD",
        created_at: now,
      },
    },
    borrowers: {
      id: borrowerId,
      data: {
        lender_id: lenderId,
        name: "Isolation borrower",
        business_name: "",
        contact: "",
        address: "",
        search_text: "isolation borrower",
        status: "active",
        created_at: now,
      },
    },
    collectors: {
      id: collectorId,
      data: {
        lender_id: lenderId,
        name: "Isolation collector",
        contact_info: "",
        password_hash: "probe:probe",
        session_version: 1,
        status: "active",
        created_at: now,
      },
    },
    loans: {
      id: loanId,
      data: {
        lender_id: lenderId,
        borrower_id: borrowerId,
        amount: 100,
        interest_rate: 1,
        daily_payment: 10,
        total_paid: 0,
        remaining_amount: 100,
        start_date: now,
        end_date: new Date(Date.now() + 86_400_000).toISOString(),
        status: "active",
        qr_code: loanId,
        search_text: "isolation borrower",
        created_at: now,
      },
    },
    payments: {
      id: paymentId,
      data: {
        lender_id: lenderId,
        loan_id: loanId,
        collector_id: collectorId,
        date: now,
        amount: 10,
        method: "cash",
        created_at: now,
      },
    },
    authRateLimits: {
      id: id(`${prefix}_r`),
      data: {
        scope: "isolation_probe",
        subject_hash: "a".repeat(64),
        attempt_count: 1,
        window_started_at: now,
        blocked_until: new Date(Date.now() + 60_000).toISOString(),
        updated_at: now,
      },
    },
    securityEvents: {
      id: id(`${prefix}_s`),
      data: {
        event_type: "isolation_probe",
        outcome: "success",
        principal_type: "system",
        principal_hash: "b".repeat(64),
        ip_hash: "c".repeat(64),
        request_id: id(`${prefix}_request`),
        reason_code: "isolation_probe",
        metadata: "{}",
        created_at: now,
      },
    },
  };
}

async function createProbeSet(databases, probe) {
  if (!probe) {
    return;
  }

  for (const collection of collectionNames()) {
    await databases.createDocument({
      databaseId: config.databaseId,
      collectionId: config.collections[collection],
      documentId: probe[collection].id,
      data: probe[collection].data,
    });
  }
}

async function deleteProbeSet(databases, probe) {
  if (!probe) {
    return;
  }

  for (const collection of [...collectionNames()].reverse()) {
    try {
      await databases.deleteDocument({
        databaseId: config.databaseId,
        collectionId: config.collections[collection],
        documentId: probe[collection].id,
      });
    } catch (error) {
      if (error?.code !== 404) {
        console.error(`Cleanup warning for collection ${collection}.`);
      }
    }
  }
}

async function expectDenied(label, operation) {
  try {
    await operation();
  } catch (error) {
    if (error?.code === 401 || error?.code === 403) {
      console.log(`PASS denied:${label}`);
      return;
    }

    throw new Error(`${label} returned unexpected status ${error?.code ?? "unknown"}.`);
  }

  throw new Error(`${label} unexpectedly succeeded for a normal Appwrite session.`);
}

function harmlessUpdate(collection) {
  if (collection === "lenders") {
    return { company_name: "Isolation probe" };
  }

  if (collection === "borrowers" || collection === "collectors") {
    return { name: `Isolation ${collection}` };
  }

  if (collection === "loans") {
    return { status: "active" };
  }

  if (collection === "authRateLimits") {
    return { attempt_count: 2 };
  }

  if (collection === "securityEvents") {
    return { outcome: "success" };
  }

  return { method: "cash" };
}

function id(value) {
  return value.replaceAll(/[^A-Za-z0-9._-]/g, "_").slice(0, 36);
}

function requireEnv(name) {
  const value = env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}
