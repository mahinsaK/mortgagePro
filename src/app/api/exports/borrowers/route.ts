import { getBorrowersExportData } from "@/backend/services/lending-service";
import { escapeCsvCell } from "@/backend/lib/csv";

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

  const { borrowers } = await getBorrowersExportData({ startDate, endDate });
  const rows = borrowers.map((borrower) => ({
    borrower_id: borrower.id,
    created_at: borrower.createdAt,
    name: borrower.name,
    business_name: borrower.businessName,
    contact: borrower.contactInfo,
    address: borrower.addressInfo,
    status: borrower.status,
  }));
  const filename = `mortgagepro_borrowers_${startDate}_to_${endDate}.csv`;

  return new Response(toCsv(rows), {
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
    "borrower_id",
    "created_at",
    "name",
    "business_name",
    "contact",
    "address",
    "status",
  ];
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((header) => escapeCsvCell(row[header])).join(","),
    ),
  ];

  return lines.join("\n");
}
