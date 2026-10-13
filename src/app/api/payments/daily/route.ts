import { getDailyCollectionsData } from "@/backend/services/lending-service";
import { isValidDateOnly } from "@/backend/modules/notifications/dto";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
const DOCUMENT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,35}$/;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const date = String(url.searchParams.get("date") ?? "");
  const collectorId = String(url.searchParams.get("collector") ?? "").trim();

  if (!isValidDateOnly(date)) {
    return json({ error: "A valid collection date is required." }, 400);
  }

  if (collectorId && !DOCUMENT_ID_PATTERN.test(collectorId)) {
    return json({ error: "The collector filter is invalid." }, 400);
  }

  try {
    const result = await getDailyCollectionsData(date, {
      collectorId: collectorId || undefined,
      page: positivePage(url.searchParams.get("page")),
      pageSize: PAGE_SIZE,
    });

    if (!result.lender) {
      return json({ error: "Lender login is required." }, 401);
    }

    return json({
      items: result.payments,
      pageInfo: result.pageInfo,
    });
  } catch {
    return json({ error: "Daily collections are temporarily unavailable." }, 503);
  }
}

function positivePage(value: string | null) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function json(body: unknown, status = 200) {
  return Response.json(body, {
    headers: { "Cache-Control": "private, no-store" },
    status,
  });
}
