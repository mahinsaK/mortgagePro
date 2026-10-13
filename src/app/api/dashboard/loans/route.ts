import { getLenderDashboardLoansData } from "@/backend/services/dashboard-service";
import { positivePage, privateJson } from "@/app/api/_shared/infinite-pagination";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 15;

/** Returns a searchable tenant-scoped dashboard loan page. */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const result = await getLenderDashboardLoansData({
      page: positivePage(url.searchParams.get("page")),
      pageSize: PAGE_SIZE,
      query: String(url.searchParams.get("q") ?? "").trim().slice(0, 100),
    });
    if (!result.lender) {
      return privateJson({ error: "Lender login is required." }, 401);
    }
    return privateJson({ items: result.loans, pageInfo: result.pageInfo });
  } catch {
    return privateJson({ error: "Dashboard loans are temporarily unavailable." }, 503);
  }
}
