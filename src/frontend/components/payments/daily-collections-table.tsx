"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Download, LoaderCircle } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import type {
  DailyCollectionCollector,
  PageInfo,
  PaymentRow,
} from "@/backend/services/lending-service";
import { DailyCollectionsDateFilter } from "@/frontend/components/payments/daily-collections-date-filter";
import { DeletePaymentButton } from "@/frontend/components/payments/delete-payment-button";
import { InfiniteScrollStatus } from "@/frontend/components/ui/infinite-scroll-status";
import { LocalTimestamp } from "@/frontend/components/ui/local-timestamp";
import { infiniteQueryKeys } from "@/frontend/lib/infinite-query-keys";

type DailyPaymentsPage = {
  items: PaymentRow[];
  pageInfo: PageInfo;
};

export function DailyCollectionsTable({
  collectors,
  initialPage,
  selectedDate,
}: {
  collectors: DailyCollectionCollector[];
  initialPage: DailyPaymentsPage;
  selectedDate: string;
}) {
  const [collectorId, setCollectorId] = useState("");
  const queryClient = useQueryClient();
  const queryKey = infiniteQueryKeys.dailyCollections(selectedDate, collectorId);
  const result = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam, signal }) =>
      fetchDailyPayments({
        collectorId,
        date: selectedDate,
        page: pageParam,
        signal,
      }),
    initialData: collectorId
      ? undefined
      : { pages: [initialPage], pageParams: [1] },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pageInfo.page < lastPage.pageInfo.totalPages
        ? lastPage.pageInfo.page + 1
        : undefined,
  });
  const payments = useMemo(
    () => uniquePayments(result.data?.pages.flatMap((page) => page.items) ?? []),
    [result.data],
  );
  const total = result.data?.pages[0]?.pageInfo.total ?? 0;
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = result;
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);
  const selectedCollector = collectors.find(
    (collector) => collector.id === collectorId,
  );

  return (
    <section className="rounded-lg border border-[#dfe5ec] bg-white shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#dfe5ec] px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold">Collection details</h2>
          <p className="mt-1 text-sm text-[#657386]">
            {result.isPending
              ? "Loading collections…"
              : `Showing ${payments.length} of ${total} payments`}
          </p>
        </div>
        <div className="grid w-full items-end gap-3 xl:w-auto xl:grid-cols-[auto_auto_auto]">
          <DailyCollectionsDateFilter selectedDate={selectedDate} />
          <label className="min-w-0 flex-1 text-sm font-medium text-[#2d3745] sm:flex-none">
            Collector
            <select
              className="mt-2 h-10 w-full rounded-md border border-[#cfd8e3] bg-white px-3 text-sm outline-none transition focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#dbeafe] sm:min-w-48"
              onChange={(event) => setCollectorId(event.target.value)}
              value={collectorId}
            >
              <option value="">All collectors</option>
              {collectors.map((collector) => (
                <option key={collector.id} value={collector.id}>
                  {collector.name}
                </option>
              ))}
            </select>
          </label>
          <DailyCollectionsExportLink
            collectorId={collectorId}
            collectorName={selectedCollector?.name}
            disabled={total === 0}
            selectedDate={selectedDate}
          />
        </div>
      </div>

      {result.isPending ? (
        <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-[#657386]" role="status">
          <LoaderCircle aria-hidden="true" className="animate-spin text-[#2563eb]" size={18} />
          Loading collections…
        </div>
      ) : result.isError ? (
        <div className="p-5 text-sm text-[#b91c1c]" role="alert">
          <p>Daily collections could not be loaded.</p>
          <button
            className="mt-3 font-semibold underline underline-offset-4"
            onClick={() => void result.refetch()}
            type="button"
          >
            Try again
          </button>
        </div>
      ) : (
        <PaymentsRows
          onDeleted={() => queryClient.invalidateQueries({ queryKey })}
          payments={payments}
        />
      )}

      {!result.isPending && !result.isError ? (
        <InfiniteScrollStatus
          hasMore={Boolean(result.hasNextPage)}
          isLoading={result.isFetchingNextPage}
          itemCount={payments.length}
          loadMore={loadMore}
          noMoreLabel="No more payments"
        />
      ) : null}
    </section>
  );
}

