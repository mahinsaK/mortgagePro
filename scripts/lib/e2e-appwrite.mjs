import { Client, Databases, Users } from "node-appwrite";
import { loadScriptEnv } from "./load-env.mjs";

export const E2E_MARKER = "MORTGAGEPRO_DEDICATED_TEST_PROJECT";

export function createE2EContext() {
  const env = loadScriptEnv();
  assertDedicatedTestProject(env);

  const config = {
    endpoint: requireEnv(env, "NEXT_PUBLIC_APPWRITE_ENDPOINT"),
    projectId: requireEnv(env, "NEXT_PUBLIC_APPWRITE_PROJECT_ID"),
    databaseId: requireEnv(env, "NEXT_PUBLIC_APPWRITE_DATABASE_ID"),
    apiKey: requireEnv(env, "APPWRITE_RUNTIME_API_KEY"),
    collections: {
      lenders: requireEnv(env, "NEXT_PUBLIC_APPWRITE_LENDERS_COLLECTION_ID"),
      borrowers: requireEnv(env, "NEXT_PUBLIC_APPWRITE_BORROWERS_COLLECTION_ID"),
      collectors: requireEnv(env, "NEXT_PUBLIC_APPWRITE_COLLECTORS_COLLECTION_ID"),
      loans: requireEnv(env, "NEXT_PUBLIC_APPWRITE_LOANS_COLLECTION_ID"),
      payments: requireEnv(env, "NEXT_PUBLIC_APPWRITE_PAYMENTS_COLLECTION_ID"),
    },
  };
  const client = new Client()
    .setEndpoint(config.endpoint)
    .setProject(config.projectId)
    .setKey(config.apiKey);

  return {
    config,
    databases: new Databases(client),
    env,
    users: new Users(client),
  };
}

export function assertDedicatedTestProject(env = loadScriptEnv()) {
  const configuredProjectId = requireEnv(
    env,
    "NEXT_PUBLIC_APPWRITE_PROJECT_ID",
  );
  const expectedTestProjectId = requireEnv(env, "E2E_APPWRITE_PROJECT_ID");

  if (env.E2E_TEST_PROJECT_MARKER !== E2E_MARKER) {
    throw new Error(
      `Refusing E2E mutation: E2E_TEST_PROJECT_MARKER must equal ${E2E_MARKER}.`,
    );
  }

  if (configuredProjectId !== expectedTestProjectId) {
    throw new Error(
      "Refusing E2E mutation: the configured Appwrite project does not match E2E_APPWRITE_PROJECT_ID.",
    );
  }

  if (
    env.PRODUCTION_APPWRITE_PROJECT_ID &&
    configuredProjectId === env.PRODUCTION_APPWRITE_PROJECT_ID
  ) {
    throw new Error(
      "Refusing E2E mutation: the test project matches PRODUCTION_APPWRITE_PROJECT_ID.",
    );
  }
}

export const e2eIds = {
  users: ["e2e_user_alpha", "e2e_user_beta", "e2e_user_pending"],
  lenders: ["e2e_lender_alpha", "e2e_lender_beta", "e2e_lender_pending"],
  borrowers: ["e2e_borrower_alpha", "e2e_borrower_beta"],
  collectors: ["e2ealpha4821", "e2ebeta5932"],
  loans: ["e2e_loan_alpha", "e2e_loan_beta"],
  payments: ["e2e_payment_alpha"],
};

function requireEnv(env, name) {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for dedicated E2E testing.`);
  }
  return value;
}
