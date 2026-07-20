import { Client, Databases, Query } from "node-appwrite";
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
  },
};

if (!config.apiKey) {
  throw new Error("APPWRITE_SETUP_API_KEY is required for setup.");
}

const client = new Client()
  .setEndpoint(config.endpoint)
  .setProject(config.projectId)
  .setKey(config.apiKey);

const databases = new Databases(client);

const collectionPermissions = [];
const schema = createAppwriteSchema(config.collections);

await main();

async function main() {
  console.log("Creating Appwrite database, collections, and attributes...");
  await ensureDatabase();

  for (const collection of schema) {
    await ensureCollection(collection);
    for (const attribute of collection.attributes) {
      await ensureAttribute(collection.id, attribute);
    }
  }

  await migrateBorrowerContactFields();

  console.log("Appwrite tables and attributes are ready.");
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
    const existing = await databases.getCollection({
      databaseId: config.databaseId,
      collectionId: collection.id,
    });

    const needsHardening =
      existing.$permissions.length > 0 ||
      existing.documentSecurity !== false ||
      existing.enabled !== true ||
      existing.name !== collection.name;

    if (needsHardening) {
      await databases.updateCollection({
        databaseId: config.databaseId,
        collectionId: collection.id,
        name: collection.name,
        permissions: collectionPermissions,
        documentSecurity: false,
        enabled: true,
        purge: true,
      });
      console.log(`Hardened collection permissions: ${collection.id}`);
    } else {
      console.log(`Collection permissions already hardened: ${collection.id}`);
    }
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

  if (attribute.type === "integer") {
    await databases.createIntegerAttribute({
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

function requireEnv(name) {
  const value = env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}