function PaymentsRows({
  onDeleted,
  payments,
}: {
  onDeleted: () => void | Promise<void>;
  payments: PaymentRow[];
}) {
  return (
    <>
      <div className="divide-y divide-[#eef2f6] md:hidden">
        {payments.map((payment) => (
          <article className="p-4" key={payment.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold">
                  {payment.borrowerName}
                </p>
                <p className="mt-1 truncate text-sm text-[#657386]">
                  {payment.collectorName}
                </p>
              </div>
              <p className="shrink-0 font-semibold">{payment.amount}</p>
            </div>
            <div className="mt-4 flex items-center justify-between rounded-lg bg-[#f8fafc] p-3">
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-[#e0ecff] px-2.5 py-1 text-xs font-semibold text-[#1d4ed8]">
                  {payment.method}
                </span>
                <span className="text-sm text-[#657386]">
                  <LocalTimestamp timeOnly value={payment.recordedAt} />
                </span>
              </div>
              <DeletePaymentButton onDeleted={onDeleted} paymentId={payment.id} />
            </div>
          </article>
        ))}
        {payments.length === 0 ? (
          <p className="p-5 text-sm text-[#657386]">
            No collections found for this filter.
          </p>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <table className="hidden w-full min-w-[680px] border-collapse text-left text-sm md:table">
          <thead className="bg-[#f8fafc] text-[#657386]">
            <tr>
              <th className="px-5 py-3 font-semibold">Borrower</th>
              <th className="px-5 py-3 font-semibold">Collector</th>
              <th className="px-5 py-3 font-semibold">Amount</th>
              <th className="px-5 py-3 font-semibold">Method</th>
              <th className="px-5 py-3 font-semibold">Time</th>
              <th className="px-5 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr className="border-t border-[#eef2f6]" key={payment.id}>
                <td className="px-5 py-4">{payment.borrowerName}</td>
                <td className="px-5 py-4">{payment.collectorName}</td>
                <td className="px-5 py-4">{payment.amount}</td>
                <td className="px-5 py-4">
                  <span className="rounded-full bg-[#e0ecff] px-3 py-1 text-[13px] font-semibold text-[#1d4ed8]">
                    {payment.method}
                  </span>
                </td>
                <td className="px-5 py-4 text-[#657386]">
                  <LocalTimestamp timeOnly value={payment.recordedAt} />
                </td>
                <td className="px-5 py-4">
                  <div className="flex justify-end">
                    <DeletePaymentButton onDeleted={onDeleted} paymentId={payment.id} />
                  </div>
                </td>
              </tr>
            ))}
            {payments.length === 0 ? (
              <tr className="border-t border-[#eef2f6]">
                <td className="px-5 py-6 text-[#657386]" colSpan={6}>
                  No collections found for this filter.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}

function DailyCollectionsExportLink({
  collectorId,
  collectorName,
  disabled,
  selectedDate,
}: {
  collectorId: string;
  collectorName?: string;
  disabled: boolean;
  selectedDate: string;
}) {
  const params = new URLSearchParams({ end: selectedDate, start: selectedDate });
  if (collectorId) params.set("collector", collectorId);
  const label = collectorName
    ? `Export ${collectorName}'s daily collections`
    : "Export daily collections";
  const className = "flex size-11 shrink-0 items-center justify-center rounded-full bg-[#15191f] text-white transition hover:bg-[#2d3745]";

  if (disabled) {
    return (
      <span
        aria-disabled="true"
        aria-label={label}
        className={`${className} cursor-not-allowed opacity-40`}
        role="link"
        title={label}
      >
        <Download aria-hidden="true" size={17} />
      </span>
    );
  }

  return (
    <a
      aria-label={label}
      className={className}
      href={`/api/exports/payments?${params}`}
      title={label}
    >
      <Download aria-hidden="true" size={17} />
    </a>
  );
}

async function fetchDailyPayments({
  collectorId,
  date,
  page,
  signal,
}: {
  collectorId: string;
  date: string;
  page: number;
  signal: AbortSignal;
}) {
  const params = new URLSearchParams({ date, page: String(page) });
  if (collectorId) params.set("collector", collectorId);

  const response = await fetch(`/api/payments/daily?${params}`, { signal });
  if (!response.ok) {
    throw new Error("Daily collections request failed.");
  }

  return response.json() as Promise<DailyPaymentsPage>;
}

function uniquePayments(payments: PaymentRow[]) {
  return Array.from(
    new Map(payments.map((payment) => [payment.id, payment])).values(),
  );
}
