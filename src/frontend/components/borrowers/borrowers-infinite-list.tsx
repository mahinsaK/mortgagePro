"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { LoaderCircle, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  BorrowerAttentionFilter,
  BorrowerRow,
  PageInfo,
} from "@/backend/services/lending-service";
import { InfiniteScrollStatus } from "@/frontend/components/ui/infinite-scroll-status";
import { infiniteQueryKeys } from "@/frontend/lib/infinite-query-keys";
import { BorrowersTable } from "./borrowers-table";

type BorrowersPage = {
  items: BorrowerRow[];
  pageInfo: PageInfo;
};

/** Displays searchable borrower results and appends pages near the list end. */
export function BorrowersInfiniteList({
  attention,
  initialPage,
  initialQuery,
}: {
  attention?: BorrowerAttentionFilter;
  initialPage: BorrowersPage;
  initialQuery: string;
}) {
  const [searchInput, setSearchInput] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const attentionKey = attention ?? "";

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setQuery(searchInput.trim().slice(0, 100));
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const result = useInfiniteQuery({
    queryKey: infiniteQueryKeys.borrowers(query, attentionKey),
    queryFn: ({ pageParam, signal }) =>
      fetchBorrowersPage({
        attention,
        page: pageParam,
        query,
        signal,
      }),
    initialData: query === initialQuery
      ? { pages: [initialPage], pageParams: [1] }
      : undefined,
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pageInfo.page < lastPage.pageInfo.totalPages
        ? lastPage.pageInfo.page + 1
        : undefined,
  });
  const borrowers = useMemo(
    () => uniqueBorrowers(result.data?.pages.flatMap((page) => page.items) ?? []),
    [result.data],
  );
  const total = result.data?.pages[0]?.pageInfo.total ?? 0;
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = result;
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <section className="rounded-lg border border-[#dfe5ec] bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-[#dfe5ec] px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Borrowers list</h2>
          <p className="mt-1 text-sm text-[#657386]">
            {result.isPending
              ? "Searching borrowers…"
              : `${total} result${total === 1 ? "" : "s"} · ${borrowers.length} loaded`}
          </p>
        </div>
        <div className="flex w-full max-w-xl items-center gap-2">
          <label className="flex h-11 min-w-0 flex-1 items-center rounded-md border border-[#cfd8e3] bg-white px-3 transition focus-within:border-[#1d4ed8] focus-within:ring-2 focus-within:ring-[#dbeafe]">
            <Search
              aria-hidden="true"
              className="mr-2 shrink-0 text-[#657386]"
              size={18}
            />
            <span className="sr-only">Search borrowers</span>
            <input
              className="h-full min-w-0 flex-1 border-0 bg-transparent text-base outline-none sm:text-sm"
              maxLength={100}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Name, business, phone or address"
              type="search"
              value={searchInput}
            />
          </label>
          {searchInput ? (
            <button
              aria-label="Clear borrower search"
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-md border border-[#cfd8e3] text-[#526174] transition hover:bg-[#f8fafc]"
              onClick={() => {
                setSearchInput("");
                setQuery("");
              }}
              title="Clear search"
              type="button"
            >
              <X aria-hidden="true" size={16} />
            </button>
          ) : null}
        </div>
      </div>

      {result.isPending ? (
        <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-[#657386]" role="status">
          <LoaderCircle aria-hidden="true" className="animate-spin text-[#2563eb]" size={18} />
          Loading borrowers…
        </div>
      ) : result.isError ? (
        <div className="p-5 text-sm text-[#b91c1c]" role="alert">
          <p>Borrowers could not be loaded.</p>
          <button
            className="mt-3 font-semibold underline underline-offset-4"
            onClick={() => void result.refetch()}
            type="button"
          >
            Try again
          </button>
        </div>
      ) : (
        <BorrowersTable borrowers={borrowers} />
      )}

      {!result.isPending && !result.isError ? (
        <InfiniteScrollStatus
          hasMore={Boolean(result.hasNextPage)}
          isLoading={result.isFetchingNextPage}
          itemCount={borrowers.length}
          loadMore={loadMore}
          noMoreLabel="No more borrowers"
        />
      ) : null}
    </section>
  );
}

/** Fetches an abortable borrower page from the authenticated route. */
async function fetchBorrowersPage({
  attention,
  page,
  query,
  signal,
}: {
  attention?: BorrowerAttentionFilter;
  page: number;
  query: string;
  signal: AbortSignal;
}) {
  const params = new URLSearchParams({ page: String(page) });
  if (query) params.set("q", query);
  if (attention) params.set("attention", attention);

  const response = await fetch(`/api/borrowers?${params}`, { signal });
  if (!response.ok) {
    throw new Error("Borrowers request failed.");
  }

  return response.json() as Promise<BorrowersPage>;
}

/** Removes duplicate borrower records while preserving their first position. */
function uniqueBorrowers(borrowers: BorrowerRow[]) {
  return Array.from(
    new Map(borrowers.map((borrower) => [borrower.id, borrower])).values(),
  );
}
