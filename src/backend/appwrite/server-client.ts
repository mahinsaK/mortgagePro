import "server-only";

import { Account, Client, Databases, ID, Query, Users } from "node-appwrite";
import { appwriteServerConfig } from "./config";

const client = new Client()
  .setEndpoint(appwriteServerConfig.endpoint)
  .setProject(appwriteServerConfig.projectId)
  .setKey(appwriteServerConfig.apiKey);

export const databases = new Databases(client);
export const users = new Users(client);
export function createAccountClient(session?: string) {
  const accountClient = new Client()
    .setEndpoint(appwriteServerConfig.endpoint)
    .setProject(appwriteServerConfig.projectId);

  if (session) {
    accountClient.setSession(session);
  }

  return new Account(accountClient);
}

export { ID, Query };
