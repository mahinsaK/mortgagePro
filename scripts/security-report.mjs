import { Client, Databases, Query } from "node-appwrite";
import { loadScriptEnv } from "./lib/load-env.mjs";

const env = loadScriptEnv();
const hours = readHours(process.argv.slice(2));
const config = {
  endpoint: requireEnv("NEXT_PUBLIC_APPWRITE_ENDPOINT"),
  projectId: requireEnv("NEXT_PUBLIC_APPWRITE_PROJECT_ID"),
  apiKey: requireEnv("APPWRITE_SETUP_API_KEY"),
  databaseId: requireEnv("NEXT_PUBLIC_APPWRITE_DATABASE_ID"),
  collectionId:
    env.APPWRITE_SECURITY_EVENTS_COLLECTION_ID || "security_events",
};
const databases = new Databases(
  new Client()
    .setEndpoint(config.endpoint)
    .setProject(config.projectId)
    .setKey(config.apiKey),
);
const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
const events = await databases.listDocuments({
  databaseId: config.databaseId,
  collectionId: config.collectionId,
  queries: [
    Query.greaterThanEqual("created_at", since),
    Query.orderDesc("created_at"),
    Query.limit(5000),
    Query.select(["event_type", "outcome"]),
  ],
});
const counts = new Map();

for (const event of events.documents) {
  const key = `${event.event_type}:${event.outcome}`;
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

console.log(`Security event summary for the last ${hours} hour(s).`);
console.table(
  [...counts.entries()]
    .map(([key, count]) => {
      const [eventType, outcome] = key.split(":");
      return { eventType, outcome, count };
    })
    .sort((left, right) => right.count - left.count),
);
console.log(`Total events: ${events.total}`);

if (events.total > events.documents.length) {
  console.warn("The report is capped at the newest 5,000 events.");
}

function readHours(args) {
  const index = args.indexOf("--hours");
  const value = index >= 0 ? Number(args[index + 1]) : 24;

  if (!Number.isInteger(value) || value < 1 || value > 2160) {
    throw new Error("--hours must be an integer from 1 to 2160.");
  }

  return value;
}

function requireEnv(name) {
  const value = env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}
