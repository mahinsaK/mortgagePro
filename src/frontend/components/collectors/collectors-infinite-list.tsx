"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import type { CollectorRow, PageInfo } from "@/backend/services/lending-service";
import { InfiniteScrollStatus } from "@/frontend/components/ui/infinite-scroll-status";
import { infiniteQueryKeys } from "@/frontend/lib/infinite-query-keys";
import { CollectorsTable } from "./collectors-table";

type CollectorsPage = { items: CollectorRow[]; pageInfo: PageInfo };

/** Appends collector pages as the user approaches the directory end. */
export function CollectorsInfiniteList({ initialPage }: { initialPage: CollectorsPage }) {
  const result = useInfiniteQuery({
    queryKey: infiniteQueryKeys.collectors(),
    queryFn: ({ pageParam, signal }) => fetchCollectorsPage(pageParam, signal),
    initialData: { pages: [initialPage], pageParams: [1] },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.pageInfo.page < lastPage.pageInfo.totalPages ? lastPage.pageInfo.page + 1 : undefined,
  });
  const collectors = useMemo(
    () => Array.from(new Map((result.data?.pages.flatMap((page) => page.items) ?? []).map((collector) => [collector.id, collector])).values()),
    [result.data],
  );
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = result;
  const loadMore = useCallback(() => { if (hasNextPage && !isFetchingNextPage) void fetchNextPage(); }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return <><CollectorsTable collectors={collectors} />{result.isError ? <p className="p-5 text-sm text-[#b91c1c]" role="alert">Collectors could not be loaded.</p> : null}<InfiniteScrollStatus hasMore={Boolean(result.hasNextPage)} isLoading={result.isFetchingNextPage} itemCount={collectors.length} loadMore={loadMore} noMoreLabel="No more collectors" /></>;
}

/** Fetches an abortable collector page. */
async function fetchCollectorsPage(page: number, signal: AbortSignal) {
  const response = await fetch(`/api/collectors?page=${page}`, { signal });
  if (!response.ok) throw new Error("Collectors request failed.");
  return response.json() as Promise<CollectorsPage>;
}
