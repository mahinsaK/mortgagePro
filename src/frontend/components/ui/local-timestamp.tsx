"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

export function LocalTimestamp({
  value,
  timeOnly = false,
}: {
  value: string;
  timeOnly?: boolean;
}) {
  const isHydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const date = new Date(value);
  const label =
    isHydrated && !Number.isNaN(date.getTime())
      ? new Intl.DateTimeFormat("en-US", {
          ...(timeOnly
            ? {}
            : { day: "2-digit", month: "short", year: "numeric" }),
          hour: "numeric",
          minute: "2-digit",
        }).format(date)
      : "—";

  return <time dateTime={value}>{label}</time>;
}
