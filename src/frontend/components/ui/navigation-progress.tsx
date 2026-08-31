"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const NAVIGATION_START_EVENT = "mortgagepro:navigation-start";

export function announceNavigationStart() {
  window.dispatchEvent(new Event(NAVIGATION_START_EVENT));
}

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);
  const search = searchParams.toString();

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setActive(false));
    return () => window.cancelAnimationFrame(frame);
  }, [pathname, search]);

  useEffect(() => {
    function start() {
      setActive(true);
    }

    function handleClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      const anchor =
        target instanceof Element ? target.closest<HTMLAnchorElement>("a[href]") : null;

      if (!anchor || anchor.download || (anchor.target && anchor.target !== "_self")) {
        return;
      }

      const destination = new URL(anchor.href, window.location.href);
      const current = new URL(window.location.href);
      const changesPage =
        destination.origin === current.origin &&
        (destination.pathname !== current.pathname ||
          destination.search !== current.search);

      if (changesPage) {
        start();
      }
    }

    function handleSubmit(event: SubmitEvent) {
      const form = event.target;

      if (form instanceof HTMLFormElement && form.method.toLowerCase() === "get") {
        start();
      }
    }

    document.addEventListener("click", handleClick);
    document.addEventListener("submit", handleSubmit);
    window.addEventListener(NAVIGATION_START_EVENT, start);

    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("submit", handleSubmit);
      window.removeEventListener(NAVIGATION_START_EVENT, start);
    };
  }, []);

  useEffect(() => {
    if (!active) return;

    const timeout = window.setTimeout(() => setActive(false), 12000);
    return () => window.clearTimeout(timeout);
  }, [active]);

  return active ? (
    <div
      aria-label="Loading page"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden bg-[#dbeafe]"
      role="status"
    >
      <span className="navigation-progress-bar block h-full bg-[#2563eb]" />
    </div>
  ) : null;
}
