import { appwriteServerConfig } from "@/backend/appwrite/config";
import { databases, Query } from "@/backend/appwrite/server-client";
import { validateNewCollectorUsername } from "@/backend/modules/collectors/username";
import { getPrimaryLender } from "@/backend/services/lender-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const lender = await getPrimaryLender();

  if (!lender) {
    return Response.json({ error: "Lender login is required." }, { status: 401 });
  }

  const username = new URL(request.url).searchParams.get("value")?.trim() ?? "";
  const validationError = validateNewCollectorUsername(username);

  if (validationError) {
    return Response.json(
      { available: false, error: validationError, username },
      { status: 400 },
    );
  }

  const collectors = await databases.listDocuments({
    databaseId: appwriteServerConfig.databaseId,
    collectionId: appwriteServerConfig.collections.collectors,
    queries: [
      Query.equal("$id", username),
      Query.limit(1),
      Query.select(["$id"]),
    ],
  });

  return Response.json({ available: collectors.total === 0, username });
}
