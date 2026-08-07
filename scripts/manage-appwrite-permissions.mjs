import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Client, Databases } from "node-appwrite";
import { loadScriptEnv } from "./lib/load-env.mjs";

const mode = process.argv[2];

if (mode !== "--check" && mode !== "--apply") {
  throw new Error(
    "Choose exactly one mode: --check or --apply. No changes are made in check mode.",
  );
}

const env = loadScriptEnv();
const config = {
  endpoint: requireEnv("NEXT_PUBLIC_APPWRITE_ENDPOINT"),
  projectId: requireEnv("NEXT_PUBLIC_APPWRITE_PROJECT_ID"),
  apiKey: requireEnv("APPWRITE_SETUP_API_KEY"),
  databaseId: requireEnv("NEXT_PUBLIC_APPWRITE_DATABASE_ID"),
  collectionIds: [
    requireEnv("NEXT_PUBLIC_APPWRITE_LENDERS_COLLECTION_ID"),
    requireEnv("NEXT_PUBLIC_APPWRITE_BORROWERS_COLLECTION_ID"),
    requireEnv("NEXT_PUBLIC_APPWRITE_COLLECTORS_COLLECTION_ID"),
    requireEnv("NEXT_PUBLIC_APPWRITE_LOANS_COLLECTION_ID"),
    requireEnv("NEXT_PUBLIC_APPWRITE_PAYMENTS_COLLECTION_ID"),
    env.APPWRITE_AUTH_RATE_LIMITS_COLLECTION_ID || "auth_rate_limits",
    env.APPWRITE_SECURITY_EVENTS_COLLECTION_ID || "security_events",
  ],
};

const client = new Client()
  .setEndpoint(config.endpoint)
  .setProject(config.projectId)
  .setKey(config.apiKey);
const databases = new Databases(client);

const before = await getCollectionMetadata();

if (mode === "--check") {
  printMetadata(before);

  if (before.some((collection) => !collection.compliant)) {
    process.exitCode = 1;
    console.error(
      "One or more collections allow direct client access. Run npm run appwrite:permissions:apply with the local setup key to harden them.",
    );
  } else {
    console.log("All Appwrite collections deny direct client database access.");
  }
} else {
  const backupPath = saveBackup(before);
  console.log(`Saved previous permission metadata to ${backupPath}`);

  for (const collection of before) {
    if (collection.compliant) {
      continue;
    }

    await databases.updateCollection({
      databaseId: config.databaseId,
      collectionId: collection.id,
      name: collection.name,
      permissions: [],
      documentSecurity: false,
      enabled: true,
      purge: true,
    });
  }

  const after = await getCollectionMetadata();
  printMetadata(after);

  const failed = after.filter((collection) => !collection.compliant);
  if (failed.length > 0) {
    throw new Error(
      `Permission verification failed for: ${failed.map((item) => item.id).join(", ")}`,
    );
  }

  console.log("Appwrite collection permissions were hardened and verified.");
}

async function getCollectionMetadata() {
  return Promise.all(
    config.collectionIds.map(async (collectionId) => {
      const collection = await databases.getCollection({
        databaseId: config.databaseId,
        collectionId,
      });

      const metadata = {
        id: collection.$id,
        name: collection.name,
        permissions: collection.$permissions,
        documentSecurity: collection.documentSecurity,
        enabled: collection.enabled,
      };

      return {
        ...metadata,
        compliant: isCompliant(metadata),
      };
    }),
  );
}

function isCompliant(collection) {
  return (
    collection.permissions.length === 0 &&
    collection.documentSecurity === false &&
    collection.enabled === true
  );
}

function printMetadata(collections) {
  console.table(
    collections.map((collection) => ({
      collectionId: collection.id,
      permissions: JSON.stringify(collection.permissions),
      documentSecurity: collection.documentSecurity,
      enabled: collection.enabled,
      compliant: collection.compliant,
    })),
  );
}

function saveBackup(collections) {
  const directory = join(process.cwd(), ".security-backups");
  mkdirSync(directory, { recursive: true, mode: 0o700 });

  const timestamp = new Date().toISOString().replaceAll(":", "-");
  const path = join(directory, `appwrite-permissions-${timestamp}.json`);
  writeFileSync(
    path,
    `${JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        endpoint: config.endpoint,
        projectId: config.projectId,
        databaseId: config.databaseId,
        collections: collections.map((collection) => ({
          id: collection.id,
          name: collection.name,
          permissions: collection.permissions,
          documentSecurity: collection.documentSecurity,
          enabled: collection.enabled,
        })),
      },
      null,
      2,
    )}\n`,
    { encoding: "utf8", mode: 0o600 },
  );

  return path;
}

function requireEnv(name) {
  const value = env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}
