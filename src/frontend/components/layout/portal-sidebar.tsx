"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Banknote,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  HandCoins,
  LayoutDashboard,
  MessageSquareText,
  Users,
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
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={`portal-sidebar fixed left-0 top-0 z-30 flex h-screen flex-col border-r border-[#dfe5ec] bg-white transition-[width] duration-200 ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      <div className="flex h-20 items-center justify-between gap-3 border-b border-[#dfe5ec] px-4">
        <div className={collapsed ? "sr-only" : ""}>
          <p className="text-sm font-semibold text-[#2563eb]">MortgagePro</p>
          <p className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-[#657386]">
            Lender portal
          </p>
        </div>
        <button
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[#cfd8e3] text-[#2d3745] transition hover:bg-[#f8fafc] focus:outline-none focus:ring-2 focus:ring-[#dbeafe]"
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
              className={`mb-1 flex h-11 items-center rounded-md px-3 text-sm font-medium transition ${
                isActive
                  ? "bg-[#e0ecff] text-[#1d4ed8]"
                  : "text-[#425066] hover:bg-[#f1f5f9] hover:text-[#15191f]"
              }`}
              href={item.href}
              key={item.href}
              title={collapsed ? item.label : undefined}
            >
              <Icon aria-hidden="true" className="shrink-0" size={18} />
              <span className={collapsed ? "sr-only" : "ml-3"}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[#dfe5ec] p-4">
        <Link
          className="flex h-10 items-center justify-center rounded-md border border-[#cfd8e3] text-sm font-medium text-[#2d3745] transition hover:border-[#94a3b8] hover:bg-[#f8fafc]"
          href="/auth/login"
          title={collapsed ? "Sign out" : undefined}
        >
          {collapsed ? "Out" : "Sign out"}
        </Link>
      </div>
    </aside>
  );
}
