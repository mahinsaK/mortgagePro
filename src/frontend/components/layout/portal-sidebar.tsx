"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/backend/actions/auth-actions";
import {
  Banknote,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  HandCoins,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  Users,
  X,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/dashboard/lender", icon: LayoutDashboard },
  { label: "Borrowers", href: "/borrowers", icon: Users },
  { label: "Collectors", href: "/collectors", icon: HandCoins },
  { label: "Loans", href: "/loans", icon: Banknote },
  { label: "Payments", href: "/payments", icon: BarChart3 },
  { label: "SMS", href: "/sms", icon: MessageSquareText },
];

export function PortalSidebar({
  collapsed,
  mobileOpen,
  onMobileClose,
  onToggle,
}: {
  collapsed: boolean;
  mobileOpen: boolean;
  onMobileClose: () => void;
  onToggle: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={`portal-sidebar fixed left-0 top-0 z-40 flex h-[100dvh] w-[min(18rem,calc(100vw-3rem))] flex-col border-r border-[#dfe5ec] bg-white transition duration-200 md:z-30 md:h-screen md:translate-x-0 md:transition-[width] ${
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      } ${collapsed ? "md:w-20" : "md:w-64"}`}
    >
      <div className="flex h-20 items-center justify-between gap-3 border-b border-[#dfe5ec] px-4">
        <div className={collapsed ? "md:sr-only" : ""}>
          <p className="text-base font-semibold text-[#2563eb]">MortgagePro</p>
          <p className="mt-1 text-[13px] font-medium uppercase tracking-[0.14em] text-[#657386]">
            Lender portal
          </p>
        </div>
        <button
          aria-label="Close navigation menu"
          className="flex size-10 shrink-0 items-center justify-center rounded-md border border-[#cfd8e3] text-[#2d3745] md:hidden"
          onClick={onMobileClose}
          type="button"
        >
          <X aria-hidden="true" size={18} />
        </button>
        <button
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[#cfd8e3] text-[#2d3745] transition hover:bg-[#f8fafc] focus:outline-none focus:ring-2 focus:ring-[#dbeafe] md:flex"
          onClick={onToggle}
          type="button"
        >
          {collapsed ? (
            <ChevronRight aria-hidden="true" size={18} />
          ) : (
            <ChevronLeft aria-hidden="true" size={18} />
          )}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              aria-label={item.label}
              className={`mb-1 flex h-11 items-center rounded-md text-[15px] font-medium transition ${
                collapsed ? "px-3 md:justify-center md:px-0" : "px-3"
              } ${
                isActive
                  ? "bg-[#e0ecff] text-[#1d4ed8]"
                  : "text-[#425066] hover:bg-[#f1f5f9] hover:text-[#15191f]"
              }`}
              href={item.href}
              key={item.href}
              onClick={onMobileClose}
              title={collapsed ? item.label : undefined}
            >
              <Icon aria-hidden="true" className="shrink-0" size={19} />
              <span className={collapsed ? "ml-3 md:sr-only" : "ml-3"}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-[#dfe5ec] p-3">
        <form action={logoutAction}>
          <button
            aria-label="Sign out"
            className="flex h-11 w-full items-center justify-center rounded-md bg-[#15191f] px-3 text-[15px] font-semibold text-white shadow-sm transition hover:bg-[#2d3745] focus:outline-none focus:ring-2 focus:ring-[#cbd5e1] focus:ring-offset-2"
            title={collapsed ? "Sign out" : undefined}
            type="submit"
          >
            <LogOut aria-hidden="true" className="shrink-0" size={18} />
            <span className={collapsed ? "ml-2 md:sr-only" : "ml-2"}>
              Sign out
            </span>
          </button>
        </form>
      </div>
    </aside>
  );
}
