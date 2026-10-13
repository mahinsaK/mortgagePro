"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import type { LoanRow, PageInfo } from "@/backend/services/lending-service";
import { InfiniteScrollStatus } from "@/frontend/components/ui/infinite-scroll-status";
import { infiniteQueryKeys } from "@/frontend/lib/infinite-query-keys";
import { BorrowerLoansGrid } from "./borrower-loans-grid";

type LoansPage = { items: LoanRow[]; pageInfo: PageInfo };

/** Appends a borrower's loan cards while preserving the active status filter. */
export function BorrowerLoansInfiniteGrid({ borrowerId, initialPage, status }: {
  borrowerId: string;
  initialPage: LoansPage;
  status?: string;
}) {
  const result = useInfiniteQuery({
    queryKey: infiniteQueryKeys.borrowerLoans(borrowerId, status ?? ""),
    queryFn: ({ pageParam, signal }) => fetchBorrowerLoans({ borrowerId, page: pageParam, signal, status }),
    initialData: { pages: [initialPage], pageParams: [1] },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.pageInfo.page < lastPage.pageInfo.totalPages ? lastPage.pageInfo.page + 1 : undefined,
  });
  const loans = useMemo(() => Array.from(new Map((result.data?.pages.flatMap((page) => page.items) ?? []).map((loan) => [loan.id, loan])).values()), [result.data]);
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = result;
  const loadMore = useCallback(() => { if (hasNextPage && !isFetchingNextPage) void fetchNextPage(); }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return <><BorrowerLoansGrid loans={loans} />{result.isError ? <p className="mt-3 text-sm text-[#b91c1c]" role="alert">More loans could not be loaded.</p> : null}<InfiniteScrollStatus hasMore={Boolean(result.hasNextPage)} isLoading={result.isFetchingNextPage} itemCount={loans.length} loadMore={loadMore} noMoreLabel="No more loans" /></>;
}

/** Fetches an abortable borrower-loan page. */
async function fetchBorrowerLoans({ borrowerId, page, signal, status }: { borrowerId: string; page: number; signal: AbortSignal; status?: string }) {
  const params = new URLSearchParams({ page: String(page) });
  if (status) params.set("status", status);
  const response = await fetch(`/api/borrowers/${encodeURIComponent(borrowerId)}/loans?${params}`, { signal });
  if (!response.ok) throw new Error("Borrower loans request failed.");
  return response.json() as Promise<LoansPage>;
}
