import { getBorrowersPageData } from "@/backend/services/lending-service";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

/** Returns one authenticated, lender-scoped borrower page for infinite scroll. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = positivePage(url.searchParams.get("page"));
  const query = String(url.searchParams.get("q") ?? "").trim().slice(0, 100);
  const attention = url.searchParams.get("attention") === "missing-phone"
    ? "missing-phone"
    : undefined;

  try {
    const result = await getBorrowersPageData({
      attention,
      page,
      pageSize: PAGE_SIZE,
      query,
    });

    if (!result.lender) {
      return json({ error: "Lender login is required." }, 401);
    }

    return json({
      items: result.borrowers,
      pageInfo: result.pageInfo,
    });
  } catch {
    return json({ error: "Borrowers are temporarily unavailable." }, 503);
  }
}

/** Normalizes an untrusted page parameter to a positive integer. */
function positivePage(value: string | null) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

/** Creates a private JSON response that must not be stored by shared caches. */
function json(body: unknown, status = 200) {
  return Response.json(body, {
    headers: { "Cache-Control": "private, no-store" },
    status,
  });
}
