"use client";

import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import type { DashboardLoan } from "@/backend/services/dashboard-service";
import { DashboardLoanDetailsDialog } from "@/frontend/components/dashboard/dashboard-loan-details-dialog";

type DashboardStat = {
  label: string;
  value: string;
  change: string;
};

export function LenderDashboardStats({
  stats,
  today,
}: {
  stats: DashboardStat[];
  today: string;
}) {
  const [showOverdueLoans, setShowOverdueLoans] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<DashboardLoan | null>(null);
  const [overdueLoans, setOverdueLoans] = useState<DashboardLoan[]>([]);
  const [loadedTotal, setLoadedTotal] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const overdueTotal = Number(
    stats.find((stat) => stat.label === "Overdue loans")?.value ?? 0,
  );
  const displayedTotal = loadedTotal ?? overdueTotal;

  async function openOverdueLoans() {
    setShowOverdueLoans(true);
    if (loadedTotal !== null || isLoading) {
      return;
    }

    await loadOverdueLoans();
  }

  async function loadOverdueLoans() {
    setIsLoading(true);
    setLoadError("");

    try {
      const response = await fetch(
        `/api/dashboard/overdue-loans?asOf=${encodeURIComponent(today)}`,
        { cache: "no-store" },
      );
      if (!response.ok) {
        throw new Error("Overdue loans are unavailable.");
      }

      const result = (await response.json()) as {
        loans: DashboardLoan[];
        total: number;
      };
      setOverdueLoans(result.loans);
      setLoadedTotal(result.total);
    } catch {
      setLoadError("Overdue loans could not be loaded. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        {stats.map((stat, index) => {
          if (stat.label === "Today's collection") {
            return (
              <Link
                className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d4ed8] focus-visible:ring-offset-2"
                href={`/payments/daily?date=${today}`}
                key={`${stat.label}-${index}`}
              >
                <StatCard stat={stat} />
              </Link>
            );
          }

          if (stat.label === "Overdue loans") {
            return (
              <button
                className="block min-h-28 rounded-lg border border-[#dfe5ec] bg-white p-4 text-left shadow-sm transition hover:border-[#f59e0b] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d4ed8] focus-visible:ring-offset-2 disabled:cursor-default disabled:hover:border-[#dfe5ec] disabled:hover:shadow-sm md:min-h-36 md:p-5"
                disabled={overdueTotal === 0}
                key={`${stat.label}-${index}`}
                onClick={openOverdueLoans}
                type="button"
              >
                <span className="block text-sm font-medium text-[#657386]">
                  {stat.label}
                </span>
                <span className="mt-2 block text-2xl font-semibold md:mt-3 md:text-3xl">
                  {stat.value}
                </span>
                <span className="mt-2 hidden text-sm text-[#166534] sm:block">
                  {stat.change}
                </span>
              </button>
            );
          }

          return <StatCard key={`${stat.label}-${index}`} stat={stat} />;
        })}
      </div>

      {showOverdueLoans && !selectedLoan ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:px-4"
          onClick={() => setShowOverdueLoans(false)}
        >
          <section
            aria-labelledby="overdue-loans-title"
            aria-modal="true"
            className="max-h-[calc(100dvh-0.75rem)] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:max-h-[calc(100vh-48px)] sm:rounded-lg"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-[#dfe5ec] bg-white px-4 py-4 sm:px-6 sm:py-5">
              <div>
                <p className="text-sm font-medium text-[#b45309]">
                  Needs attention
                </p>
                <h2 className="mt-1 text-2xl font-semibold" id="overdue-loans-title">
                  Overdue loans
                </h2>
                <p className="mt-1 text-sm text-[#657386]">
                  {displayedTotal} {displayedTotal === 1 ? "loan has" : "loans have"} passed the end date.
                </p>
              </div>
              <button
                className="shrink-0 rounded-md border border-[#cfd8e3] px-3 py-2 text-sm font-medium text-[#2d3745] transition hover:bg-[#f8fafc]"
                onClick={() => setShowOverdueLoans(false)}
                type="button"
              >
                Close
              </button>
            </div>
            <div className={overdueLoans.length > 0 ? "divide-y divide-[#eef2f6]" : undefined}>
              {isLoading ? (
                <p
                  className="flex items-center gap-2 p-6 text-sm text-[#657386]"
                  role="status"
                >
                  <LoaderCircle
                    aria-hidden="true"
                    className="animate-spin text-[#2563eb]"
                    size={17}
                  />
                  Loading overdue loans…
                </p>
              ) : null}
              {!isLoading && loadError ? (
                <div className="p-6">
                  <p className="text-sm text-[#b91c1c]">{loadError}</p>
                  <button
                    className="mt-3 h-10 rounded-md border border-[#cfd8e3] px-4 text-sm font-semibold text-[#1d4ed8] transition hover:bg-[#f8fafc]"
                    onClick={loadOverdueLoans}
                    type="button"
                  >
                    Try again
                  </button>
                </div>
              ) : null}
              {!isLoading && !loadError ? overdueLoans.map((loan) => (
                <button
                  className="block w-full p-4 text-left transition hover:bg-[#f8fafc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1d4ed8] sm:px-6"
                  key={loan.id}
                  onClick={() => setSelectedLoan(loan)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-[#15191f]">
                        {loan.borrower}
                      </p>
                      <p className="mt-1 text-sm text-[#657386]">
                        Ended {loan.endDate}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#657386]">
                        Remaining
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[#b91c1c]">
                        {loan.remainingAmount}
                      </p>
                    </div>
                  </div>
                  <span className="mt-3 block text-sm font-semibold text-[#1d4ed8]">
                    View loan details
                  </span>
                </button>
              )) : null}
            </div>
            <div className="sticky bottom-0 border-t border-[#dfe5ec] bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
              <Link
                className="flex h-10 items-center justify-center rounded-md border border-[#cfd8e3] text-sm font-semibold text-[#1d4ed8] transition hover:bg-[#f8fafc]"
                href={`/loans?attention=overdue&asOf=${today}`}
              >
                View all overdue loans
              </Link>
            </div>
          </section>
        </div>
      ) : null}

      {selectedLoan ? (
        <DashboardLoanDetailsDialog
          loan={selectedLoan}
          onClose={() => setSelectedLoan(null)}
        />
      ) : null}
    </>
  );
}

function StatCard({ stat }: { stat: DashboardStat }) {
  return (
    <article className="h-full min-h-28 rounded-lg border border-[#dfe5ec] bg-white p-4 shadow-sm transition hover:border-[#c7d2fe] md:min-h-36 md:p-5">
      <p className="text-sm font-medium text-[#657386]">{stat.label}</p>
      <p className="mt-2 text-2xl font-semibold md:mt-3 md:text-3xl">
        {stat.value}
      </p>
      <p className="mt-2 hidden text-sm text-[#166534] sm:block">
        {stat.change}
      </p>
    </article>
  );
}
