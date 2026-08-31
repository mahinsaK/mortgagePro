"use client";

import { useMemo, useState } from "react";
import type { PaymentRow } from "@/backend/services/lending-service";
import { CsvExportButton } from "@/frontend/components/export/csv-export-button";
import { LocalTimestamp } from "@/frontend/components/ui/local-timestamp";
import { DailyCollectionsDateFilter } from "@/frontend/components/payments/daily-collections-date-filter";
import { DeletePaymentButton } from "@/frontend/components/payments/delete-payment-button";

export function DailyCollectionsTable({
  payments,
  selectedDate,
}: {
  payments: PaymentRow[];
  selectedDate: string;
}) {
  const [collector, setCollector] = useState("");
  const collectors = useMemo(
    () =>
      Array.from(
        new Set(
          payments
            .map((payment) => payment.collectorName)
            .filter((collectorName) => collectorName && collectorName !== "Unknown collector"),
        ),
      ).sort((first, second) => first.localeCompare(second)),
    [payments],
  );
  const filteredPayments = useMemo(
    () =>
      collector
        ? payments.filter((payment) => payment.collectorName === collector)
        : payments,
    [collector, payments],
  );
  const exportRows = filteredPayments.map((payment) => ({
    payment_id: payment.id,
    date: payment.rawDate,
    collected_at: payment.recordedAt,
    borrower: payment.borrowerName,
    loan_id: payment.loanId,
    collector: payment.collectorName,
    amount: payment.amount,
    method: payment.method,
  }));
  const filename = collector
    ? `daily_collections_${selectedDate}_${toFilePart(collector)}.csv`
    : `daily_collections_${selectedDate}.csv`;

  return (
    <section className="rounded-lg border border-[#dfe5ec] bg-white shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#dfe5ec] px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold">Collection details</h2>
          <p className="mt-1 text-sm text-[#657386]">
            Showing {filteredPayments.length} of {payments.length} payments
          </p>
        </div>
        <div className="grid w-full items-end gap-3 xl:w-auto xl:grid-cols-[auto_auto_auto]">
          <DailyCollectionsDateFilter selectedDate={selectedDate} />
          <label className="min-w-0 flex-1 text-sm font-medium text-[#2d3745] sm:flex-none">
            Collector
            <select
              className="mt-2 h-10 w-full rounded-md border border-[#cfd8e3] bg-white px-3 text-sm outline-none transition focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#dbeafe] sm:min-w-48"
              onChange={(event) => setCollector(event.target.value)}
              value={collector}
            >
              <option value="">All collectors</option>
              {collectors.map((collectorName) => (
                <option key={collectorName} value={collectorName}>
                  {collectorName}
                </option>
              ))}
            </select>
          </label>
          <CsvExportButton filename={filename} rows={exportRows} />
        </div>
      </div>
      <div className="divide-y divide-[#eef2f6] md:hidden">
        {filteredPayments.map((payment) => (
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
              <DeletePaymentButton paymentId={payment.id} />
            </div>
          </article>
        ))}
        {filteredPayments.length === 0 ? (
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
            {filteredPayments.map((payment) => (
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
                    <DeletePaymentButton paymentId={payment.id} />
                  </div>
                </td>
              </tr>
            ))}
            {filteredPayments.length === 0 ? (
              <tr className="border-t border-[#eef2f6]">
                <td className="px-5 py-6 text-[#657386]" colSpan={6}>
                  No collections found for this filter.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function toFilePart(value: string) {
  return value
    .trim()
    .replaceAll(/[^a-z0-9]+/gi, "_")
    .replaceAll(/^_+|_+$/g, "");
}
