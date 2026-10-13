import Link from "next/link";
import { isValidDateOnly } from "@/backend/modules/notifications/dto";
import { getLoansPageData } from "@/backend/services/lending-service";
import type { LoanAttentionFilter } from "@/backend/services/lending-service";
import { LoansInfiniteList } from "@/frontend/components/loans/loans-infinite-list";

export const dynamic = "force-dynamic";

/** Renders the first filtered loan page and delegates later pages to the client. */
export default async function LoansPage({
  searchParams,
}: {
  searchParams: Promise<{ asOf?: string; attention?: string; page?: string }>;
}) {
  const { asOf, attention: requestedAttention } = await searchParams;
  const attention = normalizeAttention(requestedAttention);
  const normalizedAsOf = asOf && isValidDateOnly(asOf) ? asOf : undefined;
  const { loans, pageInfo } = await getLoansPageData({
    asOf: normalizedAsOf,
    attention,
    page: 1,
    pageSize: 20,
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
            scroll={false}
          >
            Clear filter
          </Link>
        </div>
      ) : null}

      <section className="rounded-lg border border-[#dfe5ec] bg-white shadow-sm">
        <div className="border-b border-[#dfe5ec] px-5 py-4">
          <h2 className="text-lg font-semibold">Loans list</h2>
        </div>
        <LoansInfiniteList
          asOf={attention ? normalizedAsOf : undefined}
          attention={normalizedAsOf ? attention : undefined}
          initialPage={{ items: loans, pageInfo }}
        />
      </section>
    </div>
  );
}

/** Accepts only supported loan attention filters from the URL. */
function normalizeAttention(value: string | undefined): LoanAttentionFilter | undefined {
  return value === "overdue" ||
    value === "ending-today" ||
    value === "ending-soon"
    ? value
    : undefined;
}

/** Returns the human-readable heading for a loan attention filter. */
function attentionLabel(attention: LoanAttentionFilter) {
  if (attention === "overdue") {
    return "Overdue loans";
  }

  if (attention === "ending-today") {
    return "Loans ending today";
  }

  return "Loans ending within 7 days";
}
