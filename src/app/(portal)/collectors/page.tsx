import { getCollectorsPageData } from "@/server/services/lending-service";
import { AddCollectorForm } from "@/features/collectors/components/add-collector-form";
import { CollectorsInfiniteList } from "@/features/collectors/components/collectors-infinite-list";

export const dynamic = "force-dynamic";

/** Renders collector totals and the first infinite-directory page. */
export default async function CollectorsPage() {
  const { collectors, pageInfo, summary } = await getCollectorsPageData({
    page: 1,
    pageSize: 20,
  });

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <p className="text-sm font-medium text-[#657386]">Collectors</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:mt-2 sm:text-3xl">Collector profiles</h1>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:mb-6">
        <SummaryCard label="Total collectors" value={String(summary.total)} />
        <SummaryCard label="Active collectors" value={String(summary.active)} />
        <SummaryCard
          label="Inactive collectors"
          value={String(summary.inactive)}
          wideOnMobile
        />
      </div>

      <AddCollectorForm />

      <section className="@container min-w-0 overflow-hidden rounded-xl border border-[#dfe5ec] bg-white shadow-[var(--mp-shadow-sm)]">
        <div className="border-b border-[#dfe5ec] px-5 py-4">
          <h2 className="text-lg font-semibold">Collectors list</h2>
        </div>
        <CollectorsInfiniteList initialPage={{ items: collectors, pageInfo }} />
      </section>
    </div>
  );
}

/** Displays one collector summary metric. */
function SummaryCard({
  label,
  value,
  wideOnMobile = false,
}: {
  label: string;
  value: string;
  wideOnMobile?: boolean;
}) {
  return (
    <article className={`rounded-xl border border-[#dfe5ec] bg-white p-4 shadow-[var(--mp-shadow-sm)] sm:col-span-1 lg:p-5 ${wideOnMobile ? "col-span-2" : ""}`}>
      <p className="text-xs font-medium leading-tight text-[#657386] sm:text-sm">{label}</p>
      <p className="mt-2 text-xl font-semibold tracking-tight sm:mt-3 sm:text-2xl">{value}</p>
    </article>
  );
}
