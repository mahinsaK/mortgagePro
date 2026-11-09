"use client";

import { useEffect } from "react";

const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;
const RETRY_INTERVAL_MS = 5 * 60 * 1000;
const ACTIVE_WINDOW_MS = 30 * 60 * 1000;

export function SessionKeepAlive({ kind }: { kind: "collector" | "lender" }) {
  useEffect(() => {
    const storageKey = `mortgagepro-${kind}-session-refreshed-at`;
    const endpoint =
      kind === "lender"
        ? "/auth/session/refresh"
        : "/collector/session/refresh";
    let nextAttemptAt = 0;
    let lastActivityAt = Date.now();

    async function refreshIfDue() {
      if (document.visibilityState === "hidden" || Date.now() < nextAttemptAt) {
        return;
      }

      const refreshedAt = Number(window.localStorage.getItem(storageKey) ?? 0);
      if (
        Number.isFinite(refreshedAt) &&
        Date.now() - refreshedAt < REFRESH_INTERVAL_MS
      ) {
        return;
      }

      nextAttemptAt = Date.now() + RETRY_INTERVAL_MS;

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          credentials: "same-origin",
          headers: { Accept: "application/json" },
        });

        if (response.ok) {
          window.localStorage.setItem(storageKey, String(Date.now()));
          nextAttemptAt = Date.now() + REFRESH_INTERVAL_MS;
          return;
        }

        if (response.status === 401) {
          window.localStorage.removeItem(storageKey);
          window.location.assign(
            kind === "lender" ? "/auth/session/clear" : "/collector/login",
          );
        }
      } catch {
        // A temporary network failure must not remove an otherwise valid session.
      }
    }

    function handleActivity() {
      lastActivityAt = Date.now();
      void refreshIfDue();
    }

    function handleInterval() {
      if (Date.now() - lastActivityAt <= ACTIVE_WINDOW_MS) {
        void refreshIfDue();
      }
    }

    void refreshIfDue();
    window.addEventListener("focus", handleActivity);
    document.addEventListener("visibilitychange", handleActivity);
    document.addEventListener("pointerdown", handleActivity, { passive: true });
    document.addEventListener("keydown", handleActivity);
    const interval = window.setInterval(handleInterval, 60 * 60 * 1000);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleActivity);
      document.removeEventListener("visibilitychange", handleActivity);
      document.removeEventListener("pointerdown", handleActivity);
      document.removeEventListener("keydown", handleActivity);
    };
  }, [kind]);

  return null;
}
