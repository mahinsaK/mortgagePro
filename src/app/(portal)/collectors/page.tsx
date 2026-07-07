import { getCollectorsPageData } from "@/backend/services/lending-service";
import { AddCollectorForm } from "@/frontend/components/collectors/add-collector-form";
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
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead className="bg-[#f8fafc] text-[#657386]">
              <tr>
                <th className="px-5 py-3 font-semibold">Name</th>
                <th className="px-5 py-3 font-semibold">Contact</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Created</th>
              </tr>
            </thead>
            <tbody>
              {collectors.map((collector) => (
                <tr className="border-t border-[#eef2f6]" key={collector.id}>
                  <td className="px-5 py-4">
                    <p className="font-medium">{collector.name}</p>
                    <p className="mt-1 text-xs text-[#657386]">{collector.id}</p>
                  </td>
                  <td className="px-5 py-4 text-[#657386]">
                    {collector.contactInfo || "No contact info"}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={
                        collector.status === "active"
                          ? "rounded-full bg-[#dcfce7] px-3 py-1 text-xs font-semibold text-[#166534]"
                          : "rounded-full bg-[#f1f5f9] px-3 py-1 text-xs font-semibold text-[#64748b]"
                      }
                    >
                      {collector.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-[#657386]">
                    {collector.createdAt}
                  </td>
                </tr>
              ))}
              {collectors.length === 0 ? (
                <tr className="border-t border-[#eef2f6]">
                  <td className="px-5 py-6 text-[#657386]" colSpan={4}>
                    No collectors found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
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
