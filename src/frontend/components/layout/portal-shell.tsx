"use client";

import { useEffect, useSyncExternalStore } from "react";
import { HeaderActions } from "@/frontend/components/layout/header-actions";
import { PortalSidebar } from "@/frontend/components/layout/portal-sidebar";

type Theme = "light" | "dark";
type SidebarState = "collapsed" | "expanded";
type ShellLender = {
  companyName: string;
  email: string;
  contactInfo: string;
  status: string;
};
const preferencesEvent = "mortgagepro-preferences-change";

export function PortalShell({
  children,
  lender,
}: {
  children: React.ReactNode;
  lender: ShellLender | null;
}) {
  const sidebar = useSyncExternalStore(
    subscribeToPreferences,
    getSidebarSnapshot,
    getSidebarServerSnapshot,
  );
  const theme = useSyncExternalStore(
    subscribeToPreferences,
    getThemeSnapshot,
    getThemeServerSnapshot,
  );
  const collapsed = sidebar === "collapsed";

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  function toggleSidebar() {
    window.localStorage.setItem(
      "mortgagepro-sidebar",
      collapsed ? "expanded" : "collapsed",
    );
    window.dispatchEvent(new Event(preferencesEvent));
  }

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("mortgagepro-theme", next);
    window.dispatchEvent(new Event(preferencesEvent));
  }

  return (
    <div className="min-h-screen bg-[#f6f7f9] text-[#15191f]">
      <PortalSidebar collapsed={collapsed} onToggle={toggleSidebar} />
      <div
        className={`min-h-screen transition-[padding] duration-200 ${
          collapsed ? "pl-20" : "pl-64"
        }`}
      >
        <header className="border-b border-[#dfe5ec] bg-white">
          <div className="flex min-h-20 items-center justify-between gap-4 px-8">
            <div>
              <p className="text-sm font-medium text-[#657386]">
                {lender?.companyName ?? "MortgagePro"}
              </p>
              <p className="mt-1 text-xl font-semibold">
                {lender?.status === "active" ? "Active lender" : "Lender"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <p className="hidden text-sm text-[#657386] sm:block">
                {lender?.email}
              </p>
              <HeaderActions
                lender={lender}
                onToggleTheme={toggleTheme}
                theme={theme}
              />
            </div>
          </div>
        </header>
        <main className="px-8 py-8">{children}</main>
      </div>
    </div>
  );
}

function subscribeToPreferences(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(preferencesEvent, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(preferencesEvent, callback);
  };
}

function getThemeSnapshot(): Theme {
  const savedTheme = window.localStorage.getItem("mortgagepro-theme");
  return savedTheme === "dark" || savedTheme === "light" ? savedTheme : "light";
}

function getThemeServerSnapshot(): Theme {
  return "light";
}

function getSidebarSnapshot(): SidebarState {
  return window.localStorage.getItem("mortgagepro-sidebar") === "collapsed"
    ? "collapsed"
    : "expanded";
}

function getSidebarServerSnapshot(): SidebarState {
  return "expanded";
}
