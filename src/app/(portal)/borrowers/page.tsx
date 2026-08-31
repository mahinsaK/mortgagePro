import Link from "next/link";
import Form from "next/form";
import { Search, X } from "lucide-react";
import { getBorrowersPageData } from "@/backend/services/lending-service";
import { AddBorrowerForm } from "@/frontend/components/borrowers/add-borrower-form";
import { BorrowersTable } from "@/frontend/components/borrowers/borrowers-table";
import { PaginationControls } from "@/frontend/components/ui/pagination-controls";
import { PendingSubmitButton } from "@/frontend/components/ui/pending-submit-button";

export const dynamic = "force-dynamic";

export default async function BorrowersPage({
  searchParams,
}: {
  searchParams: Promise<{ attention?: string; page?: string; q?: string }>;
}) {
  const { attention: requestedAttention, page, q } = await searchParams;
  const attention = requestedAttention === "missing-phone"
    ? "missing-phone"
    : undefined;
  const query = String(q ?? "").trim().slice(0, 100);
  const { borrowers, pageInfo } = await getBorrowersPageData({
    attention,
    page: Number(page) || 1,
    query,
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
            scroll={false}
          >
            Clear filter
          </Link>
        </div>
      ) : null}

      <section className="rounded-lg border border-[#dfe5ec] bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-[#dfe5ec] px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Borrowers list</h2>
            {query ? (
              <p className="mt-1 text-sm text-[#657386]">
                {pageInfo.total} result{pageInfo.total === 1 ? "" : "s"} found
              </p>
            ) : null}
          </div>
          <Form
            action="/borrowers"
            className="flex w-full max-w-xl flex-col gap-2 min-[380px]:flex-row"
            scroll={false}
          >
            {attention ? (
              <input name="attention" type="hidden" value={attention} />
            ) : null}
            <label className="flex h-11 min-w-0 flex-1 items-center rounded-md border border-[#cfd8e3] bg-white px-3 transition focus-within:border-[#1d4ed8] focus-within:ring-2 focus-within:ring-[#dbeafe]">
              <Search
                aria-hidden="true"
                className="mr-2 shrink-0 text-[#657386]"
                size={18}
              />
              <span className="sr-only">Search borrowers</span>
              <input
                className="h-full min-w-0 flex-1 border-0 bg-transparent text-base outline-none sm:text-sm"
                defaultValue={query}
                maxLength={100}
                name="q"
                placeholder="Name, business, phone or address"
                type="search"
              />
            </label>
            <PendingSubmitButton
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#15191f] px-4 text-sm font-semibold text-white transition hover:bg-[#2d3745] disabled:cursor-wait disabled:opacity-70"
              pendingLabel="Searching…"
            >
              Search
            </PendingSubmitButton>
            {query ? (
              <Link
                aria-label="Clear borrower search"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#cfd8e3] px-3 text-sm font-semibold text-[#526174] transition hover:bg-[#f8fafc]"
                href={attention ? `/borrowers?attention=${attention}` : "/borrowers"}
                scroll={false}
              >
                <X aria-hidden="true" size={16} />
                Clear
              </Link>
            ) : null}
          </Form>
        </div>
        <div>
          <BorrowersTable borrowers={borrowers} />
        </div>
        <PaginationControls
          basePath="/borrowers"
          pageInfo={pageInfo}
          query={{ attention, q: query || undefined }}
        />
      </section>
    </div>
  );
}
