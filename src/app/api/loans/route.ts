import { isValidDateOnly } from "@/backend/modules/notifications/dto";
import {
  getLoansPageData,
  type LoanAttentionFilter,
} from "@/backend/services/lending-service";
import { positivePage, privateJson } from "@/app/api/_shared/infinite-pagination";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 20;

/** Returns a tenant-scoped page of loans for infinite scrolling. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const attention = normalizeAttention(url.searchParams.get("attention"));
  const requestedAsOf = url.searchParams.get("asOf");
  const asOf = requestedAsOf && isValidDateOnly(requestedAsOf)
    ? requestedAsOf
    : undefined;

  if (requestedAsOf && !asOf) {
    return privateJson({ error: "The attention date is invalid." }, 400);
  }

  try {
    const result = await getLoansPageData({
      asOf,
      attention,
      page: positivePage(url.searchParams.get("page")),
      pageSize: PAGE_SIZE,
    });
    if (!result.lender) {
      return privateJson({ error: "Lender login is required." }, 401);
    }
    return privateJson({ items: result.loans, pageInfo: result.pageInfo });
  } catch {
    return privateJson({ error: "Loans are temporarily unavailable." }, 503);
  }
}

/** Accepts only supported loan attention filters. */
function normalizeAttention(value: string | null): LoanAttentionFilter | undefined {
  return value === "overdue" || value === "ending-today" || value === "ending-soon"
    ? value
    : undefined;
}
