"use client";

import Link from "next/link";
import * as Popover from "@radix-ui/react-popover";
import * as Tooltip from "@radix-ui/react-tooltip";
import { Bell, Moon, Settings, Sun } from "lucide-react";

type HeaderLender = {
  companyName: string;
  email: string;
  contactInfo: string;
  status: string;
};

const notifications = [
  {
    title: "Daily collection ready",
    body: "Today\'s collection report is available for review.",
  },
  {
    title: "Loan QR generated",
    body: "New loan QR codes can be downloaded from loan details.",
  },
  {
    title: "Collector validation",
    body: "Collectors are checked against the lender before payments are accepted.",
  },
];

export function HeaderActions({
  lender,
  theme,
  onToggleTheme,
}: {
  lender: HeaderLender | null;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}) {
  const contactInfo = parseContactInfo(lender?.contactInfo ?? "");

  return (
    <Tooltip.Provider delayDuration={150}>
      <div className="flex items-center gap-2 md:gap-3">
        <TooltipButton
          label={theme === "dark" ? "Switch to light mode" : "Switch to night mode"}
          onClick={onToggleTheme}
        >
          {theme === "dark" ? (
            <Sun aria-hidden="true" size={18} strokeWidth={2} />
          ) : (
            <Moon aria-hidden="true" size={18} strokeWidth={2} />
          )}
        </TooltipButton>

        <Popover.Root>
          <PopoverIconButton label="Notifications">
            <Bell aria-hidden="true" size={18} strokeWidth={2} />
          </PopoverIconButton>
          <Popover.Portal>
            <Popover.Content
              align="end"
              className="z-50 w-[min(20rem,calc(100vw-2rem))] rounded-lg border border-[#dfe5ec] bg-white p-4 text-[#15191f] shadow-xl"
              sideOffset={10}
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold">Notifications</h2>
                <span className="rounded-full bg-[#e0ecff] px-2.5 py-1 text-xs font-semibold text-[#1d4ed8]">
                  {notifications.length}
                </span>
              </div>
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <article
                    className="rounded-md border border-[#eef2f6] bg-[#f8fafc] p-3"
                    key={notification.title}
                  >
                    <p className="text-sm font-semibold">{notification.title}</p>
                    <p className="mt-1 text-xs leading-5 text-[#657386]">
                      {notification.body}
                    </p>
                  </article>
                ))}
              </div>
              <Link
                className="mt-4 flex h-10 items-center justify-center rounded-md border border-[#cfd8e3] text-sm font-semibold text-[#2d3745] transition hover:bg-[#f8fafc]"
                href="/notifications"
              >
                View all
              </Link>
              <Popover.Arrow className="fill-white" />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        <Popover.Root>
          <PopoverIconButton label="Settings and lender profile">
            <Settings aria-hidden="true" size={18} strokeWidth={2} />
          </PopoverIconButton>
          <Popover.Portal>
            <Popover.Content
              align="end"
              className="z-50 w-[min(20rem,calc(100vw-2rem))] rounded-lg border border-[#dfe5ec] bg-white p-4 text-[#15191f] shadow-xl"
              sideOffset={10}
            >
              <div className="mb-4">
                <p className="text-sm font-medium text-[#657386]">
                  Lender profile
                </p>
                <h2 className="mt-1 text-lg font-semibold">
                  {lender?.companyName ?? "MortgagePro"}
                </h2>
              </div>
              <dl className="space-y-3 text-sm">
                <ProfileDetail label="Email" value={lender?.email || "Not set"} />
                <ProfileDetail
                  label="Contact number"
                  value={contactInfo.phone || "Not set"}
                />
                <ProfileDetail
                  label="Address"
                  value={contactInfo.address || "Not set"}
                />
                <ProfileDetail
                  label="Status"
                  value={lender?.status || "Unknown"}
                />
              </dl>
              <Link
                className="mt-5 flex h-10 items-center justify-center rounded-md bg-[#15191f] text-sm font-semibold text-white transition hover:bg-[#2d3745]"
                href="/settings"
              >
                Update profile
              </Link>
              <Popover.Arrow className="fill-white" />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>
    </Tooltip.Provider>
  );
}

function parseContactInfo(value: string) {
  if (!value) {
    return { phone: "", address: "" };
  }

  try {
    const parsed = JSON.parse(value) as Record<string, string>;
    return {
      phone: parsed.phone ?? "",
      address: [parsed.address, parsed.area].filter(Boolean).join(" / "),
    };
  } catch {
    return { phone: value, address: "" };
  }
}

function TooltipButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button
          aria-label={label}
          className="flex h-10 w-10 items-center justify-center rounded-md border border-[#cfd8e3] bg-white text-[#2d3745] transition hover:border-[#94a3b8] hover:bg-[#f8fafc] focus:outline-none focus:ring-2 focus:ring-[#dbeafe]"
          onClick={onClick}
          type="button"
        >
          {children}
        </button>
      </Tooltip.Trigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip.Root>
  );
}

function PopoverIconButton({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <Popover.Trigger asChild>
          <button
            aria-label={label}
            className="flex h-10 w-10 items-center justify-center rounded-md border border-[#cfd8e3] bg-white text-[#2d3745] transition hover:border-[#94a3b8] hover:bg-[#f8fafc] focus:outline-none focus:ring-2 focus:ring-[#dbeafe]"
            type="button"
          >
            {children}
          </button>
        </Popover.Trigger>
      </Tooltip.Trigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip.Root>
  );
}

function TooltipContent({ children }: { children: React.ReactNode }) {
  return (
    <Tooltip.Portal>
      <Tooltip.Content
        className="z-50 rounded-md bg-[#15191f] px-2.5 py-1.5 text-xs font-medium text-white shadow-sm"
        sideOffset={8}
      >
        {children}
        <Tooltip.Arrow className="fill-[#15191f]" />
      </Tooltip.Content>
    </Tooltip.Portal>
  );
}

function ProfileDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#eef2f6] bg-[#f8fafc] p-3">
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[#657386]">
        {label}
      </dt>
      <dd className="mt-1 break-words font-medium text-[#15191f]">{value}</dd>
    </div>
  );
}
