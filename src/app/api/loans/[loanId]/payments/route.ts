import { getLoanPaymentDetails } from "@/backend/services/lending-service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ loanId: string }> },
) {
  const { loanId } = await params;
  const details = await getLoanPaymentDetails(loanId);

  if (!details) {
    return new Response("Loan not found.", { status: 404 });
  }

  return Response.json(details);
}
