"use client";

import Link from "next/link";
import type { DashboardLoan } from "@/backend/services/dashboard-service";
import { LoanPaymentsPanel } from "@/frontend/components/loans/loan-payments-panel";
import { LoanQrPanel } from "@/frontend/components/loans/loan-qr-panel";

export function DashboardLoanDetailsDialog({
  loan,
  onClose,
}: {
  loan: DashboardLoan;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center sm:px-4"
      onClick={onClose}
    >
      <section
        aria-labelledby="dashboard-loan-details-title"
        aria-modal="true"
        className="max-h-[calc(100dvh-0.75rem)] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:max-h-[calc(100vh-48px)] sm:rounded-lg"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#dfe5ec] px-4 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0">
            <p className="text-sm font-medium text-[#657386]">Loan details</p>
            <h2
              className="mt-1 truncate text-2xl font-semibold"
              id="dashboard-loan-details-title"
            >
              {loan.borrower}
            </h2>
          </div>
          <button
            className="shrink-0 rounded-md border border-[#cfd8e3] px-3 py-2 text-sm font-medium text-[#2d3745] transition hover:bg-[#f8fafc]"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>
        <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">
          <Link
            className="mb-5 inline-flex h-10 items-center rounded-md bg-[#15191f] px-4 text-sm font-semibold text-white transition hover:bg-[#2d3745]"
            href={`/borrowers/${encodeURIComponent(loan.borrowerId)}`}
          >
            View borrower profile
          </Link>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Detail label="Borrower" value={loan.borrower} />
            <Detail
              label="Contact"
              value={loan.borrowerContact || "No contact"}
            />
            <Detail label="Status" value={loan.status} />
            <Detail label="Amount" value={loan.amount} />
            <Detail label="Total paid" value={loan.totalPaid} />
            <Detail label="Remaining" value={loan.remainingAmount} />
            <Detail label="Daily payment" value={loan.dailyPayment} />
            <Detail label="End date" value={loan.endDate} />
          </dl>
          <LoanQrPanel loanId={loan.id} />
          <LoanPaymentsPanel loanId={loan.id} />
        </div>
      </section>
    </div>
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
