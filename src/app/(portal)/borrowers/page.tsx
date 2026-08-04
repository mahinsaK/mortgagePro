import Link from "next/link";
import { getBorrowersPageData } from "@/backend/services/lending-service";
import { AddBorrowerForm } from "@/frontend/components/borrowers/add-borrower-form";
import { BorrowersTable } from "@/frontend/components/borrowers/borrowers-table";
import { PaginationControls } from "@/frontend/components/ui/pagination-controls";

export const dynamic = "force-dynamic";

export default async function BorrowersPage({
  searchParams,
}: {
  searchParams: Promise<{ attention?: string; page?: string }>;
}) {
  const { attention: requestedAttention, page } = await searchParams;
  const attention = requestedAttention === "missing-phone"
    ? "missing-phone"
    : undefined;
  const { borrowers, pageInfo } = await getBorrowersPageData({
    attention,
    page: Number(page) || 1,
  });

  return (
    <div>
      <div className="mb-6 md:mb-8">
        <p className="text-sm font-medium text-[#657386]">Borrowers</p>
        <h1 className="mt-1 text-2xl font-semibold md:mt-2 md:text-3xl">Borrower profiles</h1>
      </div>

      <AddBorrowerForm />

      {attention ? (
        <div className="mb-5 flex flex-col gap-3 rounded-lg border border-[#fed7aa] bg-[#fff7ed] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#9a3412]">
              Borrowers missing a usable phone number
            </p>
            <p className="mt-1 text-sm text-[#7c2d12]">
              Showing active borrowers who cannot currently be contacted by phone or SMS.
            </p>
          </div>
          <Link
            className="shrink-0 text-sm font-semibold text-[#9a3412] underline-offset-4 hover:underline"
            href="/borrowers"
          >
            Clear filter
          </Link>
        </div>
      ) : null}

      <section className="rounded-lg border border-[#dfe5ec] bg-white shadow-sm">
        <div className="border-b border-[#dfe5ec] px-5 py-4">
          <h2 className="text-lg font-semibold">Borrowers list</h2>
        </div>
        <div>
          <BorrowersTable borrowers={borrowers} />
        </div>
        <PaginationControls
          basePath="/borrowers"
          pageInfo={pageInfo}
          query={{ attention }}
        />
      </section>
    </div>
  );
}
