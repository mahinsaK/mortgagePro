"use client";

import { useEffect, useRef, useState } from "react";

const TAGLINE_WORDS =
  "Every loan issued, every field payment scanned, and every borrower receipt stays inside one verified ledger.".split(
    " ",
  );

export function TaglineReveal() {
  const sectionRef = useRef<HTMLElement>(null);
  const [revealedCount, setRevealedCount] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let frameId = 0;

    function updateProgress() {
      frameId = 0;
      const section = sectionRef.current;
      if (!section) return;

      const rect = section.getBoundingClientRect();
      const viewportHeight = window.innerHeight || 800;
      const start = viewportHeight * 0.88;
      const end = viewportHeight * 0.28;
      const rawProgress = (start - rect.top) / (start - end);
      const clamped = Math.max(0, Math.min(1, rawProgress));
      const count = Math.round(clamped * TAGLINE_WORDS.length);
      setRevealedCount((previous) => Math.max(previous, count));
    }

    function scheduleUpdate() {
      if (frameId === 0) {
        frameId = window.requestAnimationFrame(updateProgress);
      }
    }

    scheduleUpdate();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate, { passive: true });

    return () => {
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, []);

  return (
    <section
      aria-label="Core operating principle"
      className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24"
      ref={sectionRef}
    >
      <div className="mx-auto max-w-[680px]">
        <p className="heading-2 leading-tight text-[var(--foreground)]">
          {TAGLINE_WORDS.map((word, index) => {
            const active = index < revealedCount;
            return (
              <span
                className={`inline-block transition-opacity duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:opacity-100 motion-reduce:transition-none ${
                  active ? "opacity-100" : "opacity-60"
                }`}
                key={`${word}-${index}`}
              >
                {word}
                {index < TAGLINE_WORDS.length - 1 ? "\u00A0" : ""}
              </span>
            );
          })}
        </p>
      </div>
    </section>
  );
}
