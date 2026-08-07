import Link from "next/link";
import { notFound } from "next/navigation";
import { getBorrowerProfileData } from "@/backend/services/lending-service";
import { BorrowerLoansGrid } from "@/frontend/components/borrowers/borrower-loans-grid";
import { CreateLoanForm } from "@/frontend/components/loans/create-loan-form";
import { PaginationControls } from "@/frontend/components/ui/pagination-controls";

export const dynamic = "force-dynamic";

export default async function BorrowerProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ borrowerId: string }>;
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const { borrowerId } = await params;
  const { page, status } = await searchParams;
  const loanStatus = status === "completed" ? "completed" : undefined;
  const { borrower, currency, loans, pageInfo } = await getBorrowerProfileData(
    borrowerId,
    {
      page: Number(page) || 1,
      pageSize: 5,
      loanStatus,
    },
  );

  if (!borrower) {
    notFound();
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between md:mb-8">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#657386]">Borrower profile</p>
          <h1 className="mt-1 truncate text-2xl font-semibold md:mt-2 md:text-3xl">{borrower.name}</h1>
          <div className="mt-2 space-y-1 text-sm text-[#657386]">
            <p>{borrower.businessName || "No business name"}</p>
            <p>Contact: {borrower.contactInfo || "No contact number"}</p>
            <p>Address: {borrower.addressInfo || "No address"}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:shrink-0 sm:justify-end">
          <CreateLoanForm
            borrowerId={borrower.id}
            currency={currency}
            defaultStartDate={toColomboDateInputValue(new Date())}
          />
          <Link
            className="flex h-10 items-center rounded-md border border-[#cfd8e3] px-4 text-sm font-medium text-[#2d3745] transition hover:bg-[#f8fafc]"
            href="/borrowers"
          >
            Back
          </Link>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-2 md:mb-6 md:grid-cols-4 md:gap-4">
        <SummaryCard label="Total loans" value={String(borrower.loanCount ?? 0)} />
        <SummaryCard
          label="Active loans"
          value={String(borrower.activeLoanCount ?? 0)}
        />
        <SummaryCardLink
          active={loanStatus === "completed"}
          href={
            loanStatus === "completed"
              ? `/borrowers/${borrower.id}`
              : `/borrowers/${borrower.id}?status=completed`
          }
          label="Completed loans"
          value={String(borrower.completedLoanCount ?? 0)}
        />
        <SummaryCard label="Status" value={borrower.status} />
      </div>

      <section>
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Loans</h2>
        </div>
        <BorrowerLoansGrid loans={loans} />
        <PaginationControls
          basePath={`/borrowers/${borrower.id}`}
          pageInfo={pageInfo}
          query={{ status: loanStatus }}
        />
      </section>
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

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-[#dfe5ec] bg-white p-3 shadow-sm md:p-5">
      <p className="text-xs font-medium text-[#657386] md:text-sm">{label}</p>
      <p className="mt-2 truncate text-xl font-semibold capitalize md:mt-3 md:text-2xl">{value}</p>
    </article>
  );
}

function SummaryCardLink({
  active,
  href,
  label,
  value,
}: {
  active: boolean;
  href: string;
  label: string;
  value: string;
}) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`rounded-lg border p-3 shadow-sm transition md:p-5 ${
        active
          ? "border-[#1d4ed8] bg-[#eef4ff]"
          : "border-[#dfe5ec] bg-white hover:border-[#b9c7d8] hover:bg-[#f8fafc]"
      }`}
      href={href}
    >
      <p className="text-xs font-medium text-[#657386] md:text-sm">{label}</p>
      <p className="mt-2 text-xl font-semibold text-[#15191f] md:mt-3 md:text-2xl">{value}</p>
    </Link>
  );
}
