import "server-only";

import { Client, Databases, Query } from "node-appwrite";
import { appwriteServerConfig } from "./config";

const client = new Client()
  .setEndpoint(appwriteServerConfig.endpoint)
  .setProject(appwriteServerConfig.projectId)
  .setKey(appwriteServerConfig.apiKey);

export const databases = new Databases(client);
export { Query };
