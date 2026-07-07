"use client";

import { useState } from "react";

type LoanPaymentDetails = {
  loanId: string;
  totalPaid: string;
  remaining: string;
  payments: Array<{
    id: string;
    amount: string;
    collectorName: string;
    method: string;
    date: string;
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

  return (
    <section className="mt-6 border-t border-[#eef2f6] pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold">Payments</h3>
        <button
          className="h-9 rounded-md border border-[#cfd8e3] px-3 text-xs font-semibold text-[#2d3745] transition hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:text-[#9aa6b2]"
          disabled={isLoading}
          onClick={loadPayments}
          type="button"
        >
          {details ? "Refresh payments" : isLoading ? "Loading..." : "View payments"}
        </button>
      </div>

      {error ? <p className="mt-3 text-sm text-[#b91c1c]">{error}</p> : null}

      {details ? (
        <div className="mt-4">
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <Summary label="Total paid" value={details.totalPaid} />
            <Summary label="Remaining" value={details.remaining} />
          </div>

          <div className="overflow-hidden rounded-lg border border-[#eef2f6]">
            <table className="w-full table-fixed border-collapse text-left text-sm">
              <thead className="bg-[#f8fafc] text-[#657386]">
                <tr>
                  <th className="px-3 py-3 font-semibold">Payment</th>
                  <th className="px-3 py-3 font-semibold">Collector</th>
                  <th className="px-3 py-3 font-semibold">Amount</th>
                  <th className="px-3 py-3 font-semibold">Method</th>
                  <th className="px-3 py-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {details.payments.map((payment) => (
                  <tr className="border-t border-[#eef2f6]" key={payment.id}>
                    <td className="break-all px-3 py-3 font-medium">
                      {payment.id}
                    </td>
                    <td className="break-words px-3 py-3">
                      {payment.collectorName}
                    </td>
                    <td className="break-words px-3 py-3">{payment.amount}</td>
                    <td className="break-words px-3 py-3 text-[#657386]">
                      {payment.method}
                    </td>
                    <td className="break-words px-3 py-3 text-[#657386]">
                      {payment.date}
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
    </section>
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
