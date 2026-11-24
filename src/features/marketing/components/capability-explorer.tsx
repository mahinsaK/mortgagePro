"use client";

import {
  ArrowDownToLine,
  CalendarDays,
  Check,
  ChevronRight,
  MessageSquareText,
  QrCode,
  Search,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { useState } from "react";

const WORKFLOWS = [
  {
    key: "borrowers",
    label: "Borrowers & loans",
    title: "Keep every borrower and loan in view.",
    description:
      "Open a borrower profile, review their latest loans, and find the balance you need without searching through separate files.",
    details: ["Borrower profiles", "Latest loans first", "Balances at a glance"],
    icon: UsersRound,
  },
  {
    key: "collections",
    label: "QR collections",
    title: "Give field collectors a simpler way to record payments.",
    description:
      "A collector scans a loan QR code, checks the amount, and records a scheduled or custom payment from their phone.",
    details: ["Mobile camera scan", "Scheduled or custom amount", "Balance updated together"],
    icon: QrCode,
  },
  {
    key: "payments",
    label: "Payments & exports",
    title: "See what came in today, then take the record with you.",
    description:
      "Review collections and payment history in the lender portal. Export the records you need as a CSV file.",
    details: ["Daily collection view", "Payment history", "CSV exports"],
    icon: WalletCards,
  },
  {
    key: "messages",
    label: "Borrower messages",
    title: "Send useful updates from the same workspace.",
    description:
      "Save message templates, manage your monthly SMS allowance, and send using a sender ID once it has been approved.",
    details: ["Saved templates", "Monthly usage", "Approved sender ID required"],
    icon: MessageSquareText,
  },
] as const;

type WorkflowKey = (typeof WORKFLOWS)[number]["key"];

function SampleBorrowers() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#dce4f1] bg-white shadow-[0_20px_50px_rgba(17,39,87,0.1)]">
      <div className="flex items-center justify-between gap-3 border-b border-[#e7ebf1] px-4 py-4 sm:px-5">
        <div>
          <p className="title-3 text-[#17233a]">Borrowers</p>
          <p className="caption-4 text-[#657286]">A sample directory</p>
        </div>
        <div className="flex size-9 items-center justify-center rounded-lg bg-[#edf1ff] text-[#3156ee]">
          <Search aria-hidden="true" size={17} />
        </div>
      </div>
      <div className="divide-y divide-[#e7ebf1]">
        {[
          ["Kamal Perera", "2 loans", "LKR 630 remaining"],
          ["Nadeesha Fernando", "1 loan", "LKR 1,140 remaining"],
          ["Roshan Jayawardena", "1 overdue loan", "LKR 245 remaining"],
        ].map(([name, loans, balance]) => (
          <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5" key={name}>
            <div className="min-w-0">
              <p className="body-4 truncate text-[#17233a]">{name}</p>
              <p className="caption-4 text-[#657286]">{loans}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="caption-4 hidden text-[#4d5d73] sm:inline">{balance}</span>
              <ChevronRight aria-hidden="true" className="text-[#3156ee]" size={17} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SampleCollection() {
  return (
    <div className="mx-auto max-w-[390px] rounded-[2rem] border-[6px] border-[#142a55] bg-[#142a55] p-2 shadow-[0_24px_50px_rgba(17,39,87,0.22)]">
      <div className="rounded-[1.35rem] bg-white px-5 pb-6 pt-5">
        <p className="caption-3 text-[#657286]">Collector scan · sample</p>
        <div className="mx-auto my-6 flex size-28 items-center justify-center rounded-2xl border-2 border-dashed border-[#a9b9ef] bg-[#f5f7ff] text-[#3156ee]">
          <QrCode aria-hidden="true" size={64} strokeWidth={1.4} />
        </div>
        <p className="title-3 text-[#17233a]">Kamal Perera</p>
        <div className="mt-3 flex items-center justify-between border-b border-[#e7ebf1] pb-3">
          <span className="caption-2 text-[#657286]">Scheduled amount</span>
          <span className="body-4 text-[#17233a]">LKR 45</span>
        </div>
        <div className="flex items-center justify-between py-3">
          <span className="caption-2 text-[#657286]">Remaining balance</span>
          <span className="body-4 text-[#17233a]">LKR 630</span>
        </div>
        <div className="button-sm mt-2 flex min-h-10 items-center justify-center rounded-lg bg-[#3156ee] text-white">
          Collect payment
        </div>
      </div>
    </div>
  );
}

function SamplePayments() {
  return (
    <div className="rounded-2xl border border-[#dce4f1] bg-white p-5 shadow-[0_20px_50px_rgba(17,39,87,0.1)] sm:p-7">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="caption-2 text-[#657286]">Today&apos;s collection · sample</p>
          <p className="heading-5 mt-1 text-[#17233a]">LKR 1,485</p>
        </div>
        <div className="flex size-10 items-center justify-center rounded-xl bg-[#edf1ff] text-[#3156ee]">
          <CalendarDays aria-hidden="true" size={20} />
        </div>
      </div>
      <div className="mt-7 flex h-28 items-end gap-2 border-b border-[#dce4f1] pb-1 sm:gap-3">
        {[34, 58, 47, 72, 53, 91, 68, 83, 62, 96, 77, 88].map((height, index) => (
          <span
            aria-hidden="true"
            className={`flex-1 rounded-t-md ${index === 9 ? "bg-[#3156ee]" : "bg-[#d9e3ff]"}`}
            key={index}
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
      <div className="mt-5 flex items-center justify-between gap-3">
        <span className="caption-2 text-[#657286]">Recent payments, latest first</span>
        <span className="button-sm inline-flex items-center gap-1 rounded-full border border-[#dce4f1] px-3 py-2 text-[#3156ee]">
          <ArrowDownToLine aria-hidden="true" size={15} /> CSV
        </span>
      </div>
    </div>
  );
}

function SampleMessages() {
  return (
    <div className="rounded-2xl border border-[#dce4f1] bg-white p-5 shadow-[0_20px_50px_rgba(17,39,87,0.1)] sm:p-7">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="title-3 text-[#17233a]">Message templates</p>
          <p className="caption-4 text-[#657286]">Compose once, reuse when needed</p>
        </div>
        <MessageSquareText aria-hidden="true" className="text-[#3156ee]" size={23} />
      </div>
      <div className="mt-6 rounded-xl bg-[#f5f7ff] p-4">
        <p className="caption-3 text-[#3156ee]">Payment reminder · sample</p>
        <p className="body-6 mt-3 leading-6 text-[#26344b]">
          Hello {"{{borrowerName}}"}, your scheduled payment is {"{{amount}}"}.
          Please contact your lender if you need help.
        </p>
      </div>
      <div className="mt-5 flex items-center gap-2 text-[#4d5d73]">
        <Check aria-hidden="true" className="text-[#3156ee]" size={17} />
        <span className="caption-2">Sending requires an approved sender ID</span>
      </div>
    </div>
  );
}

export function CapabilityExplorer() {
  const [activeKey, setActiveKey] = useState<WorkflowKey>("borrowers");
  const active = WORKFLOWS.find((workflow) => workflow.key === activeKey)!;

  return (
    <section className="bg-[#f6f8fc] py-16 sm:py-20" id="capabilities">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="max-w-[680px]">
          <h2 className="heading-3 text-[#17233a] [text-wrap:balance]">
            See how the work fits together.
          </h2>
          <p className="body-3 mt-4 text-[#657286] [text-wrap:pretty]">
            From a new borrower to the day&apos;s final collection, each step
            stays connected. Choose a workflow to see what that looks like.
          </p>
        </div>

        <div aria-label="Explore lending workflows" className="mt-8 flex gap-2 overflow-x-auto pb-2">
          {WORKFLOWS.map((workflow) => {
            const Icon = workflow.icon;
            return (
              <button
                aria-pressed={activeKey === workflow.key}
                className={`button-sm inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full px-4 transition-[background-color,color,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3156ee] active:scale-[0.98] ${
                  activeKey === workflow.key
                    ? "bg-[#3156ee] text-white"
                    : "border border-[#dce4f1] bg-white text-[#43516b] hover:bg-[#edf1ff]"
                }`}
                key={workflow.key}
                onClick={() => setActiveKey(workflow.key)}
                type="button"
              >
                <Icon aria-hidden="true" size={17} />
                {workflow.label}
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid items-center gap-8 overflow-hidden rounded-2xl border border-[#dce4f1] bg-white p-5 sm:p-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-12 lg:p-12">
          <div aria-live="polite" className="max-w-[420px]">
            <p className="caption-3 text-[#3156ee]">{active.label}</p>
            <h3 className="heading-4 mt-4 text-[#17233a] [text-wrap:balance]">
              {active.title}
            </h3>
            <p className="body-3 mt-4 text-[#657286] [text-wrap:pretty]">
              {active.description}
            </p>
            <ul className="mt-7 space-y-3">
              {active.details.map((detail) => (
                <li className="body-6 flex items-center gap-3 text-[#26344b]" key={detail}>
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#eaf0ff] text-[#3156ee]">
                    <Check aria-hidden="true" size={14} />
                  </span>
                  {detail}
                </li>
              ))}
            </ul>
          </div>

          <div className="min-w-0 rounded-2xl bg-[#edf1ff] p-4 sm:p-6 lg:p-8">
            {activeKey === "borrowers" && <SampleBorrowers />}
            {activeKey === "collections" && <SampleCollection />}
            {activeKey === "payments" && <SamplePayments />}
            {activeKey === "messages" && <SampleMessages />}
          </div>
        </div>
        <p className="caption-4 mt-4 text-[#657286]">
          Product illustrations use sample records. No customer data is shown.
        </p>
      </div>
    </section>
  );
}
