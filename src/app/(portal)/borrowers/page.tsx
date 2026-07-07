import { getBorrowersPageData } from "@/backend/services/lending-service";
import { AddBorrowerForm } from "@/frontend/components/borrowers/add-borrower-form";
import { BorrowersTable } from "@/frontend/components/borrowers/borrowers-table";
import { PaginationControls } from "@/frontend/components/ui/pagination-controls";

export const dynamic = "force-dynamic";

export default async function BorrowersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const { borrowers, pageInfo } = await getBorrowersPageData({
    page: Number(page) || 1,
  });

  return (
    <div>
      <div className="mb-8">
        <p className="text-sm font-medium text-[#657386]">Borrowers</p>
        <h1 className="mt-2 text-3xl font-semibold">Borrower profiles</h1>
      </div>

      <AddBorrowerForm />

      <section className="rounded-lg border border-[#dfe5ec] bg-white shadow-sm">
        <div className="border-b border-[#dfe5ec] px-5 py-4">
          <h2 className="text-lg font-semibold">Borrowers list</h2>
        </div>
        <div className="overflow-x-auto">
          <BorrowersTable borrowers={borrowers} />
        </div>
        <PaginationControls basePath="/borrowers" pageInfo={pageInfo} />
      </section>
    </div>
  );
}
