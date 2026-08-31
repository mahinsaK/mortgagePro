"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Download, RefreshCw, X } from "lucide-react";
import { useState } from "react";
import { LocalTimestamp } from "@/frontend/components/ui/local-timestamp";
import { DeletePaymentButton } from "@/frontend/components/payments/delete-payment-button";

type LoanPaymentDetails = {
  loanId: string;
  borrowerName: string;
  totalPaid: string;
  remaining: string;
  payments: Array<{
    id: string;
    amount: string;
    collectorName: string;
    method: string;
    date: string;
    recordedAt: string;
  }>;
};

export function LoanPaymentsPanel({ loanId }: { loanId: string }) {
  const [details, setDetails] = useState<LoanPaymentDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadPayments() {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/loans/${loanId}/payments`);

      if (!response.ok) {
        throw new Error("Unable to load payments.");
      }

      setDetails((await response.json()) as LoanPaymentDetails);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Unable to load payments.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleOpenChange(open: boolean) {
    if (open && !details && !isLoading) {
      void loadPayments();
    }
  }

  return (
    <Dialog.Root onOpenChange={handleOpenChange}>
      <section className="mt-6 border-t border-[#eef2f6] pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-semibold">Payments</h3>
          <div className="flex items-center gap-2">
            <a
              aria-label="Download loan payments as CSV"
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#15191f] text-white shadow-sm transition hover:bg-[#2d3745] sm:size-10"
              href={`/api/loans/${encodeURIComponent(loanId)}/payments?format=csv`}
              title="Download loan payments as CSV"
            >
              <Download aria-hidden="true" size={16} />
              <span className="sr-only">Download loan payments as CSV</span>
            </a>
            <Dialog.Trigger asChild>
              <button
                className="h-11 rounded-md border border-[#cfd8e3] px-4 text-sm font-semibold text-[#2d3745] transition hover:bg-[#f8fafc] sm:h-10"
                type="button"
              >
                View payments
              </button>
            </Dialog.Trigger>
          </div>
        </div>
      </section>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/20" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-2xl flex-col border-l border-[#dfe5ec] bg-white text-[#15191f] shadow-2xl outline-none">
          <div className="flex items-start justify-between gap-3 border-b border-[#dfe5ec] px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6 sm:py-4">
            <div>
              <Dialog.Description className="text-sm font-medium text-[#657386]">
                Loan payments
              </Dialog.Description>
              <Dialog.Title className="mt-1 text-xl font-semibold">
                Payment history
              </Dialog.Title>
            </div>
            <div className="flex items-center gap-2">
              <button
                aria-label="Refresh payments"
                className="flex size-10 items-center justify-center rounded-full border border-[#cfd8e3] text-[#2d3745] transition hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:text-[#9aa6b2]"
                disabled={isLoading}
                onClick={() => void loadPayments()}
                title="Refresh payments"
                type="button"
              >
                <RefreshCw
                  aria-hidden="true"
                  className={isLoading ? "animate-spin" : ""}
                  size={17}
                />
              </button>
              <Dialog.Close asChild>
                <button
                  aria-label="Close payment details"
                  className="flex size-10 items-center justify-center rounded-full border border-[#cfd8e3] text-[#2d3745] transition hover:bg-[#f8fafc]"
                  title="Close payment details"
                  type="button"
                >
                  <X aria-hidden="true" size={18} />
                </button>
              </Dialog.Close>
            </div>
          </div>

          <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">
            {isLoading && !details ? (
              <p className="text-sm text-[#657386]" role="status">
                Loading payment details...
              </p>
            ) : null}

            {error ? (
              <div className="rounded-lg border border-[#fecaca] bg-[#fef2f2] p-4">
                <p className="text-sm font-medium text-[#b91c1c]">{error}</p>
                <button
                  className="mt-3 h-9 rounded-md border border-[#fecaca] bg-white px-3 text-xs font-semibold text-[#b91c1c] transition hover:bg-[#fff7f7]"
                  onClick={() => void loadPayments()}
                  type="button"
                >
                  Try again
                </button>
              </div>
            ) : null}

            {details ? (
              <div>
                <div className="mb-5 grid gap-3 sm:grid-cols-2">
                  <Summary label="Total paid" value={details.totalPaid} />
                  <Summary label="Remaining" value={details.remaining} />
                </div>

                <div className="divide-y divide-[#eef2f6] overflow-hidden rounded-lg border border-[#eef2f6] sm:hidden">
                  {details.payments.map((payment) => (
                    <article className="p-4" key={payment.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {payment.collectorName}
                          </p>
                          <p className="mt-1 text-sm text-[#657386]">
                            <LocalTimestamp value={payment.recordedAt} />
                          </p>
                        </div>
                        <p className="shrink-0 font-semibold">{payment.amount}</p>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3 rounded-md bg-[#f8fafc] p-3">
                        <span className="rounded-full bg-[#e0ecff] px-2.5 py-1 text-xs font-semibold text-[#1d4ed8]">
                          {payment.method}
                        </span>
                        <DeletePaymentButton
                          onDeleted={loadPayments}
                          paymentId={payment.id}
                        />
                      </div>
                    </article>
                  ))}
                  {details.payments.length === 0 ? (
                    <p className="p-4 text-sm text-[#657386]">
                      No payments found for this loan.
                    </p>
                  ) : null}
                </div>

                <div
                  aria-label="Loan payment history table"
                  className="hidden overflow-x-auto rounded-lg border border-[#eef2f6] sm:block"
                  role="region"
                  tabIndex={0}
                >
                  <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                    <thead className="bg-[#f8fafc] text-[#657386]">
                      <tr>
                        <th className="px-3 py-3 font-semibold">Collector</th>
                        <th className="px-3 py-3 font-semibold">Amount</th>
                        <th className="px-3 py-3 font-semibold">Method</th>
                        <th className="px-3 py-3 font-semibold">Collected at</th>
                        <th className="px-3 py-3 text-right font-semibold">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {details.payments.map((payment) => (
                        <tr
                          className="border-t border-[#eef2f6]"
                          key={payment.id}
                        >
                          <td className="break-words px-3 py-3">
                            {payment.collectorName}
                          </td>
                          <td className="break-words px-3 py-3">
                            {payment.amount}
                          </td>
                          <td className="break-words px-3 py-3 text-[#657386]">
                            {payment.method}
                          </td>
                          <td className="break-words px-3 py-3 text-[#657386]">
                            <LocalTimestamp value={payment.recordedAt} />
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex justify-end">
                              <DeletePaymentButton
                                onDeleted={loadPayments}
                                paymentId={payment.id}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                      {details.payments.length === 0 ? (
                        <tr className="border-t border-[#eef2f6]">
                          <td className="px-3 py-4 text-[#657386]" colSpan={5}>
                            No payments found for this loan.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#eef2f6] p-3">
      <p className="text-xs font-semibold uppercase text-[#657386]">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
