import { readFileSync } from "node:fs";
import { Client, Databases, Query } from "node-appwrite";

const env = { ...loadEnv([".env.local", ".env.example"]), ...process.env };
const config = {
  endpoint: requireEnv("NEXT_PUBLIC_APPWRITE_ENDPOINT"),
  projectId: requireEnv("NEXT_PUBLIC_APPWRITE_PROJECT_ID"),
  apiKey: requireEnv("APPWRITE_SETUP_API_KEY"),
  databaseId: requireEnv("NEXT_PUBLIC_APPWRITE_DATABASE_ID"),
  collectorsId: requireEnv("NEXT_PUBLIC_APPWRITE_COLLECTORS_COLLECTION_ID"),
};
const client = new Client()
  .setEndpoint(config.endpoint)
  .setProject(config.projectId)
  .setKey(config.apiKey);
const databases = new Databases(client);

await ensureSessionVersionAttribute();
await backfillSessionVersions();
console.log("Collector session-version schema is ready.");

async function ensureSessionVersionAttribute() {
  try {
    const attribute = await databases.getAttribute({
      databaseId: config.databaseId,
      collectionId: config.collectorsId,
      key: "session_version",
    });

    if (attribute.type !== "integer") {
      throw new Error("collectors.session_version exists but is not an integer.");
    }
  } catch (error) {
    if (error?.code !== 404) {
      throw error;
    }

    await databases.createIntegerAttribute({
      databaseId: config.databaseId,
      collectionId: config.collectorsId,
      key: "session_version",
      required: false,
      min: 1,
      xdefault: 1,
    });
    console.log("Created collectors.session_version.");
  }

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const attribute = await databases.getAttribute({
      databaseId: config.databaseId,
      collectionId: config.collectorsId,
      key: "session_version",
    });

    if (attribute.status === "available") {
      return;
    }

    if (attribute.status === "failed") {
      throw new Error("collectors.session_version creation failed.");
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error("Timed out waiting for collectors.session_version.");
}

async function backfillSessionVersions() {
  const collectors = await databases.listDocuments({
    databaseId: config.databaseId,
    collectionId: config.collectorsId,
    queries: [
      Query.limit(5000),
      Query.select(["$id", "session_version"]),
    ],
  });
  let updated = 0;

  for (const collector of collectors.documents) {
    const version = Number(collector.session_version);
    if (Number.isInteger(version) && version >= 1) {
      continue;
    }

    await databases.updateDocument({
      databaseId: config.databaseId,
      collectionId: config.collectorsId,
      documentId: collector.$id,
      data: { session_version: 1 },
    });
    updated += 1;
  }

  console.log(`Verified ${collectors.total} collectors; backfilled ${updated}.`);
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
      // Missing local environment files are fine.
    }
  }

  return values;
}
