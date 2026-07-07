"use client";

import { useState } from "react";
import type { LoanRow } from "@/backend/services/lending-service";
import { QrCodeImage } from "@/frontend/components/ui/qr-code-image";

export function LoansTable({ loans }: { loans: LoanRow[] }) {
  const [selectedLoan, setSelectedLoan] = useState<LoanRow | null>(null);

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-left text-sm">
          <thead className="bg-[#f8fafc] text-[#657386]">
            <tr>
              <th className="px-5 py-3 font-semibold">QR</th>
              <th className="px-5 py-3 font-semibold">Loan</th>
              <th className="px-5 py-3 font-semibold">Borrower</th>
              <th className="px-5 py-3 font-semibold">Amount</th>
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
                  <QrCodeImage src={loan.qrCode} />
                </td>
                <td className="px-5 py-4 font-medium">{loan.id}</td>
                <td className="px-5 py-4">{loan.borrowerName}</td>
                <td className="px-5 py-4">{loan.amount}</td>
                <td className="px-5 py-4">{loan.dailyPayment}</td>
                <td className="px-5 py-4">{loan.interestRate}</td>
                <td className="px-5 py-4">
                  <span className="rounded-full bg-[#e0ecff] px-3 py-1 text-xs font-semibold text-[#1d4ed8]">
                    {loan.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-[#657386]">{loan.endDate}</td>
              </tr>
            ))}
            {loans.length === 0 ? (
              <tr className="border-t border-[#eef2f6]">
                <td className="px-5 py-6 text-[#657386]" colSpan={8}>
                  No loans found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {selectedLoan ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setSelectedLoan(null)}
        >
          <section
            className="w-full max-w-2xl rounded-lg bg-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-[#dfe5ec] px-6 py-5">
              <div>
                <p className="text-sm font-medium text-[#657386]">
                  Loan details
                </p>
                <h2 className="mt-1 text-2xl font-semibold">
                  {selectedLoan.id}
                </h2>
              </div>
              <button
                className="rounded-md border border-[#cfd8e3] px-3 py-2 text-sm font-medium text-[#2d3745] transition hover:bg-[#f8fafc]"
                onClick={() => setSelectedLoan(null)}
                type="button"
              >
                Close
              </button>
            </div>

            <div className="grid gap-6 p-6 md:grid-cols-[140px_1fr]">
              <div>
                <QrCodeImage src={selectedLoan.qrCode} />
                {selectedLoan.qrCode ? (
                  <a
                    className="mt-2 block text-center text-xs font-semibold text-[#1d4ed8] hover:underline"
                    download={`${selectedLoan.id}-qr.png`}
                    href={selectedLoan.qrCode}
                  >
                    Download QR
                  </a>
                ) : null}
              </div>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Detail label="Borrower" value={selectedLoan.borrowerName} />
                <Detail label="Status" value={selectedLoan.status} />
                <Detail label="Amount" value={selectedLoan.amount} />
                <Detail
                  label="Daily payment"
                  value={selectedLoan.dailyPayment}
                />
                <Detail label="Interest rate" value={selectedLoan.interestRate} />
                <Detail label="Start date" value={selectedLoan.startDate} />
                <Detail label="End date" value={selectedLoan.endDate} />
                <Detail label="Borrower ID" value={selectedLoan.borrowerId} />
              </dl>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[#657386]">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-[#15191f]">{value}</dd>
    </div>
  );
}
