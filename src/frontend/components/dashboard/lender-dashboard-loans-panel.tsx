"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { DateRangeCsvExport } from "@/frontend/components/export/csv-export-button";
import { LoanQrPanel } from "@/frontend/components/loans/loan-qr-panel";
import { LoanPaymentsPanel } from "@/frontend/components/loans/loan-payments-panel";
import { PaginationControls } from "@/frontend/components/ui/pagination-controls";

type DashboardLoan = {
  id: string;
  borrower: string;
  borrowerContact: string;
  borrowerPhone: string;
  amount: string;
  totalPaid: string;
  remainingAmount: string;
  dailyPayment: string;
  status: string;
  endDate: string;
};
type PageInfo = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export function LenderDashboardLoansPanel({
  loans,
  pageInfo,
  query,
}: {
  loans: DashboardLoan[];
  pageInfo: PageInfo;
  query: string;
}) {
  const [selectedLoan, setSelectedLoan] = useState<DashboardLoan | null>(null);

  return (
    <div className="mt-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <form
          action="/dashboard/lender"
          className="flex w-full max-w-lg gap-2"
        >
          <span className="sr-only">Search loans</span>
          <div className="flex h-10 min-w-0 flex-1 items-center rounded-md border border-[#cfd8e3] bg-white px-3 transition focus-within:border-[#1d4ed8] focus-within:ring-2 focus-within:ring-[#dbeafe]">
            <Search
              aria-hidden="true"
              className="mr-2 shrink-0 text-[#657386]"
              size={18}
            />
            <input
              className="h-full min-w-0 flex-1 border-0 bg-transparent text-sm outline-none"
              defaultValue={query}
              name="q"
              placeholder="Borrower name or contact number"
            />
          </div>
          <button
            className="h-10 rounded-md bg-[#15191f] px-4 text-sm font-semibold text-white transition hover:bg-[#2d3745]"
            type="submit"
          >
            Search
          </button>
        </form>
        <DateRangeCsvExport
          exportOptions={[
            { label: "Export payments", path: "/api/exports/payments" },
            { label: "Export borrowers", path: "/api/exports/borrowers" },
          ]}
          dateKey="date"
          filenamePrefix="mortgagepro_dashboard"
        />
      </div>

      <section className="rounded-lg border border-[#dfe5ec] bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dfe5ec] px-5 py-4">
          <h2 className="text-lg font-semibold">Loans list</h2>
          <p className="text-sm text-[#657386]">
            {loans.length} of {pageInfo.total} shown
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <thead className="bg-[#f8fafc] text-[#657386]">
              <tr>
                <th className="px-5 py-3 font-semibold">Borrower</th>
                <th className="px-5 py-3 font-semibold">Contact</th>
                <th className="px-5 py-3 font-semibold">Amount</th>
                <th className="px-5 py-3 font-semibold">Total paid</th>
                <th className="px-5 py-3 font-semibold">Remaining</th>
                <th className="px-5 py-3 font-semibold">Daily payment</th>
                <th className="px-5 py-3 font-semibold">Stage</th>
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
                  <td className="px-5 py-4 font-medium">{loan.borrower}</td>
                  <td className="px-5 py-4 text-[#657386]">
                    {loan.borrowerContact || "No contact"}
                  </td>
                  <td className="px-5 py-4">{loan.amount}</td>
                  <td className="px-5 py-4">{loan.totalPaid}</td>
                  <td className="px-5 py-4">{loan.remainingAmount}</td>
                  <td className="px-5 py-4">{loan.dailyPayment}</td>
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
                  <td className="px-5 py-6 text-[#657386]" colSpan={8}>
                    No loans match that search.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <PaginationControls
          basePath="/dashboard/lender"
          pageInfo={pageInfo}
          query={query ? { q: query } : undefined}
        />
      </section>

      {selectedLoan ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setSelectedLoan(null)}
        >
          <section
            className="max-h-[calc(100vh-48px)] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl"
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
            <div className="p-6">
              <dl className="grid gap-4 sm:grid-cols-2">
                <Detail label="Borrower" value={selectedLoan.borrower} />
                <Detail
                  label="Contact"
                  value={selectedLoan.borrowerContact || "No contact"}
                />
                <Detail label="Status" value={selectedLoan.status} />
                <Detail label="Amount" value={selectedLoan.amount} />
                <Detail label="Total paid" value={selectedLoan.totalPaid} />
                <Detail
                  label="Remaining"
                  value={selectedLoan.remainingAmount}
                />
                <Detail
                  label="Daily payment"
                  value={selectedLoan.dailyPayment}
                />
                <Detail label="End date" value={selectedLoan.endDate} />
              </dl>
              <LoanQrPanel loanId={selectedLoan.id} />
              <LoanPaymentsPanel loanId={selectedLoan.id} />
            </div>
          </section>
        </div>
      ) : null}
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
