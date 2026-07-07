import Link from "next/link";
import { getDailyCollectionsData } from "@/backend/services/lending-service";
import { CsvExportButton } from "@/frontend/components/export/csv-export-button";

export const dynamic = "force-dynamic";

export default async function DailyCollectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const selectedDate = date || toDateInputValue(new Date());
  const { payments } = await getDailyCollectionsData(selectedDate);
  const exportRows = payments.map((payment) => ({
    payment_id: payment.id,
    date: payment.rawDate,
    borrower: payment.borrowerName,
    loan_id: payment.loanId,
    collector: payment.collectorName,
    amount: payment.amount,
    method: payment.method,
  }));

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#657386]">
            Daily collections
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Payments by day</h1>
        </div>
        <Link
          className="rounded-md border border-[#cfd8e3] px-4 py-2 text-sm font-medium text-[#2d3745] transition hover:bg-[#f8fafc]"
          href="/dashboard/lender"
        >
          Back
        </Link>
      </div>

      <section className="mb-6 rounded-lg border border-[#dfe5ec] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <form className="flex flex-wrap items-end gap-3">
            <label className="text-sm font-medium text-[#2d3745]">
              Collection date
              <input
                className="mt-2 h-10 rounded-md border border-[#cfd8e3] px-3 text-sm outline-none transition focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#dbeafe]"
                defaultValue={selectedDate}
                name="date"
                type="date"
              />
            </label>
            <button
              className="h-10 rounded-md bg-[#15191f] px-4 text-sm font-semibold text-white transition hover:bg-[#2d3745]"
              type="submit"
            >
              View day
            </button>
          </form>

          <CsvExportButton
            filename={`daily_collections_${selectedDate}.csv`}
            rows={exportRows}
          />
        </div>
      </section>

      <section className="rounded-lg border border-[#dfe5ec] bg-white shadow-sm">
        <div className="border-b border-[#dfe5ec] px-5 py-4">
          <h2 className="text-lg font-semibold">Collection details</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-left text-sm">
            <thead className="bg-[#f8fafc] text-[#657386]">
              <tr>
                <th className="px-5 py-3 font-semibold">Payment</th>
                <th className="px-5 py-3 font-semibold">Borrower</th>
                <th className="px-5 py-3 font-semibold">Loan</th>
                <th className="px-5 py-3 font-semibold">Collector</th>
                <th className="px-5 py-3 font-semibold">Amount</th>
                <th className="px-5 py-3 font-semibold">Method</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr className="border-t border-[#eef2f6]" key={payment.id}>
                  <td className="px-5 py-4 font-medium">{payment.id}</td>
                  <td className="px-5 py-4">{payment.borrowerName}</td>
                  <td className="px-5 py-4 text-[#657386]">{payment.loanId}</td>
                  <td className="px-5 py-4">{payment.collectorName}</td>
                  <td className="px-5 py-4">{payment.amount}</td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-[#e0ecff] px-3 py-1 text-xs font-semibold text-[#1d4ed8]">
                      {payment.method}
                    </span>
                  </td>
                </tr>
              ))}
              {payments.length === 0 ? (
                <tr className="border-t border-[#eef2f6]">
                  <td className="px-5 py-6 text-[#657386]" colSpan={6}>
                    No collections found for this day.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
