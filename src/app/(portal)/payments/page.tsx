import { getPaymentsPageData } from "@/backend/services/lending-service";
import { LocalTimestamp } from "@/frontend/components/ui/local-timestamp";
import { PaginationControls } from "@/frontend/components/ui/pagination-controls";
import { DeletePaymentButton } from "@/frontend/components/payments/delete-payment-button";

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
      <div className="mb-6 md:mb-8">
        <p className="text-sm font-medium text-[#657386]">Payments</p>
        <h1 className="mt-1 text-2xl font-semibold md:mt-2 md:text-3xl">Payment history</h1>
      </div>

      <section className="rounded-lg border border-[#dfe5ec] bg-white shadow-sm">
        <div className="border-b border-[#dfe5ec] px-5 py-4">
          <h2 className="text-lg font-semibold">Payments list</h2>
        </div>
        <div className="divide-y divide-[#eef2f6] md:hidden">
          {payments.map((payment) => (
            <article className="p-4" key={payment.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold">
                    {payment.borrowerName}
                  </p>
                  <p className="mt-1 truncate text-sm text-[#657386]">
                    Collected by {payment.collectorName}
                  </p>
                </div>
                <p className="shrink-0 font-semibold text-[#15191f]">
                  {payment.amount}
                </p>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-[#f8fafc] p-3">
                <div>
                  <span className="rounded-full bg-[#e0ecff] px-2.5 py-1 text-xs font-semibold text-[#1d4ed8]">
                    {payment.method}
                  </span>
                  <p className="mt-2 text-sm text-[#657386]">
                    <LocalTimestamp value={payment.recordedAt} />
                  </p>
                </div>
                <DeletePaymentButton paymentId={payment.id} />
              </div>
            </article>
          ))}
          {payments.length === 0 ? (
            <p className="p-5 text-sm text-[#657386]">No payments found.</p>
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <table className="hidden w-full min-w-[760px] border-collapse text-left text-sm md:table">
            <thead className="bg-[#f8fafc] text-[#657386]">
              <tr>
                <th className="px-5 py-3 font-semibold">Borrower</th>
                <th className="px-5 py-3 font-semibold">Collector</th>
                <th className="px-5 py-3 font-semibold">Amount</th>
                <th className="px-5 py-3 font-semibold">Method</th>
                <th className="px-5 py-3 font-semibold">Collected at</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
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
                  <td className="px-5 py-4">
                    <div className="flex justify-end">
                      <DeletePaymentButton paymentId={payment.id} />
                    </div>
                  </td>
                </tr>
              ))}
              {payments.length === 0 ? (
                <tr className="border-t border-[#eef2f6]">
                  <td className="px-5 py-6 text-[#657386]" colSpan={6}>
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
