import { describe, expect, it } from "vitest";
import type { LocalNotificationResponse } from "@/backend/modules/notifications/dto";
import {
  markNotificationsRead,
  NOTIFICATION_CACHE_MAX_STALE_MS,
  NOTIFICATION_CACHE_TTL_MS,
  NOTIFICATION_READ_RETENTION_MS,
  readNotificationCache,
  readNotificationReadState,
  writeNotificationCache,
} from "../local-notification-state";

describe("local notification browser state", () => {
  it("uses a five-minute fresh cache and retains labelled stale data", () => {
    const storage = memoryStorage();
    writeNotificationCache(storage, response(), 1_000);

    expect(readNotificationCache(storage, "owner_A", 1_000 + NOTIFICATION_CACHE_TTL_MS))
      .toMatchObject({ isFresh: true });
    expect(
      readNotificationCache(storage, "owner_A", 1_001 + NOTIFICATION_CACHE_TTL_MS),
    ).toMatchObject({ isFresh: false });
    expect(
      readNotificationCache(
        storage,
        "owner_A",
        1_001 + NOTIFICATION_CACHE_MAX_STALE_MS,
      ),
    ).toBeNull();
  });

  it("never returns another lender's cached response", () => {
    const storage = memoryStorage();
    writeNotificationCache(storage, response(), 1_000);

    expect(readNotificationCache(storage, "owner_B", 1_001)).toBeNull();
  });

  it("marks individual and multiple notifications read", () => {
    const storage = memoryStorage();
    const first = markNotificationsRead(storage, "owner_A", {}, ["first"], 10);
    const all = markNotificationsRead(
      storage,
      "owner_A",
      first,
      ["first", "second"],
      20,
    );

    expect(all).toEqual({ first: 20, second: 20 });
    expect(readNotificationReadState(storage, "owner_A", 21)).toEqual(all);
  });

  it("prunes read identities after 30 days and recovers malformed storage", () => {
    const storage = memoryStorage();
    markNotificationsRead(storage, "owner_A", {}, ["old"], 1_000);

    expect(
      readNotificationReadState(
        storage,
        "owner_A",
        1_001 + NOTIFICATION_READ_RETENTION_MS,
      ),
    ).toEqual({});

    storage.setItem("mortgagepro:notifications:cache:owner_A", "not-json");
    expect(readNotificationCache(storage, "owner_A", 2_000)).toBeNull();
  });
});

function response(): LocalNotificationResponse {
  return {
    ownerKey: "owner_A",
    generatedAt: "2026-08-04T03:00:00.000Z",
    items: [
      {
        id: "loans_overdue:2026-08-04",
        kind: "loans_overdue",
        severity: "urgent",
        title: "Overdue loan",
        body: "One loan needs attention.",
        href: "/loans?attention=overdue&asOf=2026-08-04",
        generatedAt: "2026-08-04T03:00:00.000Z",
      },
    ],
  };
}

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
}
