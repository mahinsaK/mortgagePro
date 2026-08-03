import Link from "next/link";
import { isValidDateOnly } from "@/backend/modules/notifications/dto";
import { getLoansPageData } from "@/backend/services/lending-service";
import type { LoanAttentionFilter } from "@/backend/services/lending-service";
import { LoansTable } from "@/frontend/components/loans/loans-table";
import { PaginationControls } from "@/frontend/components/ui/pagination-controls";

export const dynamic = "force-dynamic";

export default async function LoansPage({
  searchParams,
}: {
  searchParams: Promise<{ asOf?: string; attention?: string; page?: string }>;
}) {
  const { asOf, attention: requestedAttention, page } = await searchParams;
  const attention = normalizeAttention(requestedAttention);
  const normalizedAsOf = asOf && isValidDateOnly(asOf) ? asOf : undefined;
  const { loans, pageInfo } = await getLoansPageData({
    asOf: normalizedAsOf,
    attention,
    page: Number(page) || 1,
  });

  return (
    <div>
      <div className="mb-6 md:mb-8">
        <p className="text-sm font-medium text-[#657386]">Loans</p>
        <h1 className="mt-1 text-2xl font-semibold md:mt-2 md:text-3xl">Loan records</h1>
      </div>

      {attention && normalizedAsOf ? (
        <div className="mb-5 flex flex-col gap-3 rounded-lg border border-[#fed7aa] bg-[#fff7ed] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#9a3412]">
              {attentionLabel(attention)}
            </p>
            <p className="mt-1 text-sm text-[#7c2d12]">
              Showing unfinished loans with a remaining balance.
            </p>
          </div>
          <Link
            className="shrink-0 text-sm font-semibold text-[#9a3412] underline-offset-4 hover:underline"
            href="/loans"
          >
            Clear filter
          </Link>
        </div>
      ) : null}

      <section className="rounded-lg border border-[#dfe5ec] bg-white shadow-sm">
        <div className="border-b border-[#dfe5ec] px-5 py-4">
          <h2 className="text-lg font-semibold">Loans list</h2>
        </div>
        <LoansTable loans={loans} />
        <PaginationControls
          basePath="/loans"
          pageInfo={pageInfo}
          query={{
            asOf: attention ? normalizedAsOf : undefined,
            attention: normalizedAsOf ? attention : undefined,
          }}
        />
      </section>
    </div>
  );
}

function normalizeAttention(value: string | undefined): LoanAttentionFilter | undefined {
  return value === "overdue" ||
    value === "ending-today" ||
    value === "ending-soon"
    ? value
    : undefined;
}

function attentionLabel(attention: LoanAttentionFilter) {
  if (attention === "overdue") {
    return "Overdue loans";
  }

  if (attention === "ending-today") {
    return "Loans ending today";
  }

  return "Loans ending within 7 days";
}
