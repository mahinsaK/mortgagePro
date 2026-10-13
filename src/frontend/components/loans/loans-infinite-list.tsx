"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import type { LoanAttentionFilter, LoanRow, PageInfo } from "@/backend/services/lending-service";
import { InfiniteScrollStatus } from "@/frontend/components/ui/infinite-scroll-status";
import { infiniteQueryKeys } from "@/frontend/lib/infinite-query-keys";
import { LoansTable } from "./loans-table";

type LoansPage = { items: LoanRow[]; pageInfo: PageInfo };

/** Appends tenant-scoped loan pages as the user approaches the list end. */
export function LoansInfiniteList({
  asOf,
  attention,
  initialPage,
}: {
  asOf?: string;
  attention?: LoanAttentionFilter;
  initialPage: LoansPage;
}) {
  const result = useInfiniteQuery({
    queryKey: infiniteQueryKeys.loans(attention ?? "", asOf ?? ""),
    queryFn: ({ pageParam, signal }) => fetchLoansPage({ asOf, attention, page: pageParam, signal }),
    initialData: { pages: [initialPage], pageParams: [1] },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pageInfo.page < lastPage.pageInfo.totalPages
        ? lastPage.pageInfo.page + 1
        : undefined,
  });
  const loans = useMemo(
    () => uniqueLoans(result.data?.pages.flatMap((page) => page.items) ?? []),
    [result.data],
  );
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = result;
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <>
      {result.isError && loans.length === 0 ? (
        <ListError label="Loans" retry={() => void result.refetch()} />
      ) : (
        <LoansTable loans={loans} />
      )}
      {result.isError && loans.length > 0 ? (
        <ListError label="More loans" retry={() => void result.fetchNextPage()} />
      ) : null}
      <InfiniteScrollStatus
        hasMore={Boolean(result.hasNextPage)}
        isLoading={result.isFetchingNextPage}
        itemCount={loans.length}
        loadMore={loadMore}
        noMoreLabel="No more loans"
      />
    </>
  );
}

/** Displays a recoverable list-loading error without discarding loaded rows. */
function ListError({ label, retry }: { label: string; retry: () => void }) {
  return (
    <div className="p-5 text-sm text-[#b91c1c]" role="alert">
      <p>{label} could not be loaded.</p>
      <button className="mt-2 font-semibold underline" onClick={retry} type="button">Try again</button>
    </div>
  );
}

/** Fetches an abortable page of loans. */
async function fetchLoansPage({ asOf, attention, page, signal }: {
  asOf?: string;
  attention?: LoanAttentionFilter;
  page: number;
  signal: AbortSignal;
}) {
  const params = new URLSearchParams({ page: String(page) });
  if (asOf) params.set("asOf", asOf);
  if (attention) params.set("attention", attention);
  const response = await fetch(`/api/loans?${params}`, { signal });
  if (!response.ok) throw new Error("Loans request failed.");
  return response.json() as Promise<LoansPage>;
}

/** Deduplicates records that move between pages during concurrent updates. */
function uniqueLoans(loans: LoanRow[]) {
  return Array.from(new Map(loans.map((loan) => [loan.id, loan])).values());
}
