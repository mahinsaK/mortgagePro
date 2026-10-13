"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import type { PageInfo, PaymentRow } from "@/backend/services/lending-service";
import { InfiniteScrollStatus } from "@/frontend/components/ui/infinite-scroll-status";
import { infiniteQueryKeys } from "@/frontend/lib/infinite-query-keys";
import { PaymentsTable } from "./payments-table";

type PaymentsPage = { items: PaymentRow[]; pageInfo: PageInfo };

/** Appends payment-history pages and refreshes them after deletion. */
export function PaymentsInfiniteList({ initialPage }: { initialPage: PaymentsPage }) {
  const queryClient = useQueryClient();
  const queryKey = infiniteQueryKeys.payments();
  const result = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam, signal }) => fetchPaymentsPage(pageParam, signal),
    initialData: { pages: [initialPage], pageParams: [1] },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pageInfo.page < lastPage.pageInfo.totalPages
        ? lastPage.pageInfo.page + 1
        : undefined,
  });
  const payments = useMemo(
    () => Array.from(new Map(
      (result.data?.pages.flatMap((page) => page.items) ?? []).map((payment) => [payment.id, payment]),
    ).values()),
    [result.data],
  );
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = result;
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <>
      <PaymentsTable
        onDeleted={() => queryClient.invalidateQueries({ queryKey })}
        payments={payments}
      />
      {result.isError ? (
        <div className="p-5 text-sm text-[#b91c1c]" role="alert">
          Payments could not be loaded. <button className="font-semibold underline" onClick={() => void result.refetch()} type="button">Try again</button>
        </div>
      ) : null}
      <InfiniteScrollStatus hasMore={Boolean(result.hasNextPage)} isLoading={result.isFetchingNextPage} itemCount={payments.length} loadMore={loadMore} noMoreLabel="No more payments" />
    </>
  );
}

/** Fetches an abortable payment-history page. */
async function fetchPaymentsPage(page: number, signal: AbortSignal) {
  const response = await fetch(`/api/payments?page=${page}`, { signal });
  if (!response.ok) throw new Error("Payments request failed.");
  return response.json() as Promise<PaymentsPage>;
}
