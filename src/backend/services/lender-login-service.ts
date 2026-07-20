import "server-only";

import type { Models } from "node-appwrite";
import { appwriteServerConfig } from "@/backend/appwrite/config";
import {
  databases,
  Query,
  users,
} from "@/backend/appwrite/server-client";

export async function findActiveLenderByAppwriteUserId(
  appwriteUserId: string,
) {
  const lenders = await databases.listDocuments({
    databaseId: appwriteServerConfig.databaseId,
    collectionId: appwriteServerConfig.collections.lenders,
    queries: [
      Query.equal("appwrite_user_id", appwriteUserId),
      Query.equal("status", "active"),
      Query.limit(1),
      Query.select(["$id"]),
    ],
  });

  return lenders.documents[0] ?? null;
}

export async function revokeAppwriteSessionBestEffort(
  session: Pick<Models.Session, "$id" | "userId">,
) {
  try {
    await users.deleteSession({
      userId: session.userId,
      sessionId: session.$id,
    });
  } catch {
    // Cleanup failures must not expose authentication or session details.
  }
}
