"use client";

import { LoaderCircle } from "lucide-react";
import { useEffect, useRef } from "react";

export function InfiniteScrollStatus({
  hasMore,
  isLoading,
  itemCount,
  loadMore,
  noMoreLabel,
}: {
  hasMore: boolean;
  isLoading: boolean;
  itemCount: number;
  loadMore: () => void;
  noMoreLabel: string;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (!sentinel || !hasMore || isLoading) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "400px 0px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoading, loadMore]);

  return (
    <div
      className="flex min-h-16 items-center justify-center border-t border-[#eef2f6] px-4 py-4 text-sm text-[#657386]"
      ref={sentinelRef}
    >
      {isLoading ? (
        <p className="flex items-center gap-2" role="status">
          <LoaderCircle
            aria-hidden="true"
            className="animate-spin text-[#2563eb]"
            size={17}
          />
          Loading more…
        </p>
      ) : !hasMore && itemCount > 0 ? (
        <p>{noMoreLabel}</p>
      ) : null}
    </div>
  );
}
