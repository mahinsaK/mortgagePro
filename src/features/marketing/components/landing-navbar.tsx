"use client";

import Link from "next/link";
import { Building2 } from "lucide-react";
import { useEffect, useState } from "react";

const NAV_LINKS = [
  { href: "#capabilities", label: "Capabilities" },
  { href: "#workflow", label: "How it works" },
  { href: "#security", label: "Security" },
  { href: "#faq", label: "FAQ" },
];

export function LandingNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  return (
    <>
      <header className="relative z-40 mx-auto w-full max-w-7xl px-4 sm:px-8 lg:px-12">
        <nav
          aria-label="Primary navigation"
          className="mx-auto flex min-h-20 items-center justify-between gap-4 border-b border-[#eef0f4] bg-white py-3 sm:min-h-24"
        >
          <Link
            aria-label="MortgagePro home"
            className="inline-flex min-h-11 items-center gap-2.5 rounded-lg text-[#101827] transition-opacity duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:opacity-85"
            href="/"
          >
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#3156ee] text-white">
              <Building2 aria-hidden="true" size={16} />
            </span>
            <span className="title-3 font-semibold tracking-tight">
              MortgagePro
            </span>
          </Link>

          <ul className="hidden items-center gap-1 lg:flex">
            {NAV_LINKS.map((item) => (
              <li key={item.href}>
                <a
                  className="title-4 inline-flex min-h-11 items-center rounded-full px-4 text-[#596579] transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[#edf0ff] hover:text-[#2545ca]"
                  href={item.href}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="hidden items-center gap-2 lg:flex">
            <Link
              className="button-sm inline-flex min-h-11 items-center rounded-full px-4 text-[#26344b] transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[#f4f6fa]"
              href="/auth/login"
            >
              Sign in
            </Link>
            <Link
              className="button-sm inline-flex min-h-11 items-center rounded-full bg-[#3156ee] px-5 py-2 text-white transition-[background-color,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[#2445d4] active:scale-[0.98]"
              href="/auth/register"
            >
              Request lender access
            </Link>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <Link
              className="button-sm inline-flex min-h-11 items-center rounded-full bg-[#3156ee] px-3 py-2 text-white transition-[background-color,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[#2445d4] active:scale-[0.98]"
              href="/auth/register"
            >
              Request access
            </Link>
            <button
              aria-controls="mobile-landing-menu"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
              className="relative inline-flex size-11 items-center justify-center rounded-lg border border-[var(--mp-border)] bg-[var(--mp-surface)] text-[var(--foreground)] transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[var(--mp-surface-muted)]"
              onClick={() => setMenuOpen((open) => !open)}
              type="button"
            >
              <span className="relative flex size-5 flex-col items-center justify-center">
                <span
                  className={`block h-0.5 w-4 rounded-full bg-current transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    menuOpen ? "translate-y-[3px] rotate-45" : "-translate-y-1"
                  }`}
                />
                <span
                  className={`block h-0.5 w-4 rounded-full bg-current transition-opacity duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    menuOpen ? "opacity-0" : "opacity-100"
                  }`}
                />
                <span
                  className={`block h-0.5 w-4 rounded-full bg-current transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    menuOpen ? "-translate-y-[1px] -rotate-45" : "translate-y-1"
                  }`}
                />
              </span>
            </button>
          </div>
        </nav>
      </header>

      <div
        aria-hidden={!menuOpen}
        inert={!menuOpen}
        className={`fixed inset-0 z-50 flex flex-col bg-[var(--mp-surface)]/95 backdrop-blur-xl transition-opacity duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:hidden ${
          menuOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        id="mobile-landing-menu"
      >
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-6 sm:px-6">
          <Link
            className="inline-flex min-h-11 items-center gap-2 text-[var(--foreground)]"
            href="/"
            onClick={() => setMenuOpen(false)}
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-[#0b2848] text-white">
              <Building2 aria-hidden="true" size={16} />
            </span>
            <span className="title-3 font-semibold">MortgagePro</span>
          </Link>
          <button
            aria-label="Close navigation menu"
            className="inline-flex size-11 items-center justify-center rounded-lg border border-[var(--mp-border)] bg-[var(--mp-surface)] text-[var(--foreground)]"
            onClick={() => setMenuOpen(false)}
            type="button"
          >
            <span className="relative flex size-5 items-center justify-center">
              <span className="absolute h-0.5 w-4 rotate-45 rounded-full bg-current" />
              <span className="absolute h-0.5 w-4 -rotate-45 rounded-full bg-current" />
            </span>
          </button>
        </div>

        <nav
          aria-label="Mobile navigation"
          className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-between px-6 pb-8 pt-4"
        >
          <ul className="space-y-2">
            {NAV_LINKS.map((item, index) => (
              <li
                key={item.href}
                style={{
                  transitionDelay: menuOpen ? `${Math.min(index * 60, 360)}ms` : "0ms",
                }}
                className={`transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transform-none ${
                  menuOpen
                    ? "translate-y-0 opacity-100"
                    : "translate-y-6 opacity-0"
                }`}
              >
                <a
                  className="heading-5 flex min-h-12 items-center rounded-xl px-3 py-2 text-[var(--foreground)] transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[var(--mp-surface-muted)]"
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  tabIndex={menuOpen ? 0 : -1}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>

          <div
            style={{
              transitionDelay: menuOpen ? "240ms" : "0ms",
            }}
            className={`space-y-3 border-t border-[var(--mp-border)] pt-6 transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transform-none ${
              menuOpen ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
            }`}
          >
            <Link
              className="button-md flex min-h-12 w-full items-center justify-center rounded-xl bg-[var(--mp-primary)] px-4 py-2 text-white"
              href="/auth/register"
              onClick={() => setMenuOpen(false)}
              tabIndex={menuOpen ? 0 : -1}
            >
              Request lender access
            </Link>
            <Link
              className="button-md flex min-h-12 w-full items-center justify-center rounded-xl border border-[var(--mp-border)] bg-[var(--mp-surface)] px-4 py-2 text-[var(--foreground)]"
              href="/auth/login"
              onClick={() => setMenuOpen(false)}
              tabIndex={menuOpen ? 0 : -1}
            >
              Sign in
            </Link>
          </div>
        </nav>
      </div>
    </>
  );
}
