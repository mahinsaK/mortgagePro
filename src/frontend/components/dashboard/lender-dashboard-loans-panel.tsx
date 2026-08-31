"use client";

import Form from "next/form";
import { Search } from "lucide-react";
import { useState } from "react";
import type { DashboardLoan } from "@/backend/services/dashboard-service";
import { DashboardLoanDetailsDialog } from "@/frontend/components/dashboard/dashboard-loan-details-dialog";
import { DateRangeCsvExport } from "@/frontend/components/export/csv-export-button";
import { PaginationControls } from "@/frontend/components/ui/pagination-controls";
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
        <Form
          action="/dashboard/lender"
          className="flex w-full max-w-lg flex-col gap-2 min-[380px]:flex-row"
          scroll={false}
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
        </Form>
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
                    {loan.borrower}
                  </p>
                  <p className="mt-1 truncate text-sm text-[#657386]">
                    {loan.borrowerContact || "No contact"}
                  </p>
                </div>
                <span className="rounded-full bg-[#e0ecff] px-2.5 py-1 text-xs font-semibold text-[#1d4ed8]">
                  {loan.status}
                </span>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-[#f8fafc] p-3">
                <MobileDetail label="Amount" value={loan.amount} />
                <MobileDetail label="Remaining" value={loan.remainingAmount} />
                <MobileDetail label="Daily" value={loan.dailyPayment} />
                <MobileDetail label="End date" value={loan.endDate} />
              </dl>
            </button>
          ))}
          {loans.length === 0 ? (
            <p className="p-5 text-sm text-[#657386]">
              No loans match that search.
            </p>
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <table className="hidden w-full min-w-[980px] border-collapse text-left text-sm md:table">
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
        <DashboardLoanDetailsDialog
          loan={selectedLoan}
          onClose={() => setSelectedLoan(null)}
        />
      ) : null}
    </div>
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
