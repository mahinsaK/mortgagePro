"use client";

import { Search } from "lucide-react";
import { DateRangeCsvExport } from "@/frontend/components/export/csv-export-button";
import { PaginationControls } from "@/frontend/components/ui/pagination-controls";

type DashboardLoan = {
  id: string;
  borrower: string;
  borrowerContact: string;
  borrowerPhone: string;
  amount: string;
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
  return (
    <div className="mt-6">
      <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="flex min-h-32 rounded-lg border border-[#dfe5ec] bg-white p-5 shadow-sm">
          <div className="flex w-full flex-col justify-between">
            <div>
              <p className="text-sm font-medium text-[#657386]">Search</p>
              <h2 className="mt-1 text-lg font-semibold">Find loan</h2>
            </div>
            <form className="mt-2 flex gap-2" action="/dashboard/lender">
              <span className="sr-only">Search loans</span>
              <div className="flex h-10 flex-1 items-center rounded-md border border-[#cfd8e3] bg-white px-3 transition focus-within:border-[#1d4ed8] focus-within:ring-2 focus-within:ring-[#dbeafe]">
                <Search
                  aria-hidden="true"
                  className="mr-2 shrink-0 text-[#657386]"
                  size={18}
                />
                <input
                  defaultValue={query}
                  className="h-full w-full border-0 bg-transparent text-sm outline-none"
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
          </div>
        </section>

        <section className="flex min-h-32 rounded-lg border border-[#dfe5ec] bg-white p-5 shadow-sm">
          <div className="flex w-full flex-col justify-between">
            <div>
              <p className="text-sm font-medium text-[#657386]">Export</p>
              <h2 className="mt-1 text-lg font-semibold">Payment data</h2>
            </div>
            <DateRangeCsvExport
              exportPath="/api/exports/payments"
              dateKey="date"
              filenamePrefix="mortgagepro_payments"
            />
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-[#dfe5ec] bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dfe5ec] px-5 py-4">
          <h2 className="text-lg font-semibold">Loans list</h2>
          <p className="text-sm text-[#657386]">
            {loans.length} of {pageInfo.total} shown
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] border-collapse text-left text-sm">
            <thead className="bg-[#f8fafc] text-[#657386]">
              <tr>
                <th className="px-5 py-3 font-semibold">Borrower</th>
                <th className="px-5 py-3 font-semibold">Contact</th>
                <th className="px-5 py-3 font-semibold">Amount</th>
                <th className="px-5 py-3 font-semibold">Daily payment</th>
                <th className="px-5 py-3 font-semibold">Stage</th>
                <th className="px-5 py-3 font-semibold">End date</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((loan) => (
                <tr className="border-t border-[#eef2f6]" key={loan.id}>
                  <td className="px-5 py-4 font-medium">{loan.borrower}</td>
                  <td className="px-5 py-4 text-[#657386]">
                    {loan.borrowerContact || "No contact"}
                  </td>
                  <td className="px-5 py-4">{loan.amount}</td>
                  <td className="px-5 py-4">{loan.dailyPayment}</td>
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
                  <td className="px-5 py-6 text-[#657386]" colSpan={6}>
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
    </div>
  );
}
