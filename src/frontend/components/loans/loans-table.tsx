"use client";

import { useState } from "react";
import type { LoanRow } from "@/backend/services/lending-service";
import { LoanDetailsDialog } from "@/frontend/components/loans/loan-details-dialog";
import { LoanQrDownloadButton } from "@/frontend/components/loans/loan-qr-download-button";

export function LoansTable({ loans }: { loans: LoanRow[] }) {
  const [selectedLoan, setSelectedLoan] = useState<LoanRow | null>(null);

  return (
    <>
      <div className="divide-y divide-[#eef2f6] md:hidden">
        {loans.map((loan) => (
          <button
            className="block w-full p-4 text-left transition active:bg-[#f8fafc]"
            key={loan.id}
            onClick={() => setSelectedLoan(loan)}
            type="button"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold">
                  {loan.borrowerName}
                </p>
                <p className="mt-1 text-sm text-[#657386]">
                  Ends {loan.endDate}
                </p>
              </div>
              <span className="rounded-full bg-[#e0ecff] px-2.5 py-1 text-xs font-semibold text-[#1d4ed8]">
                {loan.status}
              </span>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-[#f8fafc] p-3">
              <MobileDetail label="Amount" value={loan.amount} />
              <MobileDetail label="Remaining" value={loan.remainingAmount} />
              <MobileDetail label="Paid" value={loan.totalPaid} />
              <MobileDetail label="Daily" value={loan.dailyPayment} />
            </dl>
            <span className="mt-3 block text-sm font-semibold text-[#1d4ed8]">
              View loan details
            </span>
          </button>
        ))}
        {loans.length === 0 ? (
          <p className="p-5 text-sm text-[#657386]">No loans found.</p>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <table className="hidden w-full min-w-[1020px] border-collapse text-left text-sm md:table">
          <thead className="bg-[#f8fafc] text-[#657386]">
            <tr>
              <th className="px-5 py-3 font-semibold">QR</th>
              <th className="px-5 py-3 font-semibold">Borrower</th>
              <th className="px-5 py-3 font-semibold">Amount</th>
              <th className="px-5 py-3 font-semibold">Total paid</th>
              <th className="px-5 py-3 font-semibold">Remaining</th>
              <th className="px-5 py-3 font-semibold">Daily payment</th>
              <th className="px-5 py-3 font-semibold">Interest</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 font-semibold">End date</th>
            </tr>
          </thead>
          <tbody>
            {loans.map((loan) => (
              <tr
                className="cursor-pointer border-t border-[#eef2f6] transition hover:bg-[#f8fafc]"
                key={loan.id}
                onClick={() => setSelectedLoan(loan)}
              >
                <td className="px-5 py-4">
                  <LoanQrDownloadButton
                    className="inline-flex h-9 items-center gap-2 rounded-md border border-[#cfd8e3] px-3 text-xs font-semibold text-[#1d4ed8] transition hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-60"
                    label="Download"
                    loanId={loan.id}
                  />
                </td>
                <td className="px-5 py-4">{loan.borrowerName}</td>
                <td className="px-5 py-4">{loan.amount}</td>
                <td className="px-5 py-4">{loan.totalPaid}</td>
                <td className="px-5 py-4">{loan.remainingAmount}</td>
                <td className="px-5 py-4">{loan.dailyPayment}</td>
                <td className="px-5 py-4">{loan.interestRate}</td>
                <td className="px-5 py-4">
                  <span className="rounded-full bg-[#e0ecff] px-3 py-1 text-[13px] font-semibold text-[#1d4ed8]">
                    {loan.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-[#657386]">{loan.endDate}</td>
              </tr>
            ))}
            {loans.length === 0 ? (
              <tr className="border-t border-[#eef2f6]">
                <td className="px-5 py-6 text-[#657386]" colSpan={9}>
                  No loans found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {selectedLoan ? (
        <LoanDetailsDialog
          loan={selectedLoan}
          onClose={() => setSelectedLoan(null)}
        />
      ) : null}
    </>
  );
}

function MobileDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-[#657386]">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-[#15191f]">{value}</dd>
    </div>
  );
}
