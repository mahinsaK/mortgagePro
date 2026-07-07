import { getCollectorsPageData } from "@/backend/services/lending-service";
import { AddCollectorForm } from "@/frontend/components/collectors/add-collector-form";
import { CollectorsTable } from "@/frontend/components/collectors/collectors-table";
import { PaginationControls } from "@/frontend/components/ui/pagination-controls";

export const dynamic = "force-dynamic";

export default async function CollectorsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const { collectors, pageInfo, summary } = await getCollectorsPageData({
    page: Number(page) || 1,
  });

  return (
    <div>
      <div className="mb-8">
        <p className="text-sm font-medium text-[#657386]">Collectors</p>
        <h1 className="mt-2 text-3xl font-semibold">Collector profiles</h1>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <SummaryCard label="Total collectors" value={String(summary.total)} />
        <SummaryCard label="Active collectors" value={String(summary.active)} />
        <SummaryCard
          label="Inactive collectors"
          value={String(summary.inactive)}
        />
      </div>

      <AddCollectorForm />

      <section className="rounded-lg border border-[#dfe5ec] bg-white shadow-sm">
        <div className="border-b border-[#dfe5ec] px-5 py-4">
          <h2 className="text-lg font-semibold">Collectors list</h2>
        </div>
        <div className="overflow-x-auto">
          <CollectorsTable collectors={collectors} />
        </div>
        <PaginationControls basePath="/collectors" pageInfo={pageInfo} />
      </section>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-[#dfe5ec] bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-[#657386]">{label}</p>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
    </article>
  );
}
