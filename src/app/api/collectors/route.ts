import { getCollectorsPageData } from "@/backend/services/lending-service";
import { positivePage, privateJson } from "@/app/api/_shared/infinite-pagination";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 20;

/** Returns a tenant-scoped page of collectors for infinite scrolling. */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const result = await getCollectorsPageData({
      page: positivePage(url.searchParams.get("page")),
      pageSize: PAGE_SIZE,
    });
    if (!result.lender) {
      return privateJson({ error: "Lender login is required." }, 401);
    }
    return privateJson({ items: result.collectors, pageInfo: result.pageInfo });
  } catch {
    return privateJson({ error: "Collectors are temporarily unavailable." }, 503);
  }
}
