import { Client, Databases } from "node-appwrite";
import { createAppwriteSchema } from "./appwrite-schema-definition.mjs";
import { loadScriptEnv } from "./lib/load-env.mjs";

const env = loadScriptEnv();

const config = {
  endpoint: requireEnv("NEXT_PUBLIC_APPWRITE_ENDPOINT"),
  projectId: requireEnv("NEXT_PUBLIC_APPWRITE_PROJECT_ID"),
  apiKey: env.APPWRITE_SETUP_API_KEY || "",
  databaseId: requireEnv("NEXT_PUBLIC_APPWRITE_DATABASE_ID"),
  collections: {
    lenders: requireEnv("NEXT_PUBLIC_APPWRITE_LENDERS_COLLECTION_ID"),
    borrowers: requireEnv("NEXT_PUBLIC_APPWRITE_BORROWERS_COLLECTION_ID"),
    collectors: requireEnv("NEXT_PUBLIC_APPWRITE_COLLECTORS_COLLECTION_ID"),
    loans: requireEnv("NEXT_PUBLIC_APPWRITE_LOANS_COLLECTION_ID"),
    payments: requireEnv("NEXT_PUBLIC_APPWRITE_PAYMENTS_COLLECTION_ID"),
    authRateLimits: requireEnv("APPWRITE_AUTH_RATE_LIMITS_COLLECTION_ID"),
    securityEvents: requireEnv("APPWRITE_SECURITY_EVENTS_COLLECTION_ID"),
    smsAccounts: requireEnv("APPWRITE_SMS_ACCOUNTS_COLLECTION_ID"),
    smsSenderRequests: requireEnv("APPWRITE_SMS_SENDER_REQUESTS_COLLECTION_ID"),
    smsTemplates: requireEnv("APPWRITE_SMS_TEMPLATES_COLLECTION_ID"),
    smsMonthlyUsage: requireEnv("APPWRITE_SMS_MONTHLY_USAGE_COLLECTION_ID"),
    smsSendLogs: requireEnv("APPWRITE_SMS_SEND_LOGS_COLLECTION_ID"),
  },
};

if (!config.apiKey) {
  throw new Error("APPWRITE_SETUP_API_KEY is required for index creation.");
}

const client = new Client()
  .setEndpoint(config.endpoint)
  .setProject(config.projectId)
  .setKey(config.apiKey);

const databases = new Databases(client);
const schema = createAppwriteSchema(config.collections);

await main();

async function main() {
  console.log("Creating Appwrite indexes...");

  for (const collection of schema) {
    await waitForAttributes(
      collection.id,
      collection.attributes.map((attribute) => attribute.key),
    );

    for (const index of collection.indexes) {
      await ensureIndex(collection.id, index);
    }
  }

  console.log("Appwrite indexes are ready.");
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

      if (attempt === 29) {
        throw new Error(`Timed out waiting for attribute: ${collectionId}.${key}`);
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
    console.log(`Index exists: ${collectionId}.${index.key}`);
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

function isMissing(error) {
  return error?.code === 404;
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
