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
  const { borrower, loans, pageInfo } = await getBorrowerProfileData(
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
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#657386]">Borrower profile</p>
          <h1 className="mt-2 text-3xl font-semibold">{borrower.name}</h1>
          <div className="mt-2 space-y-1 text-sm text-[#657386]">
            <p>{borrower.businessName || "No business name"}</p>
            <p>Contact: {borrower.contactInfo || "No contact number"}</p>
            <p>Address: {borrower.addressInfo || "No address"}</p>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <CreateLoanForm borrowerId={borrower.id} />
          <Link
            className="flex h-10 items-center rounded-md border border-[#cfd8e3] px-4 text-sm font-medium text-[#2d3745] transition hover:bg-[#f8fafc]"
            href="/borrowers"
          >
            Back
          </Link>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
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

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-[#dfe5ec] bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-[#657386]">{label}</p>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
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
      className={`rounded-lg border p-5 shadow-sm transition ${
        active
          ? "border-[#1d4ed8] bg-[#eef4ff]"
          : "border-[#dfe5ec] bg-white hover:border-[#b9c7d8] hover:bg-[#f8fafc]"
      }`}
      href={href}
    >
      <p className="text-sm font-medium text-[#657386]">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-[#15191f]">{value}</p>
    </Link>
  );
}
