import { getLoansPageData } from "@/backend/services/lending-service";
import { LoansTable } from "@/frontend/components/loans/loans-table";
import { PaginationControls } from "@/frontend/components/ui/pagination-controls";

export const dynamic = "force-dynamic";

export default async function LoansPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const { loans, pageInfo } = await getLoansPageData({
    page: Number(page) || 1,
  });

  return (
    <div>
      <div className="mb-6 md:mb-8">
        <p className="text-sm font-medium text-[#657386]">Loans</p>
        <h1 className="mt-1 text-2xl font-semibold md:mt-2 md:text-3xl">Loan records</h1>
      </div>

      <section className="rounded-lg border border-[#dfe5ec] bg-white shadow-sm">
        <div className="border-b border-[#dfe5ec] px-5 py-4">
          <h2 className="text-lg font-semibold">Loans list</h2>
        </div>
        <LoansTable loans={loans} />
        <PaginationControls basePath="/loans" pageInfo={pageInfo} />
      </section>
    </div>
  );
}
