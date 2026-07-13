"use client";

import { useState } from "react";
import type { LoanRow } from "@/backend/services/lending-service";
import { LoanDetailsDialog } from "@/frontend/components/loans/loan-details-dialog";

export function LoansTable({ loans }: { loans: LoanRow[] }) {
  const [selectedLoan, setSelectedLoan] = useState<LoanRow | null>(null);

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
          <thead className="bg-[#f8fafc] text-[#657386]">
            <tr>
              <th className="px-5 py-3 font-semibold">QR</th>
              <th className="px-5 py-3 font-semibold">Loan</th>
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
                  <a
                    className="inline-flex h-9 items-center rounded-md border border-[#cfd8e3] px-3 text-xs font-semibold text-[#1d4ed8] transition hover:bg-[#f8fafc]"
                    download={`${loan.id}-qr.png`}
                    href={`/api/loans/${loan.id}/qr`}
                    onClick={(event) => event.stopPropagation()}
                  >
                    Download
                  </a>
                </td>
                <td className="px-5 py-4 font-medium">{loan.id}</td>
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
                <td className="px-5 py-6 text-[#657386]" colSpan={10}>
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
