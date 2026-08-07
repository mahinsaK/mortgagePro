"use client";

import { Menu } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { HeaderActions } from "@/frontend/components/layout/header-actions";
import { PortalSidebar } from "@/frontend/components/layout/portal-sidebar";
import { NotificationOwnerProvider } from "@/frontend/components/notifications/notification-owner-context";
import { SessionKeepAlive } from "@/frontend/components/auth/session-keep-alive";

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
  notificationOwnerKey,
}: {
  children: React.ReactNode;
  lender: ShellLender | null;
  notificationOwnerKey: string;
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const collapsed = sidebar === "collapsed";

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

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
    <NotificationOwnerProvider
      key={notificationOwnerKey}
      ownerKey={notificationOwnerKey}
    >
      <SessionKeepAlive kind="lender" />
      <div className="min-h-screen bg-[#f6f7f9] text-[#15191f]">
      {mobileMenuOpen ? (
        <button
          aria-label="Close navigation menu"
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
          type="button"
        />
      ) : null}
      <PortalSidebar
        collapsed={collapsed}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
        onToggle={toggleSidebar}
      />
      <div
        className={`min-h-screen transition-[padding] duration-200 ${
          collapsed ? "md:pl-20" : "md:pl-64"
        }`}
      >
        <header className="portal-topbar sticky top-0 z-20 border-b border-[#dfe5ec] backdrop-blur">
          <div className="flex min-h-16 items-center justify-between gap-3 px-4 md:min-h-20 md:gap-4 md:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                aria-label="Open navigation menu"
                className="flex size-10 shrink-0 items-center justify-center rounded-md border border-[#cfd8e3] text-[#2d3745] md:hidden"
                onClick={() => setMobileMenuOpen(true)}
                type="button"
              >
                <Menu aria-hidden="true" size={20} />
              </button>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-[#657386] md:text-sm">
                  {lender?.companyName ?? "MortgagePro"}
                </p>
                <p className="mt-0.5 truncate text-base font-semibold md:mt-1 md:text-xl">
                  {lender?.status === "active" ? "Active lender" : "Lender"}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 md:gap-3">
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
        <main className="px-4 py-5 md:px-8 md:py-8">{children}</main>
      </div>
      </div>
    </NotificationOwnerProvider>
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
