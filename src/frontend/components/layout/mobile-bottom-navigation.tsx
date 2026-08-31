"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Banknote,
  BarChart3,
  LayoutDashboard,
  Menu,
  Users,
} from "lucide-react";

const primaryItems = [
  { label: "Dashboard", href: "/dashboard/lender", icon: LayoutDashboard },
  { label: "Borrowers", href: "/borrowers", icon: Users },
  { label: "Loans", href: "/loans", icon: Banknote },
  { label: "Payments", href: "/payments", icon: BarChart3 },
];

export function MobileBottomNavigation({
  onOpenMenu,
}: {
  onOpenMenu: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary mobile navigation"
      className="mobile-bottom-navigation fixed inset-x-0 bottom-0 z-20 border-t border-[#dfe5ec] bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur md:hidden"
    >
      <div className="mx-auto grid h-16 max-w-lg grid-cols-5 items-stretch">
        {primaryItems.map((item) => {
          const Icon = item.icon;
          const active = isActivePath(pathname, item.href);

          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 text-[11px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] ${
                active ? "text-[#1d4ed8]" : "text-[#657386]"
              }`}
              href={item.href}
              key={item.href}
            >
              <Icon aria-hidden="true" size={20} strokeWidth={active ? 2.4 : 2} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
        <button
          aria-label="Open all navigation options"
          className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 text-[11px] font-semibold text-[#657386] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]"
          onClick={onOpenMenu}
          type="button"
        >
          <Menu aria-hidden="true" size={20} />
          <span>More</span>
        </button>
      </div>
    </nav>
  );
}

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard/lender") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
