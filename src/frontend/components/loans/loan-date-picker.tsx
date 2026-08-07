"use client";

import * as Popover from "@radix-ui/react-popover";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useId, useMemo, useState } from "react";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function LoanDatePicker({
  label,
  min,
  name,
  onChange,
  value,
}: {
  label: string;
  min?: string;
  name: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const labelId = useId();
  const selectedDate = value ? parseDateOnly(value) : null;
  const [visibleMonth, setVisibleMonth] = useState(
    () => selectedDate ?? parseDateOnly(min ?? toDateOnly(new Date())),
  );
  const [open, setOpen] = useState(false);
  const days = useMemo(() => calendarDays(visibleMonth), [visibleMonth]);

  function selectDate(date: Date) {
    const nextValue = toDateOnly(date);
    if (min && nextValue < min) return;
    onChange(nextValue);
    setVisibleMonth(date);
    setOpen(false);
  }

  return (
    <div className="text-sm font-medium text-[#2d3745]">
      <span id={labelId}>{label}</span>
      <input name={name} type="hidden" value={value} />
      <Popover.Root
        onOpenChange={(nextOpen) => {
          if (nextOpen && value) setVisibleMonth(parseDateOnly(value));
          setOpen(nextOpen);
        }}
        open={open}
      >
        <Popover.Trigger asChild>
          <button
            className="mt-2 flex h-11 w-full items-center justify-between rounded-md border border-[#cfd8e3] bg-white px-3 text-left text-sm outline-none transition hover:bg-[#f8fafc] focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#dbeafe]"
            aria-labelledby={labelId}
            type="button"
          >
            <span className={value ? "text-[#15191f]" : "text-[#8793a2]"}>
              {value ? formatDate(value) : "Choose date"}
            </span>
            <CalendarDays aria-hidden="true" className="text-[#657386]" size={17} />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="start"
            className="z-[70] w-[min(340px,calc(100vw-32px))] rounded-xl border border-[#dfe5ec] bg-white p-4 text-[#15191f] shadow-2xl"
            sideOffset={8}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <button
                aria-label="Previous month"
                className="flex size-10 items-center justify-center rounded-md border border-[#dfe5ec] transition hover:bg-[#f8fafc]"
                onClick={() => setVisibleMonth(changeMonth(visibleMonth, -1))}
                type="button"
              >
                <ChevronLeft aria-hidden="true" size={18} />
              </button>
              <p className="text-base font-semibold">{formatMonth(visibleMonth)}</p>
              <button
                aria-label="Next month"
                className="flex size-10 items-center justify-center rounded-md border border-[#dfe5ec] transition hover:bg-[#f8fafc]"
                onClick={() => setVisibleMonth(changeMonth(visibleMonth, 1))}
                type="button"
              >
                <ChevronRight aria-hidden="true" size={18} />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {WEEKDAYS.map((weekday) => (
                <span
                  className="py-1 text-xs font-semibold text-[#657386]"
                  key={weekday}
                >
                  {weekday}
                </span>
              ))}
              {days.map((day) => {
                const dateValue = toDateOnly(day.date);
                const disabled = Boolean(min && dateValue < min);
                const selected = dateValue === value;

                return (
                  <button
                    aria-label={formatDate(dateValue)}
                    aria-pressed={selected}
                    className={`flex aspect-square min-h-10 items-center justify-center rounded-md text-sm font-medium transition ${
                      selected
                        ? "bg-[#1d4ed8] text-white"
                        : day.inCurrentMonth
                          ? "text-[#2d3745] hover:bg-[#eef4ff]"
                          : "text-[#a0aab6] hover:bg-[#f8fafc]"
                    } disabled:cursor-not-allowed disabled:text-[#c5ccd5] disabled:hover:bg-transparent`}
                    disabled={disabled}
                    key={dateValue}
                    onClick={() => selectDate(day.date)}
                    type="button"
                  >
                    {day.date.getDate()}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex justify-between border-t border-[#e7ebf0] pt-3">
              <button
                className="text-sm font-semibold text-[#1d4ed8]"
                onClick={() => {
                  const today = min ?? toDateOnly(new Date());
                  selectDate(parseDateOnly(today));
                }}
                type="button"
              >
                {min ? "Earliest" : "Today"}
              </button>
              <Popover.Close className="text-sm font-semibold text-[#657386]">
                Close
              </Popover.Close>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}

function calendarDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return { date, inCurrentMonth: date.getMonth() === month.getMonth() };
  });
}

function changeMonth(value: Date, offset: number) {
  return new Date(value.getFullYear(), value.getMonth() + offset, 1);
}

function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toDateOnly(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parseDateOnly(value));
}

function formatMonth(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(value);
}
