import { getLenderDashboardData } from "@/backend/services/dashboard-service";
import { DashboardDateTime } from "@/frontend/components/dashboard/dashboard-date-time";
import { LenderDashboardLoansPanel } from "@/frontend/components/dashboard/lender-dashboard-loans-panel";
import { LenderDashboardStats } from "@/frontend/components/dashboard/lender-dashboard-stats";

export const dynamic = "force-dynamic";

export default async function LenderDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const { page, q } = await searchParams;
  const dashboard = await getLenderDashboardData({
    page: Number(page) || 1,
    query: q,
  });
  const now = new Date();
  const today = toColomboDateInputValue(now);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between md:mb-8">
        <div>
          <p className="text-sm font-medium text-[#657386]">Dashboard</p>
          <h1 className="mt-1 text-2xl font-semibold md:mt-2 md:text-3xl">
            Business overview
          </h1>
        </div>
        <DashboardDateTime initialIso={now.toISOString()} />
      </div>

      <LenderDashboardStats
        overdueLoans={dashboard.overdueLoans}
        stats={dashboard.stats}
        today={today}
      />

      <LenderDashboardLoansPanel
        loans={dashboard.loans}
        pageInfo={dashboard.pageInfo}
        query={q ?? ""}
      />
    </div>
  );
}

function toColomboDateInputValue(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Colombo",
    year: "numeric",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${value.year}-${value.month}-${value.day}`;
}
