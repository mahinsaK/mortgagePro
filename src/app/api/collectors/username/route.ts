import { appwriteServerConfig } from "@/server/appwrite/config";
import { databases, Query } from "@/server/appwrite/server-client";
import { validateNewCollectorUsername } from "@/features/collectors/domain/username";
import { getPrimaryLender } from "@/server/services/lender-service";

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
