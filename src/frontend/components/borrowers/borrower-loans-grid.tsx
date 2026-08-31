"use client";

import { useState } from "react";
import type { LoanRow } from "@/backend/services/lending-service";
import { LoanDetailsDialog } from "@/frontend/components/loans/loan-details-dialog";
import { LoanQrTableActions } from "@/frontend/components/loans/loan-qr-table-actions";

export function BorrowerLoansGrid({ loans }: { loans: LoanRow[] }) {
  const [selectedLoan, setSelectedLoan] = useState<LoanRow | null>(null);

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-2">
        {loans.map((loan) => (
          <article
            className="group relative cursor-pointer rounded-lg border border-[#dfe5ec] bg-white p-4 shadow-sm transition hover:bg-[#f8fafc] md:p-5"
            key={loan.id}
          >
            <button
              aria-label="View loan details and payments"
              className="absolute inset-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#1d4ed8] focus-visible:ring-offset-2"
              onClick={() => setSelectedLoan(loan)}
              type="button"
            />
            <div className="flex flex-col gap-4 sm:flex-row sm:gap-5">
              <div className="shrink-0">
                <LoanQrTableActions loanId={loan.id} />
              </div>
              <div className="pointer-events-none min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[#657386]">
                      Loan amount
                    </p>
                    <h3 className="mt-1 text-xl font-semibold">{loan.amount}</h3>
                  </div>
                  <span className="rounded-full bg-[#e0ecff] px-3 py-1 text-xs font-semibold text-[#1d4ed8]">
                    {loan.status}
                  </span>
                </div>

                <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Detail label="Total paid" value={loan.totalPaid} />
                  <Detail label="Remaining" value={loan.remainingAmount} />
                  <Detail label="Daily payment" value={loan.dailyPayment} />
                  <Detail label="Interest" value={loan.interestRate} />
                  <Detail label="Start date" value={loan.startDate} />
                  <Detail label="End date" value={loan.endDate} />
                </dl>
              </div>
            </div>
          </article>
        ))}
        {loans.length === 0 ? (
          <div className="rounded-lg border border-[#dfe5ec] bg-white p-6 text-sm text-[#657386] shadow-sm">
            No loans found for this borrower.
          </div>
        ) : null}
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
