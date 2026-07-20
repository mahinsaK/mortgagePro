import { getLoanPaymentDetails } from "@/backend/services/lending-service";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ loanId: string }> },
) {
  const { loanId } = await params;
  const details = await getLoanPaymentDetails(loanId);

  if (!details) {
    return new Response("Loan not found.", { status: 404 });
  }

  if (new URL(request.url).searchParams.get("format") === "csv") {
    return new Response(toCsv(details.payments), {
      headers: {
        "Content-Disposition":
          'attachment; filename="mortgagepro_loan_payments.csv"',
        "Content-Type": "text/csv; charset=utf-8",
      },
    });
  }

  return Response.json(details);
}

function toCsv(
  payments: Array<{
    amount: string;
    collectorName: string;
    method: string;
    date: string;
    recordedAt: string;
  }>,
) {
  const headers = ["date", "collected_at", "collector", "amount", "method"];
  const rows = payments.map((payment) => ({
    date: payment.date,
    collected_at: payment.recordedAt,
    collector: payment.collectorName,
    amount: payment.amount,
    method: payment.method,
  }));

  return [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((header) => escapeCell(row[header as keyof typeof row])).join(","),
    ),
  ].join("\n");
}

function escapeCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}
