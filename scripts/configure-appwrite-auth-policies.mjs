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

await project.updateSessionDurationPolicy({
  duration: NINETY_DAYS_IN_SECONDS,
});
await project.updateSessionInvalidationPolicy({ enabled: true });

console.log("Appwrite lender sessions now use a 90-day maximum duration.");
console.log("Lender password changes now invalidate existing sessions.");

function requireEnv(name) {
  const value = env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}
