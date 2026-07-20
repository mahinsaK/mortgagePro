import { requireActiveCollectorPrincipal } from "@/backend/services/collector-auth-service";
import { getTenantDocument } from "@/backend/services/tenant-data-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await requireActiveCollectorPrincipal();

  if (!session) {
    return Response.json({ error: "Collector login is required." }, { status: 401 });
  }

  const url = new URL(request.url);
  const loanId = String(url.searchParams.get("loanId") ?? "").trim();

  if (!loanId) {
    return Response.json({ error: "A loan reference is required." }, { status: 400 });
  }

  const loan = await getTenantDocument("loans", session.lenderId, loanId, [
    "$id",
    "borrower_id",
    "remaining_amount",
    "daily_payment",
  ]);

  if (!loan) {
    return Response.json({ error: "That QR code is not a valid loan." }, { status: 404 });
  }

  const borrower = await getTenantDocument(
    "borrowers",
    session.lenderId,
    String(loan.borrower_id ?? ""),
    ["$id", "name"],
  );

  return Response.json({
    loan: {
      id: loan.$id,
      borrowerName: String(borrower?.name ?? "Unknown borrower"),
      remainingAmount: Number(loan.remaining_amount ?? 0),
      dailyPayment: Number(loan.daily_payment ?? 0),
    },
  });
}
