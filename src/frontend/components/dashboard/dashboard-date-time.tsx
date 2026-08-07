"use client";

import { CalendarDays, Clock3 } from "lucide-react";
import { useEffect, useState } from "react";

const TIME_ZONE = "Asia/Colombo";

export function DashboardDateTime({ initialIso }: { initialIso: string }) {
  const [now, setNow] = useState(() => new Date(initialIso));

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div
      aria-label="Current date and time"
      className="flex w-full items-center justify-between gap-4 rounded-lg border border-[#dfe5ec] bg-white px-4 py-3 shadow-sm sm:w-auto sm:min-w-72"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#eef4ff] text-[#1d4ed8]">
          <CalendarDays aria-hidden="true" size={18} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-[0.12em] text-[#657386]">
            {formatWeekday(now)}
          </p>
          <p className="mt-0.5 whitespace-nowrap text-sm font-medium text-[#2d3745]">
            {formatDate(now)}
          </p>
        </div>
      </div>
      <div className="border-l border-[#e7ebf0] pl-4 text-right">
        <p className="flex items-center justify-end gap-1.5 text-xs font-medium text-[#657386]">
          <Clock3 aria-hidden="true" size={13} /> Live
        </p>
        <time
          className="mt-0.5 block whitespace-nowrap font-mono text-lg font-semibold tabular-nums text-[#15191f]"
          dateTime={now.toISOString()}
        >
          {formatTime(now)}
        </time>
      </div>
    </div>
  );
}

function formatWeekday(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    weekday: "long",
  }).format(date);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    timeZone: TIME_ZONE,
    year: "numeric",
  }).format(date);
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZone: TIME_ZONE,
  }).format(date);
}
