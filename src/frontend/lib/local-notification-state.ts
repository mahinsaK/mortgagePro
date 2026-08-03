import type { LocalNotificationResponse } from "@/backend/modules/notifications/dto";

export const NOTIFICATION_CACHE_TTL_MS = 5 * 60 * 1000;
export const NOTIFICATION_CACHE_MAX_STALE_MS = 24 * 60 * 60 * 1000;
export const NOTIFICATION_READ_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

type CachedNotifications = {
  savedAt: number;
  response: LocalNotificationResponse;
};

export type NotificationReadState = Record<string, number>;

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function readNotificationCache(
  storage: StorageLike,
  ownerKey: string,
  now = Date.now(),
) {
  const parsed = parseJson<CachedNotifications>(
    storage.getItem(cacheKey(ownerKey)),
  );

  if (
    !parsed ||
    !Number.isFinite(parsed.savedAt) ||
    !isNotificationResponse(parsed.response, ownerKey)
  ) {
    storage.removeItem(cacheKey(ownerKey));
    return null;
  }

  const age = Math.max(0, now - parsed.savedAt);

  if (age > NOTIFICATION_CACHE_MAX_STALE_MS) {
    storage.removeItem(cacheKey(ownerKey));
    return null;
  }

  return {
    response: parsed.response,
    isFresh: age <= NOTIFICATION_CACHE_TTL_MS,
    savedAt: parsed.savedAt,
  };
}

export function writeNotificationCache(
  storage: StorageLike,
  response: LocalNotificationResponse,
  now = Date.now(),
) {
  storage.setItem(
    cacheKey(response.ownerKey),
    JSON.stringify({ response, savedAt: now } satisfies CachedNotifications),
  );
}

export function readNotificationReadState(
  storage: StorageLike,
  ownerKey: string,
  now = Date.now(),
): NotificationReadState {
  const parsed = parseJson<NotificationReadState>(
    storage.getItem(readKey(ownerKey)),
  );
  const retained = Object.fromEntries(
    Object.entries(parsed ?? {}).filter(
      ([id, readAt]) =>
        Boolean(id) &&
        Number.isFinite(readAt) &&
        now - readAt <= NOTIFICATION_READ_RETENTION_MS,
    ),
  );

  storage.setItem(readKey(ownerKey), JSON.stringify(retained));
  return retained;
}

export function markNotificationsRead(
  storage: StorageLike,
  ownerKey: string,
  current: NotificationReadState,
  notificationIds: string[],
  now = Date.now(),
) {
  const next = { ...current };

  for (const notificationId of notificationIds) {
    if (notificationId) {
      next[notificationId] = now;
    }
  }

  storage.setItem(readKey(ownerKey), JSON.stringify(next));
  return next;
}

function cacheKey(ownerKey: string) {
  return `mortgagepro:notifications:cache:${ownerKey}`;
}

function readKey(ownerKey: string) {
  return `mortgagepro:notifications:read:${ownerKey}`;
}

function parseJson<T>(value: string | null): T | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function isNotificationResponse(
  value: unknown,
  ownerKey: string,
): value is LocalNotificationResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const response = value as Partial<LocalNotificationResponse>;
  return (
    response.ownerKey === ownerKey &&
    typeof response.generatedAt === "string" &&
    Array.isArray(response.items) &&
    response.items.every(
      (item) =>
        item &&
        typeof item.id === "string" &&
        [
          "loans_overdue",
          "loans_ending_today",
          "loans_ending_soon",
          "no_collections_today",
          "borrowers_missing_phone",
        ].includes(item.kind) &&
        ["urgent", "warning", "info"].includes(item.severity) &&
        typeof item.title === "string" &&
        typeof item.body === "string" &&
        typeof item.href === "string" &&
        item.href.startsWith("/") &&
        !item.href.startsWith("//") &&
        typeof item.generatedAt === "string",
    )
  );
}
