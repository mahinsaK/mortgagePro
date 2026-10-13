"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { DashboardLoan } from "@/backend/services/dashboard-service";
import { DashboardLoanDetailsDialog } from "@/frontend/components/dashboard/dashboard-loan-details-dialog";
import { DateRangeCsvExport } from "@/frontend/components/export/csv-export-button";
import { InfiniteScrollStatus } from "@/frontend/components/ui/infinite-scroll-status";
import { infiniteQueryKeys } from "@/frontend/lib/infinite-query-keys";
type PageInfo = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

/** Provides searchable infinite loan loading for the lender dashboard. */
export function LenderDashboardLoansPanel({
  initialPage,
  initialQuery,
}: {
  initialPage: { items: DashboardLoan[]; pageInfo: PageInfo };
  initialQuery: string;
}) {
  const [selectedLoan, setSelectedLoan] = useState<DashboardLoan | null>(null);
  const [searchInput, setSearchInput] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    const timeout = window.setTimeout(
      () => setQuery(searchInput.trim().slice(0, 100)),
      300,
    );
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const result = useInfiniteQuery({
    queryKey: infiniteQueryKeys.dashboardLoans(query),
    queryFn: ({ pageParam, signal }) => fetchDashboardLoans(query, pageParam, signal),
    initialData: query === initialQuery
      ? { pages: [initialPage], pageParams: [1] }
      : undefined,
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pageInfo.page < lastPage.pageInfo.totalPages
        ? lastPage.pageInfo.page + 1
        : undefined,
  });
  const loans = useMemo(
    () => Array.from(new Map(
      (result.data?.pages.flatMap((page) => page.items) ?? []).map((loan) => [loan.id, loan]),
    ).values()),
    [result.data],
  );
  const total = result.data?.pages[0]?.pageInfo.total ?? 0;
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = result;
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <div className="mt-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex w-full max-w-lg gap-2">
          <span className="sr-only">Search loans</span>
          <div className="flex h-10 min-w-0 flex-1 items-center rounded-md border border-[#cfd8e3] bg-white px-3 transition focus-within:border-[#1d4ed8] focus-within:ring-2 focus-within:ring-[#dbeafe]">
            <Search
              aria-hidden="true"
              className="mr-2 shrink-0 text-[#657386]"
              size={18}
            />
            <input
              className="h-full min-w-0 flex-1 border-0 bg-transparent text-sm outline-none"
              maxLength={100}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Borrower name or contact number"
              type="search"
              value={searchInput}
            />
          </div>
          {searchInput ? (
            <button aria-label="Clear loan search" className="flex size-10 shrink-0 items-center justify-center rounded-md border border-[#cfd8e3]" onClick={() => { setSearchInput(""); setQuery(""); }} type="button"><X aria-hidden="true" size={16} /></button>
          ) : null}
        </div>
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
            {result.isPending ? "Searching…" : `${loans.length} of ${total} shown`}
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
        {result.isError ? (
          <div className="border-t border-[#eef2f6] p-4 text-sm text-[#b91c1c]" role="alert">
            More loans could not be loaded. <button className="font-semibold underline" onClick={() => void result.refetch()} type="button">Try again</button>
          </div>
        ) : null}
        <InfiniteScrollStatus hasMore={Boolean(result.hasNextPage)} isLoading={result.isFetchingNextPage} itemCount={loans.length} loadMore={loadMore} noMoreLabel="No more loans" />
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

/** Fetches an abortable dashboard loan page for the active search. */
async function fetchDashboardLoans(query: string, page: number, signal: AbortSignal) {
  const params = new URLSearchParams({ page: String(page) });
  if (query) params.set("q", query);
  const response = await fetch(`/api/dashboard/loans?${params}`, { signal });
  if (!response.ok) throw new Error("Dashboard loans request failed.");
  return response.json() as Promise<{ items: DashboardLoan[]; pageInfo: PageInfo }>;
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
