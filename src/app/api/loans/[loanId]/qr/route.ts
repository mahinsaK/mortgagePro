import { loanBelongsToActiveLender } from "@/backend/services/lending-service";
import { generateLoanQrPng } from "@/backend/services/qr-code-service";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ loanId: string }> },
) {
  const { loanId } = await params;
  const canAccessLoan = await loanBelongsToActiveLender(loanId);

  if (!canAccessLoan) {
    return new Response("Loan not found.", { status: 404 });
  }

  const qrBuffer = await generateLoanQrPng(loanId);
  const isDisplayRequest =
    new URL(request.url).searchParams.get("display") === "1";

  return new Response(new Uint8Array(qrBuffer), {
    headers: {
      "Content-Disposition": `${
        isDisplayRequest ? "inline" : "attachment"
      }; filename="${loanId}-qr.png"`,
      "Content-Type": "image/png",
    },
  });
}
