import { getPaymentsExportData } from "@/backend/services/lending-service";
import { formatMoney } from "@/backend/lib/currency";

type CsvValue = string | number | boolean | null | undefined;
type CsvRow = Record<string, CsvValue>;

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const startDate = normalizeDateParam(url.searchParams.get("start"));
  const endDate = normalizeDateParam(url.searchParams.get("end"));

  if (!startDate || !endDate) {
    return new Response("Start date and end date are required.", {
      status: 400,
    });
  }

  const { lender, payments } = await getPaymentsExportData({ startDate, endDate });
  const rows = payments.map((payment) => ({
    payment_id: payment.id,
    date: payment.rawDate,
    borrower: payment.borrowerName,
    loan_id: payment.loanId,
    collector: payment.collectorName,
    amount: payment.amount,
    method: payment.method,
  }));
  const totalAmount = payments.reduce(
    (total, payment) => total + payment.amountValue,
    0,
  );
  const rowsWithTotal =
    rows.length > 0
      ? [
          ...rows,
          {
            payment_id: "TOTAL",
            date: "",
            borrower: `${payments.length} payments`,
            loan_id: "",
            collector: "",
            amount: formatMoney(totalAmount, lender?.currency),
            method: "",
          },
        ]
      : rows;
  const filename = `mortgagepro_payments_${startDate || "start"}_to_${endDate || "end"}.csv`;

  return new Response(toCsv(rowsWithTotal), {
    headers: {
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}

function normalizeDateParam(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }

  return value;
}

function toCsv(rows: CsvRow[]) {
  const headers = [
    "payment_id",
    "date",
    "borrower",
    "loan_id",
    "collector",
    "amount",
    "method",
  ];
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeCell(row[header])).join(",")),
  ];

  return lines.join("\n");
}

function escapeCell(value: CsvValue) {
  const cell = String(value ?? "");
  return `"${cell.replaceAll('"', '""')}"`;
}
