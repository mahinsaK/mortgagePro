"use client";

import {
  CheckCircle2,
  QrCode,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  WalletCards,
} from "lucide-react";
import { useState } from "react";

type PreviewMode = "lender" | "collector";

type SampleLoan = {
  id: string;
  borrower: string;
  collector: string;
  dailyAmount: number;
  remainingBalance: number;
  status: "Active" | "Overdue";
};

const INITIAL_LOANS: SampleLoan[] = [
  {
    id: "LN 4081",
    borrower: "Kamal Perera",
    collector: "Maya Silva",
    dailyAmount: 45,
    remainingBalance: 630,
    status: "Active",
  },
  {
    id: "LN 4087",
    borrower: "Nadeesha Fernando",
    collector: "Jordan Dias",
    dailyAmount: 60,
    remainingBalance: 1140,
    status: "Active",
  },
  {
    id: "LN 4092",
    borrower: "Roshan Jayawardena",
    collector: "Nina Mendis",
    dailyAmount: 35,
    remainingBalance: 245,
    status: "Overdue",
  },
];

export function InteractiveWorkspacePreview() {
  const [mode, setMode] = useState<PreviewMode>("lender");
  const [collectedSample, setCollectedSample] = useState(false);

  const loans = INITIAL_LOANS.map((loan) =>
    collectedSample && loan.id === "LN 4081"
      ? { ...loan, remainingBalance: loan.remainingBalance - loan.dailyAmount }
      : loan,
  );

  const todaysCollection = collectedSample ? 1485 : 1440;
  const activeLoan = loans[0];

  return (
    <div
      aria-label="Interactive illustration of MortgagePro lender desk and collector scanner"
      className="rounded-2xl border border-[var(--mp-border)] bg-[var(--mp-surface)] p-4 shadow-[0_20px_50px_rgba(15,23,42,0.1)] sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--mp-border)] pb-4">
        <div
          aria-label="Workspace preview mode"
          className="inline-flex rounded-xl border border-[var(--mp-border)] bg-[var(--mp-surface-muted)] p-1"
          role="tablist"
        >
          <button
            aria-selected={mode === "lender"}
            className={`button-sm inline-flex min-h-10 items-center gap-2 rounded-lg px-3 transition-[background-color,color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              mode === "lender"
                ? "bg-[var(--mp-surface)] text-[var(--foreground)] shadow-sm"
                : "text-[var(--mp-muted)] hover:text-[var(--foreground)]"
            }`}
            onClick={() => setMode("lender")}
            role="tab"
            type="button"
          >
            <WalletCards aria-hidden="true" size={16} />
            Lender desk
          </button>
          <button
            aria-selected={mode === "collector"}
            className={`button-sm inline-flex min-h-10 items-center gap-2 rounded-lg px-3 transition-[background-color,color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              mode === "collector"
                ? "bg-[var(--mp-surface)] text-[var(--foreground)] shadow-sm"
                : "text-[var(--mp-muted)] hover:text-[var(--foreground)]"
            }`}
            onClick={() => setMode("collector")}
            role="tab"
            type="button"
          >
            <QrCode aria-hidden="true" size={16} />
            Collector scanner
          </button>
        </div>

        <span className="caption-4 rounded-lg border border-[var(--mp-border)] bg-[var(--mp-surface-muted)] px-3 py-1 text-[var(--mp-muted)]">
          Interactive illustration with sample figures
        </span>
      </div>

      {mode === "lender" ? (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[var(--mp-border)] bg-[var(--mp-surface-muted)] p-4">
              <p className="caption-2 text-[var(--mp-muted)]">
                Today collection
              </p>
              <p className="heading-5 mt-1 font-mono text-[var(--foreground)]">
                LKR {todaysCollection.toLocaleString()}
              </p>
              <p className="caption-3 mt-1 text-[#166534]">
                {collectedSample ? "Updated from field scan" : "24 receipts recorded"}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--mp-border)] bg-[var(--mp-surface-muted)] p-4">
              <p className="caption-2 text-[var(--mp-muted)]">Active loans</p>
              <p className="heading-5 mt-1 font-mono text-[var(--foreground)]">
                42
              </p>
              <p className="caption-4 mt-1 text-[var(--mp-muted)]">
                3 field collectors
              </p>
            </div>
            <div className="col-span-2 rounded-xl border border-[var(--mp-border)] bg-[var(--mp-surface-muted)] p-4 sm:col-span-1">
              <p className="caption-2 text-[var(--mp-muted)]">Overdue loans</p>
              <p className="heading-5 mt-1 font-mono text-[var(--foreground)]">
                4
              </p>
              <p className="caption-3 mt-1 text-[#92400e]">
                Ready for SMS reminder
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-[var(--mp-border)]">
            <div className="flex items-center justify-between bg-[var(--mp-surface-muted)] px-4 py-3">
              <span className="body-4 text-[var(--foreground)]">
                Recent loan ledger
              </span>
              <span className="caption-4 text-[var(--mp-muted)]">
                Tenant scoped
              </span>
            </div>
            <div className="divide-y divide-[var(--mp-border)] bg-[var(--mp-surface)]">
              {loans.map((loan) => (
                <div
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                  key={loan.id}
                >
                  <div>
                    <p className="body-4 text-[var(--foreground)]">
                      {loan.borrower}
                    </p>
                    <p className="caption-4 text-[var(--mp-muted)]">
                      {loan.id} assigned to {loan.collector}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="body-4 font-mono text-[var(--foreground)]">
                        LKR {loan.remainingBalance}
                      </p>
                      <p className="caption-4 text-[var(--mp-muted)]">
                        LKR {loan.dailyAmount} daily
                      </p>
                    </div>
                    <span
                      className={`caption-3 rounded-lg px-2 py-1 ${
                        loan.status === "Overdue"
                          ? "bg-[#fffbeb] text-[#92400e]"
                          : "bg-[#f0fdf4] text-[#166534]"
                      }`}
                    >
                      {loan.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-[0.95fr_1.05fr]">
          <div className="flex flex-col justify-between rounded-xl border border-[#1d3b5c] bg-[#0b2848] p-4 text-white">
            <div>
              <div className="flex items-center justify-between">
                <span className="caption-3 inline-flex items-center gap-2 rounded-lg bg-white/10 px-2 py-1 text-[#d7eaff]">
                  <Smartphone aria-hidden="true" size={14} />
                  Mobile camera scan
                </span>
                <span className="caption-4 font-mono text-[#9ed2ff]">
                  {activeLoan.id}
                </span>
              </div>
              <p className="title-2 mt-4 text-white">{activeLoan.borrower}</p>
              <p className="caption-2 mt-1 text-[#cbd5e1]">
                Ownership checked against lender boundary before balance opens.
              </p>
            </div>

            <div className="mt-6 rounded-lg border border-white/15 bg-white/10 p-3">
              <div className="flex items-center justify-between">
                <span className="caption-4 text-[#cbd5e1]">
                  Remaining balance
                </span>
                <span className="body-1 font-mono text-white">
                  LKR {activeLoan.remainingBalance}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="caption-4 text-[#cbd5e1]">
                  Scheduled daily amount
                </span>
                <span className="body-4 font-mono text-[#9ed2ff]">
                  LKR {activeLoan.dailyAmount}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-xl border border-[var(--mp-border)] bg-[var(--mp-surface-muted)] p-4">
            <div>
              <p className="title-3 text-[var(--foreground)]">
                Record field payment
              </p>
              <p className="body-6 mt-1 text-[var(--mp-muted)]">
                Each submission carries a unique request key so poor mobile signal
                never records a duplicate payment.
              </p>

              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between rounded-lg border border-[var(--mp-border)] bg-[var(--mp-surface)] px-3 py-2">
                  <span className="caption-2 text-[var(--mp-muted)]">
                    Payment amount
                  </span>
                  <span className="body-4 font-mono text-[var(--foreground)]">
                    LKR {activeLoan.dailyAmount}.00
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-[var(--mp-border)] bg-[var(--mp-surface)] px-3 py-2">
                  <ShieldCheck
                    aria-hidden="true"
                    className="shrink-0 text-[#166534]"
                    size={16}
                  />
                  <span className="caption-4 text-[var(--mp-muted)]">
                    Atomic transaction blocks overpayments
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4">
              {collectedSample ? (
                <div className="space-y-3">
                  <div
                    className="flex items-center gap-2 rounded-lg border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-2 text-[#166534]"
                    role="status"
                  >
                    <CheckCircle2 aria-hidden="true" size={16} />
                    <span className="body-5">
                      Sample payment recorded. Balance updated to LKR{" "}
                      {activeLoan.remainingBalance}.
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="button-sm inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--mp-border)] bg-[var(--mp-surface)] px-3 py-2 text-[var(--foreground)] transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[var(--mp-surface-muted)]"
                      onClick={() => setMode("lender")}
                      type="button"
                    >
                      View updated lender desk
                    </button>
                    <button
                      className="button-sm inline-flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-[var(--mp-muted)] transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-[var(--foreground)]"
                      onClick={() => setCollectedSample(false)}
                      type="button"
                    >
                      <RotateCcw aria-hidden="true" size={14} />
                      Reset sample
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="button-sm inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[var(--mp-primary)] px-3 py-2 text-white transition-[background-color,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[var(--mp-primary-strong)] active:scale-[0.98]"
                  onClick={() => setCollectedSample(true)}
                  type="button"
                >
                  Test sample daily payment
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
