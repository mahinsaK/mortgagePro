"use client";

import { useMemo, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Download } from "lucide-react";

type CsvValue = string | number | boolean | null | undefined;
type CsvRow = Record<string, CsvValue>;

export function CsvExportButton({
  filename,
  rows,
  label = "Export CSV",
}: {
  filename: string;
  rows: CsvRow[];
  label?: string;
}) {
  return (
    <button
      className="h-10 rounded-md bg-[#15191f] px-4 text-sm font-semibold text-white transition hover:bg-[#2d3745] disabled:cursor-not-allowed disabled:bg-[#9aa6b2]"
      disabled={rows.length === 0}
      onClick={() => downloadCsv(filename, rows)}
      type="button"
    >
      {label}
    </button>
  );
}

export function DateRangeCsvExport({
  exportPath,
  filenamePrefix,
  rows = [],
  dateKey,
}: {
  exportPath?: string;
  filenamePrefix: string;
  rows?: CsvRow[];
  dateKey?: string;
}) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        if (!dateKey) {
          return true;
        }

        const date = toDateOnly(row[dateKey]);
        if (!date) {
          return false;
        }

        return (
          (!startDate || date >= startDate) && (!endDate || date <= endDate)
        );
      }),
    [dateKey, endDate, rows, startDate],
  );
  const suffix = [startDate || "start", endDate || "end"].join("_to_");
  const canExport = exportPath
    ? Boolean(startDate && endDate)
    : filteredRows.length > 0;

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          className="flex h-10 items-center gap-2 rounded-md bg-[#15191f] px-4 text-sm font-semibold text-white transition hover:bg-[#2d3745]"
          type="button"
        >
          <Download aria-hidden="true" size={17} />
          Export CSV
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          className="z-50 w-80 rounded-lg border border-[#dfe5ec] bg-white p-4 text-[#15191f] shadow-xl"
          sideOffset={10}
        >
          <div className="mb-4">
            <p className="text-sm font-medium text-[#657386]">Export CSV</p>
            <h2 className="mt-1 text-lg font-semibold">Select date range</h2>
          </div>
          <div className="grid gap-3">
            <label className="text-sm font-medium text-[#2d3745]">
              Start date
              <input
                className="mt-2 h-10 w-full rounded-md border border-[#cfd8e3] px-3 text-sm outline-none transition focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#dbeafe]"
                onChange={(event) => setStartDate(event.target.value)}
                type="date"
                value={startDate}
              />
            </label>
            <label className="text-sm font-medium text-[#2d3745]">
              End date
              <input
                className="mt-2 h-10 w-full rounded-md border border-[#cfd8e3] px-3 text-sm outline-none transition focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#dbeafe]"
                onChange={(event) => setEndDate(event.target.value)}
                type="date"
                value={endDate}
              />
            </label>
            <button
              className="h-10 rounded-md bg-[#15191f] px-4 text-sm font-semibold text-white transition hover:bg-[#2d3745] disabled:cursor-not-allowed disabled:bg-[#9aa6b2]"
              disabled={!canExport}
              onClick={() => {
                if (exportPath) {
                  window.location.href = buildExportHref(exportPath, startDate, endDate);
                  return;
                }

                downloadCsv(`${filenamePrefix}_${suffix}.csv`, filteredRows);
              }}
              type="button"
            >
              {exportPath ? "Export CSV" : `Export ${filteredRows.length} rows`}
            </button>
          </div>
          <Popover.Arrow className="fill-white" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function downloadCsv(filename: string, rows: CsvRow[]) {
  const csv = toCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function toCsv(rows: CsvRow[]) {
  const headers = Object.keys(rows[0] ?? {});
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeCell(row[header])).join(",")),
  ];

  return lines.join("\n");
}

function escapeCell(value: CsvValue) {
  const cell = String(value ?? "");
  return `"${cell.replaceAll('"', '""')}"`;
}

function toDateOnly(value: CsvValue) {
  const date = new Date(String(value ?? ""));

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function buildExportHref(path: string, startDate: string, endDate: string) {
  const params = new URLSearchParams();

  if (startDate) {
    params.set("start", startDate);
  }

  if (endDate) {
    params.set("end", endDate);
  }

  const query = params.toString();
  return query ? `${path}?${query}` : path;
}
