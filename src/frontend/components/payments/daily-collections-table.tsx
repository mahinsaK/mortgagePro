"use client";

import { useMemo, useState } from "react";
import type { PaymentRow } from "@/backend/services/lending-service";
import { CsvExportButton } from "@/frontend/components/export/csv-export-button";

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
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm font-medium text-[#2d3745]">
            Collector
            <select
              className="mt-2 h-10 min-w-48 rounded-md border border-[#cfd8e3] bg-white px-3 text-sm outline-none transition focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#dbeafe]"
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
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse text-left text-sm">
          <thead className="bg-[#f8fafc] text-[#657386]">
            <tr>
              <th className="px-5 py-3 font-semibold">Borrower</th>
              <th className="px-5 py-3 font-semibold">Collector</th>
              <th className="px-5 py-3 font-semibold">Amount</th>
              <th className="px-5 py-3 font-semibold">Method</th>
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
              </tr>
            ))}
            {filteredPayments.length === 0 ? (
              <tr className="border-t border-[#eef2f6]">
                <td className="px-5 py-6 text-[#657386]" colSpan={4}>
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
