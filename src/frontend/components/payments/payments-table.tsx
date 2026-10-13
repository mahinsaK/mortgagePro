"use client";

import type { PaymentRow } from "@/backend/services/lending-service";
import { DeletePaymentButton } from "@/frontend/components/payments/delete-payment-button";
import { LocalTimestamp } from "@/frontend/components/ui/local-timestamp";

/** Renders payment records as compact mobile cards and a desktop table. */
export function PaymentsTable({ payments, onDeleted }: {
  payments: PaymentRow[];
  onDeleted?: () => void | Promise<void>;
}) {
  return (
    <>
      <div className="divide-y divide-[#eef2f6] md:hidden">
        {payments.map((payment) => (
          <article className="p-4" key={payment.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold">{payment.borrowerName}</p>
                <p className="mt-1 truncate text-sm text-[#657386]">Collected by {payment.collectorName}</p>
              </div>
              <p className="shrink-0 font-semibold text-[#15191f]">{payment.amount}</p>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="min-w-0 text-sm text-[#657386]">
                <span>{payment.method}</span><span aria-hidden="true"> · </span><LocalTimestamp value={payment.recordedAt} />
              </div>
              <DeletePaymentButton onDeleted={onDeleted} paymentId={payment.id} />
            </div>
          </article>
        ))}
        {payments.length === 0 ? <p className="p-5 text-sm text-[#657386]">No payments found.</p> : null}
      </div>
      <div className="overflow-x-auto">
        <table className="hidden w-full min-w-[760px] border-collapse text-left text-sm md:table">
          <thead className="bg-[#f8fafc] text-[#657386]"><tr><th className="px-5 py-3">Borrower</th><th className="px-5 py-3">Collector</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Method</th><th className="px-5 py-3">Collected at</th><th className="px-5 py-3 text-right">Actions</th></tr></thead>
          <tbody>
            {payments.map((payment) => (
              <tr className="border-t border-[#eef2f6]" key={payment.id}>
                <td className="px-5 py-4">{payment.borrowerName}</td><td className="px-5 py-4">{payment.collectorName}</td><td className="px-5 py-4">{payment.amount}</td><td className="px-5 py-4">{payment.method}</td><td className="px-5 py-4 text-[#657386]"><LocalTimestamp value={payment.recordedAt} /></td><td className="px-5 py-4"><div className="flex justify-end"><DeletePaymentButton onDeleted={onDeleted} paymentId={payment.id} /></div></td>
              </tr>
            ))}
            {payments.length === 0 ? <tr><td className="px-5 py-6 text-[#657386]" colSpan={6}>No payments found.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
