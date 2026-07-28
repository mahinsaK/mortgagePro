import Link from "next/link";
import { getLenderDashboardData } from "@/backend/services/dashboard-service";
import { LenderDashboardLoansPanel } from "@/frontend/components/dashboard/lender-dashboard-loans-panel";

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
  const today = toDateInputValue(new Date());

  return (
    <div>
      <div className="mb-6 md:mb-8">
        <p className="text-sm font-medium text-[#657386]">Dashboard</p>
        <h1 className="mt-1 text-2xl font-semibold md:mt-2 md:text-3xl">
          Business overview
        </h1>
      </div>

      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        {dashboard.stats.map((stat, index) =>
          stat.label === "Today's collection" ? (
            <Link
              className="block"
              href={`/payments/daily?date=${today}`}
              key={`${stat.label}-${index}`}
            >
              <StatCard stat={stat} />
            </Link>
          ) : (
            <StatCard key={`${stat.label || "blank"}-${index}`} stat={stat} />
          ),
        )}
      </div>

      <LenderDashboardLoansPanel
        loans={dashboard.loans}
        pageInfo={dashboard.pageInfo}
        query={q ?? ""}
      />
    </div>
  );
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function StatCard({
  stat,
}: {
  stat: { label: string; value: string; change: string };
}) {
  return (
    <article className="h-full min-h-28 rounded-lg border border-[#dfe5ec] bg-white p-4 shadow-sm transition hover:border-[#c7d2fe] md:min-h-36 md:p-5">
      {stat.label ? (
        <>
          <p className="text-sm font-medium text-[#657386]">{stat.label}</p>
          <p className="mt-2 text-2xl font-semibold md:mt-3 md:text-3xl">
            {stat.value}
          </p>
          <p className="mt-2 hidden text-sm text-[#166534] sm:block">
            {stat.change}
          </p>
        </>
      ) : null}
    </article>
  );
}
