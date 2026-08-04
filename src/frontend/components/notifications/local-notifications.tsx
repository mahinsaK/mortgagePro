"use client";

import Link from "next/link";
import * as Popover from "@radix-ui/react-popover";
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  CircleAlert,
  Info,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  LocalNotificationItem,
  LocalNotificationResponse,
} from "@/backend/modules/notifications/dto";
import { useNotificationOwnerKey } from "@/frontend/components/notifications/notification-owner-context";
import {
  markNotificationsRead,
  readNotificationCache,
  readNotificationReadState,
  writeNotificationCache,
  type NotificationReadState,
} from "@/frontend/lib/local-notification-state";

export function NotificationPopover() {
  const notifications = useLocalNotifications(false);

  return (
    <Popover.Root
      onOpenChange={(open) => {
        if (open) {
          void notifications.load();
        }
      }}
    >
      <Popover.Trigger asChild>
        <button
          aria-label="Notifications"
          className="relative flex h-10 w-10 items-center justify-center rounded-md border border-[#cfd8e3] bg-white text-[#2d3745] transition hover:border-[#94a3b8] hover:bg-[#f8fafc] focus:outline-none focus:ring-2 focus:ring-[#dbeafe]"
          title="Notifications"
          type="button"
        >
          <Bell aria-hidden="true" size={18} strokeWidth={2} />
          {notifications.unreadCount > 0 ? (
            <span className="absolute -right-1.5 -top-1.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#dc2626] px-1 text-[10px] font-bold text-white">
              {notifications.unreadCount > 9 ? "9+" : notifications.unreadCount}
            </span>
          ) : null}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          className="z-50 w-[min(23rem,calc(100vw-2rem))] rounded-lg border border-[#dfe5ec] bg-white p-4 text-[#15191f] shadow-xl"
          sideOffset={10}
        >
          <NotificationHeader
            isLoading={notifications.isLoading}
            onMarkAllRead={notifications.markAllRead}
            onRefresh={() => void notifications.load(true)}
            unreadCount={notifications.unreadCount}
          />
          <NotificationStatus
            error={notifications.error}
            hasCachedData={notifications.hasCachedData}
            hasLoaded={notifications.hasLoaded}
            isLoading={notifications.isLoading}
            isStale={notifications.isStale}
          />
          <NotificationList
            items={notifications.items.slice(0, 4)}
            onRead={notifications.markRead}
            readState={notifications.readState}
          />
          {notifications.hasLoaded &&
          !notifications.isLoading &&
          !notifications.error &&
          notifications.items.length === 0 ? (
            <EmptyNotifications />
          ) : null}
          <Link
            className="mt-4 flex h-10 items-center justify-center rounded-md border border-[#cfd8e3] text-sm font-semibold text-[#2d3745] transition hover:bg-[#f8fafc]"
            href="/notifications"
          >
            View all
          </Link>
          <Popover.Arrow className="fill-white" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function NotificationsPageContent() {
  const notifications = useLocalNotifications(true);

  return (
    <section className="rounded-lg border border-[#dfe5ec] bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-[#dfe5ec] p-4 sm:flex-row sm:items-center sm:justify-between md:p-5">
        <div>
          <h2 className="text-lg font-semibold">Action centre</h2>
          <p className="mt-1 text-sm text-[#657386]">
            Calculated from your current lending records. Nothing is saved.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#cfd8e3] px-3 text-sm font-semibold text-[#2d3745] transition hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:text-[#9aa6b2]"
            disabled={notifications.unreadCount === 0}
            onClick={notifications.markAllRead}
            type="button"
          >
            <CheckCheck aria-hidden="true" size={16} />
            Mark all read
          </button>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#15191f] px-3 text-sm font-semibold text-white transition hover:bg-[#2d3745] disabled:cursor-not-allowed disabled:bg-[#9aa6b2]"
            disabled={notifications.isLoading}
            onClick={() => void notifications.load(true)}
            type="button"
          >
            <RefreshCw
              aria-hidden="true"
              className={notifications.isLoading ? "animate-spin" : ""}
              size={16}
            />
            Refresh
          </button>
        </div>
      </div>

      <div className="p-4 md:p-5">
        <NotificationStatus
          error={notifications.error}
          hasCachedData={notifications.hasCachedData}
          hasLoaded={notifications.hasLoaded}
          isLoading={notifications.isLoading}
          isStale={notifications.isStale}
        />
        <NotificationList
          items={notifications.items}
          onRead={notifications.markRead}
          readState={notifications.readState}
        />
        {notifications.hasLoaded &&
        !notifications.isLoading &&
        !notifications.error &&
        notifications.items.length === 0 ? (
          <EmptyNotifications />
        ) : null}
      </div>
    </section>
  );
}

function useLocalNotifications(autoLoad: boolean) {
  const ownerKey = useNotificationOwnerKey();
  const [response, setResponse] = useState<LocalNotificationResponse | null>(null);
  const [readState, setReadState] = useState<NotificationReadState>({});
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const [error, setError] = useState("");
  const requestRef = useRef<Promise<void> | null>(null);

  const load = useCallback(
    async (force = false) => {
      if (requestRef.current) {
        return requestRef.current;
      }

      const request = (async () => {
        const cache = readNotificationCache(window.localStorage, ownerKey);

        if (cache) {
          setResponse(cache.response);
          setIsStale(!cache.isFresh);
          setHasLoaded(true);
        }

        if (!force && cache?.isFresh) {
          setError("");
          return;
        }

        setIsLoading(true);
        setError("");

        try {
          const now = new Date();
          const params = new URLSearchParams({
            localDate: toLocalDate(now),
            timezoneOffsetMinutes: String(now.getTimezoneOffset()),
          });
          const apiResponse = await fetch(`/api/notifications?${params}`, {
            cache: "no-store",
          });
          const data = (await apiResponse.json()) as
            | LocalNotificationResponse
            | { error?: string };

          if (!apiResponse.ok || !("items" in data)) {
            throw new Error(
              "error" in data && data.error
                ? data.error
                : "Notifications could not be loaded.",
            );
          }

          if (data.ownerKey !== ownerKey) {
            throw new Error("Notification account changed. Please refresh.");
          }

          writeNotificationCache(window.localStorage, data);
          setResponse(data);
          setIsStale(false);
        } catch (loadError) {
          setIsStale(Boolean(cache));
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Notifications could not be loaded.",
          );
        } finally {
          setHasLoaded(true);
          setIsLoading(false);
        }
      })();

      requestRef.current = request;

      try {
        await request;
      } finally {
        requestRef.current = null;
      }
    },
    [ownerKey],
  );

  useEffect(() => {
    const hydrationTimer = window.setTimeout(() => {
      const cache = readNotificationCache(window.localStorage, ownerKey);
      setReadState(readNotificationReadState(window.localStorage, ownerKey));

      if (cache) {
        setResponse(cache.response);
        setIsStale(!cache.isFresh);
        setHasLoaded(true);
      }

      if (autoLoad) {
        void load();
      }
    }, 0);

    return () => window.clearTimeout(hydrationTimer);
  }, [autoLoad, load, ownerKey]);

  const items = useMemo(() => response?.items ?? [], [response]);
  const unreadCount = useMemo(
    () => items.filter((item) => !readState[item.id]).length,
    [items, readState],
  );

  function markRead(notificationId: string) {
    setReadState((current) =>
      markNotificationsRead(
        window.localStorage,
        ownerKey,
        current,
        [notificationId],
      ),
    );
  }

  function markAllRead() {
    setReadState((current) =>
      markNotificationsRead(
        window.localStorage,
        ownerKey,
        current,
        items.map((item) => item.id),
      ),
    );
  }

  return {
    error,
    hasCachedData: Boolean(response),
    hasLoaded,
    isLoading,
    isStale,
    items,
    load,
    markAllRead,
    markRead,
    readState,
    unreadCount,
  };
}

function NotificationHeader({
  isLoading,
  onMarkAllRead,
  onRefresh,
  unreadCount,
}: {
  isLoading: boolean;
  onMarkAllRead: () => void;
  onRefresh: () => void;
  unreadCount: number;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold">Notifications</h2>
        <p className="mt-0.5 text-xs text-[#657386]">
          {unreadCount} unread
        </p>
      </div>
      <div className="flex gap-1">
        <button
          aria-label="Mark all notifications as read"
          className="flex size-9 items-center justify-center rounded-md text-[#657386] transition hover:bg-[#f8fafc] disabled:text-[#cbd5e1]"
          disabled={unreadCount === 0}
          onClick={onMarkAllRead}
          title="Mark all read"
          type="button"
        >
          <CheckCheck aria-hidden="true" size={17} />
        </button>
        <button
          aria-label="Refresh notifications"
          className="flex size-9 items-center justify-center rounded-md text-[#657386] transition hover:bg-[#f8fafc] disabled:text-[#cbd5e1]"
          disabled={isLoading}
          onClick={onRefresh}
          title="Refresh"
          type="button"
        >
          <RefreshCw
            aria-hidden="true"
            className={isLoading ? "animate-spin" : ""}
            size={16}
          />
        </button>
      </div>
    </div>
  );
}

function NotificationStatus({
  error,
  hasCachedData,
  hasLoaded,
  isLoading,
  isStale,
}: {
  error: string;
  hasCachedData: boolean;
  hasLoaded: boolean;
  isLoading: boolean;
  isStale: boolean;
}) {
  if ((!hasLoaded || isLoading) && !hasCachedData) {
    return (
      <p aria-live="polite" className="mb-3 text-sm text-[#657386]">
        Checking your records…
      </p>
    );
  }

  if (error) {
    return (
      <p
        className={`mb-3 rounded-md border px-3 py-2 text-sm ${
          hasCachedData
            ? "border-[#fed7aa] bg-[#fff7ed] text-[#9a3412]"
            : "border-[#fecaca] bg-[#fef2f2] text-[#b91c1c]"
        }`}
        role="alert"
      >
        {hasCachedData ? `${error} Showing cached advice.` : error}
      </p>
    );
  }

  if (isStale) {
    return (
      <p className="mb-3 rounded-md bg-[#fff7ed] px-3 py-2 text-sm text-[#9a3412]">
        Showing cached advice while refreshing.
      </p>
    );
  }

  return null;
}

function NotificationList({
  items,
  onRead,
  readState,
}: {
  items: LocalNotificationItem[];
  onRead: (notificationId: string) => void;
  readState: NotificationReadState;
}) {
  return (
    <div className="space-y-3">
      {items.map((notification) => {
        const isRead = Boolean(readState[notification.id]);

        return (
          <Link
            className={`group flex gap-3 rounded-md border p-3 transition hover:border-[#bfdbfe] hover:bg-[#f8fafc] ${
              isRead
                ? "border-[#eef2f6] bg-white"
                : "border-[#dbeafe] bg-[#f8fbff]"
            }`}
            href={notification.href}
            key={notification.id}
            onClick={() => onRead(notification.id)}
          >
            <SeverityIcon severity={notification.severity} />
            <span className="min-w-0 flex-1">
              <span className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold text-[#15191f]">
                  {notification.title}
                </span>
                {!isRead ? (
                  <span
                    aria-label="Unread"
                    className="mt-1.5 size-2 shrink-0 rounded-full bg-[#2563eb]"
                  />
                ) : null}
              </span>
              <span className="mt-1 block text-xs leading-5 text-[#657386]">
                {notification.body}
              </span>
              <span className="mt-2 block text-xs font-semibold text-[#1d4ed8]">
                View affected records
              </span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}

function SeverityIcon({
  severity,
}: {
  severity: LocalNotificationItem["severity"];
}) {
  const className =
    severity === "urgent"
      ? "bg-[#fef2f2] text-[#dc2626]"
      : severity === "warning"
        ? "bg-[#fff7ed] text-[#c2410c]"
        : "bg-[#eff6ff] text-[#2563eb]";

  return (
    <span
      className={`flex size-9 shrink-0 items-center justify-center rounded-md ${className}`}
    >
      {severity === "urgent" ? (
        <CircleAlert aria-hidden="true" size={18} />
      ) : severity === "warning" ? (
        <AlertTriangle aria-hidden="true" size={18} />
      ) : (
        <Info aria-hidden="true" size={18} />
      )}
    </span>
  );
}

function EmptyNotifications() {
  return (
    <div className="rounded-md border border-[#dfe5ec] bg-[#f8fafc] p-5 text-center">
      <CheckCheck aria-hidden="true" className="mx-auto text-[#16a34a]" size={24} />
      <p className="mt-2 text-sm font-semibold text-[#15191f]">Nothing needs attention</p>
      <p className="mt-1 text-xs leading-5 text-[#657386]">
        Your current records did not generate any local advice.
      </p>
    </div>
  );
}

function toLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
