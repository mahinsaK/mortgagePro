import { Client, Databases, Query } from "node-appwrite";
import { loadScriptEnv } from "./lib/load-env.mjs";

const env = loadScriptEnv();
const config = {
  endpoint: requireEnv("NEXT_PUBLIC_APPWRITE_ENDPOINT"),
  projectId: requireEnv("NEXT_PUBLIC_APPWRITE_PROJECT_ID"),
  apiKey: requireEnv("APPWRITE_SETUP_API_KEY"),
  databaseId: requireEnv("NEXT_PUBLIC_APPWRITE_DATABASE_ID"),
  rateLimitsCollectionId:
    env.APPWRITE_AUTH_RATE_LIMITS_COLLECTION_ID || "auth_rate_limits",
  securityEventsCollectionId:
    env.APPWRITE_SECURITY_EVENTS_COLLECTION_ID || "security_events",
};
const databases = new Databases(
  new Client()
    .setEndpoint(config.endpoint)
    .setProject(config.projectId)
    .setKey(config.apiKey),
);
const rateLimitCutoff = new Date(Date.now() - 7 * 86_400_000).toISOString();
const eventCutoff = new Date(Date.now() - 90 * 86_400_000).toISOString();
const deletedRateLimits = await deleteOlderThan(
  config.rateLimitsCollectionId,
  "updated_at",
  rateLimitCutoff,
);
const deletedEvents = await deleteOlderThan(
  config.securityEventsCollectionId,
  "created_at",
  eventCutoff,
);

console.log(`Deleted stale rate-limit records: ${deletedRateLimits}`);
console.log(`Deleted expired security events: ${deletedEvents}`);

async function deleteOlderThan(collectionId, attribute, cutoff) {
  let deleted = 0;

  while (true) {
    const documents = await databases.listDocuments({
      databaseId: config.databaseId,
      collectionId,
      queries: [
        Query.lessThan(attribute, cutoff),
        Query.limit(100),
        Query.select(["$id"]),
      ],
    });

    if (documents.documents.length === 0) {
      return deleted;
    }

    for (const document of documents.documents) {
      await databases.deleteDocument({
        databaseId: config.databaseId,
        collectionId,
        documentId: document.$id,
      });
      deleted += 1;
    }
  }
}

function requireEnv(name) {
  const value = env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}
