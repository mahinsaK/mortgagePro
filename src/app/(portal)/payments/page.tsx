import { getPaymentsPageData } from "@/backend/services/lending-service";
import { LocalTimestamp } from "@/frontend/components/ui/local-timestamp";
import { PaginationControls } from "@/frontend/components/ui/pagination-controls";

export const dynamic = "force-dynamic";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const { payments, pageInfo } = await getPaymentsPageData({
    page: Number(page) || 1,
  });

  return (
    <div>
      <div className="mb-8">
        <p className="text-sm font-medium text-[#657386]">Payments</p>
        <h1 className="mt-2 text-3xl font-semibold">Payment history</h1>
      </div>

      <section className="rounded-lg border border-[#dfe5ec] bg-white shadow-sm">
        <div className="border-b border-[#dfe5ec] px-5 py-4">
          <h2 className="text-lg font-semibold">Payments list</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead className="bg-[#f8fafc] text-[#657386]">
              <tr>
                <th className="px-5 py-3 font-semibold">Borrower</th>
                <th className="px-5 py-3 font-semibold">Collector</th>
                <th className="px-5 py-3 font-semibold">Amount</th>
                <th className="px-5 py-3 font-semibold">Method</th>
                <th className="px-5 py-3 font-semibold">Collected at</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr className="border-t border-[#eef2f6]" key={payment.id}>
                  <td className="px-5 py-4">{payment.borrowerName}</td>
                  <td className="px-5 py-4">{payment.collectorName}</td>
                  <td className="px-5 py-4">{payment.amount}</td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-[#e0ecff] px-3 py-1 text-[13px] font-semibold text-[#1d4ed8]">
                      {payment.method}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-[#657386]">
                    <LocalTimestamp value={payment.recordedAt} />
                  </td>
                </tr>
              ))}
              {payments.length === 0 ? (
                <tr className="border-t border-[#eef2f6]">
                  <td className="px-5 py-6 text-[#657386]" colSpan={5}>
                    No payments found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <PaginationControls basePath="/payments" pageInfo={pageInfo} />
      </section>
    </div>
  );
}
