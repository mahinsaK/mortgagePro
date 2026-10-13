import { getBorrowerLoansPageData } from "@/backend/services/lending-service";
import { positivePage, privateJson } from "@/app/api/_shared/infinite-pagination";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 5;
const DOCUMENT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,35}$/;

/** Returns a tenant-validated page of loans for one borrower profile. */
export async function GET(
  request: Request,
  context: { params: Promise<{ borrowerId: string }> },
) {
  const { borrowerId } = await context.params;
  if (!DOCUMENT_ID_PATTERN.test(borrowerId)) {
    return privateJson({ error: "Borrower not found." }, 404);
  }

  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status") === "completed"
      ? "completed"
      : undefined;
    const result = await getBorrowerLoansPageData(borrowerId, {
      loanStatus: status,
      page: positivePage(url.searchParams.get("page")),
      pageSize: PAGE_SIZE,
    });
    if (!result.lender) {
      return privateJson({ error: "Lender login is required." }, 401);
    }
    if (!result.borrowerFound) {
      return privateJson({ error: "Borrower not found." }, 404);
    }
    return privateJson({ items: result.loans, pageInfo: result.pageInfo });
  } catch {
    return privateJson({ error: "Borrower loans are temporarily unavailable." }, 503);
  }
}
