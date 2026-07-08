import { appwriteServerConfig } from "@/backend/appwrite/config";
import { databases, Query } from "@/backend/appwrite/server-client";
import { getCollectorSession } from "@/backend/services/collector-auth-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getCollectorSession();

  if (!session) {
    return Response.json({ error: "Collector login is required." }, { status: 401 });
  }

  const url = new URL(request.url);
  const loanId = String(url.searchParams.get("loanId") ?? "").trim();

  if (!loanId) {
    return Response.json({ error: "Loan ID is required." }, { status: 400 });
  }

  const loans = await databases.listDocuments({
    databaseId: appwriteServerConfig.databaseId,
    collectionId: appwriteServerConfig.collections.loans,
    queries: [
      Query.equal("$id", loanId),
      Query.limit(1),
      Query.select([
        "$id",
        "lender_id",
        "borrower_id",
        "amount",
        "total_paid",
        "remaining_amount",
        "status",
      ]),
    ],
  });
  const loan = loans.documents[0];

  if (!loan) {
    return Response.json({ error: "That QR code is not a valid loan." }, { status: 404 });
  }

  if (String(loan.lender_id ?? "") !== session.lenderId) {
    return Response.json(
      {
        error:
          "You cannot collect this payment because this collector is not registered for that lender.",
      },
      { status: 403 },
    );
  }

  const borrowers = await databases.listDocuments({
    databaseId: appwriteServerConfig.databaseId,
    collectionId: appwriteServerConfig.collections.borrowers,
    queries: [
      Query.equal("lender_id", session.lenderId),
      Query.equal("$id", String(loan.borrower_id ?? "")),
      Query.limit(1),
      Query.select(["$id", "name"]),
    ],
  });
  const borrower = borrowers.documents[0];

  return Response.json({
    loan: {
      id: loan.$id,
      borrowerName: String(borrower?.name ?? "Unknown borrower"),
      amount: Number(loan.amount ?? 0),
      totalPaid: Number(loan.total_paid ?? 0),
      remainingAmount: Number(
        loan.remaining_amount ??
          Math.max(Number(loan.amount ?? 0) - Number(loan.total_paid ?? 0), 0),
      ),
      status: String(loan.status ?? "active"),
    },
  });
}
