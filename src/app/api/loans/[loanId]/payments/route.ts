import { getLoanPaymentDetails } from "@/backend/services/lending-service";
import { escapeCsvCell } from "@/backend/lib/csv";

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
    const filename = `${safeFilenamePart(details.borrowerName)}_payments.csv`;

    return new Response(toCsv(details.payments), {
      headers: {
        "Content-Disposition": contentDisposition(filename),
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
      headers
        .map((header) => escapeCsvCell(row[header as keyof typeof row]))
        .join(","),
    ),
  ].join("\n");
}

function safeFilenamePart(value: string) {
  const cleaned = value
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
    .replace(/\s+/g, " ")
    .replace(/_+/g, "_")
    .trim()
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 80);

  return cleaned || "Borrower";
}

function contentDisposition(filename: string) {
  const asciiFilename = filename
    .normalize("NFKD")
    .replace(/[^\x20-\x7e]/g, "")
    .replace(/["\\]/g, "_");

  return `attachment; filename="${asciiFilename || "borrower_payments.csv"}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
