"use client";

import Form from "next/form";
import { useState } from "react";
import { DatePicker } from "@/frontend/components/forms/date-picker";

export function DailyCollectionsDateFilter({
  selectedDate,
}: {
  selectedDate: string;
}) {
  const [date, setDate] = useState(selectedDate);

  return (
    <Form
      action="/payments/daily"
      className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-end gap-2 sm:w-auto sm:grid-cols-[minmax(220px,1fr)_auto] sm:gap-3"
      scroll={false}
    >
      <DatePicker
        hideLabel
        label="Collection date"
        name="date"
        onChange={setDate}
        value={date}
      />
      <button
        className="h-11 rounded-md bg-[#15191f] px-4 text-sm font-semibold text-white transition hover:bg-[#2d3745]"
        type="submit"
      >
        View day
      </button>
    </Form>
  );
}
