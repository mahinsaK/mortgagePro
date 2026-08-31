"use client";

import { useMemo, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Download } from "lucide-react";
import { DatePicker } from "@/frontend/components/forms/date-picker";

type CsvValue = string | number | boolean | null | undefined;
type CsvRow = Record<string, CsvValue>;
type ExportOption = {
  label: string;
  path: string;
};

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
      aria-label={label}
      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#15191f] text-white transition hover:bg-[#2d3745] disabled:cursor-not-allowed disabled:bg-[#9aa6b2]"
      disabled={rows.length === 0}
      onClick={() => downloadCsv(filename, rows)}
      title={label}
      type="button"
    >
      <Download aria-hidden="true" size={17} />
      <span className="sr-only">{label}</span>
    </button>
  );
}

export function DateRangeCsvExport({
  exportPath,
  exportOptions,
  filenamePrefix,
  rows = [],
  dateKey,
}: {
  exportPath?: string;
  exportOptions?: ExportOption[];
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
  const serverExportOptions = exportOptions ?? (
    exportPath ? [{ label: "Export CSV", path: exportPath }] : []
  );
  const canExport = serverExportOptions.length > 0
    ? Boolean(startDate && endDate)
    : filteredRows.length > 0;

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          aria-label="Export CSV"
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#15191f] text-white shadow-sm transition hover:bg-[#2d3745]"
          title="Export CSV"
          type="button"
        >
          <Download aria-hidden="true" size={16} />
          <span className="sr-only">Export CSV</span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          className="z-50 w-[min(20rem,calc(100vw-2rem))] rounded-lg border border-[#dfe5ec] bg-white p-4 text-[#15191f] shadow-xl"
          sideOffset={10}
        >
          <div className="mb-4">
            <p className="text-sm font-medium text-[#657386]">Export CSV</p>
            <h2 className="mt-1 text-lg font-semibold">Select date range</h2>
          </div>
          <div className="grid gap-3">
            <DatePicker
              label="Start date"
              max={endDate || undefined}
              name="export_start_date"
              onChange={setStartDate}
              value={startDate}
            />
            <DatePicker
              label="End date"
              min={startDate || undefined}
              name="export_end_date"
              onChange={setEndDate}
              value={endDate}
            />
            {serverExportOptions.length > 0 ? (
              <div className="grid gap-2">
                {serverExportOptions.map((option) => (
                  <button
                    className="h-10 rounded-md bg-[#15191f] px-4 text-sm font-semibold text-white transition hover:bg-[#2d3745] disabled:cursor-not-allowed disabled:bg-[#9aa6b2]"
                    disabled={!canExport}
                    key={option.path}
                    onClick={() => {
                      window.location.href = buildExportHref(
                        option.path,
                        startDate,
                        endDate,
                      );
                    }}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : (
              <button
                className="h-10 rounded-md bg-[#15191f] px-4 text-sm font-semibold text-white transition hover:bg-[#2d3745] disabled:cursor-not-allowed disabled:bg-[#9aa6b2]"
                disabled={!canExport}
                onClick={() => {
                  downloadCsv(`${filenamePrefix}_${suffix}.csv`, filteredRows);
                }}
                type="button"
              >
                Export {filteredRows.length} rows
              </button>
            )}
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
