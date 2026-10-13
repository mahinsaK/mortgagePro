import { getPaymentsPageData } from "@/backend/services/lending-service";
import { positivePage, privateJson } from "@/app/api/_shared/infinite-pagination";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 20;

/** Returns a tenant-scoped page of payment history for infinite scrolling. */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const result = await getPaymentsPageData({
      page: positivePage(url.searchParams.get("page")),
      pageSize: PAGE_SIZE,
    });
    if (!result.lender) {
      return privateJson({ error: "Lender login is required." }, 401);
    }
    return privateJson({ items: result.payments, pageInfo: result.pageInfo });
  } catch {
    return privateJson({ error: "Payments are temporarily unavailable." }, 503);
  }
}
