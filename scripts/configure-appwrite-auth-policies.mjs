import { Client, Project } from "node-appwrite";
import { loadScriptEnv } from "./lib/load-env.mjs";

const NINETY_DAYS_IN_SECONDS = 90 * 24 * 60 * 60;
const env = loadScriptEnv();
const endpoint = requireEnv("NEXT_PUBLIC_APPWRITE_ENDPOINT");
const projectId = requireEnv("NEXT_PUBLIC_APPWRITE_PROJECT_ID");
const apiKey = requireEnv("APPWRITE_SETUP_API_KEY");

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey);
const project = new Project(client);

try {
  await project.updateSessionDurationPolicy({
    duration: NINETY_DAYS_IN_SECONDS,
  });
  await project.updateSessionInvalidationPolicy({ enabled: true });

  console.log("Appwrite lender sessions now use a 90-day maximum duration.");
  console.log("Lender password changes now invalidate existing sessions.");
} catch (error) {
  if (error?.code === 401 && error?.type === "general_unauthorized_scope") {
    console.error(
      "APPWRITE_SETUP_API_KEY needs both policies.write and project.policies.write. Add those scopes in Appwrite Console, then run this command again.",
    );
    process.exitCode = 1;
  } else {
    throw error;
  }
}

function requireEnv(name) {
  const value = env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}
