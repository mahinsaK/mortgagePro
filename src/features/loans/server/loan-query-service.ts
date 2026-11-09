import "server-only";
import { Query } from "@/server/appwrite/server-client";
import { formatMoney } from "@/server/lib/currency";
import { addDaysToDateOnly, isValidDateOnly } from "@/features/notifications/domain/dto";
import { getPrimaryLender } from "@/server/services/lender-service";
import { listTenantDocuments, type TenantDocument } from "@/server/services/tenant-data-service";
import { emptyPageInfo, formatDate, formatDateInput, listForLender, MAX_LOOKUP_LIMIT, newestFirst, normalizePagination, paginatedDocuments, toPageInfo, uniqueStrings } from "@/server/services/lending-query-helpers";
import type { LoanAttentionFilter, LoanRow, LoansPageOptions } from "@/shared/lending-types";

export async function getLoansPageData(options: LoansPageOptions = {}) {
  const lender = await getPrimaryLender();
  const pagination = normalizePagination(options);

  if (!lender) {
    return {
      lender: null,
      loans: [] as LoanRow[],
      pageInfo: emptyPageInfo(pagination),
    };
  }

  const select = [
    "$id",
    "$createdAt",
    "borrower_id",
    "amount",
    "interest_rate",
    "daily_payment",
    "total_paid",
    "remaining_amount",
    "start_date",
    "end_date",
    "status",
    "created_at",
  ];
  const attention = normalizeLoanAttention(options.attention, options.asOf);
  const loans = attention
    ? await getAttentionLoans(lender.id, pagination, attention, select)
    : await listForLender("loans", lender.id, {
        page: pagination.page,
        pageSize: pagination.pageSize,
        orderBy: "created_at",
        select,
      });
  const borrowerIds = uniqueStrings(
    loans.documents.map((loan) => String(loan.borrower_id ?? "")),
  );
  const borrowers =
    borrowerIds.length > 0
      ? await listForLender("borrowers", lender.id, {
          extraQueries: [Query.equal("$id", borrowerIds)],
          limit: borrowerIds.length,
          select: ["$id", "name"],
        })
      : { documents: [] };
  const borrowerNames = new Map(
    borrowers.documents.map((borrower) => [
      borrower.$id,
      String(borrower.name ?? "Unknown borrower"),
    ]),
  );

  return {
    lender,
    pageInfo: toPageInfo(loans.total, pagination),
    loans: loans.documents.map((loan) =>
      mapLoanDocument(
        loan,
        borrowerNames.get(String(loan.borrower_id)) ?? "Unknown borrower",
        lender.currency,
      ),
    ),
  };
}

async function getAttentionLoans(
  lenderId: string,
  pagination: { page: number; pageSize: number },
  attention: { kind: LoanAttentionFilter; asOf: string },
  select: string[],
) {
  const start = `${attention.asOf}T00:00:00.000Z`;
  const tomorrow = `${addDaysToDateOnly(attention.asOf, 1)}T00:00:00.000Z`;
  const afterSevenDays = `${addDaysToDateOnly(attention.asOf, 8)}T00:00:00.000Z`;
  const dateQueries =
    attention.kind === "overdue"
      ? [Query.lessThan("end_date", start)]
      : attention.kind === "ending-today"
        ? [
            Query.greaterThanEqual("end_date", start),
            Query.lessThan("end_date", tomorrow),
          ]
        : [
            Query.greaterThanEqual("end_date", tomorrow),
            Query.lessThan("end_date", afterSevenDays),
          ];
  const loans = await listTenantDocuments("loans", lenderId, [
    Query.equal("status", ["active", "overdue"]),
    ...dateQueries,
    Query.limit(MAX_LOOKUP_LIMIT),
    Query.select(select),
  ]);
  const filtered = newestFirst(
    loans.documents.filter((loan) => remainingLoanAmount(loan) > 0),
  );

  return paginatedDocuments(filtered, pagination);
}

function normalizeLoanAttention(
  attention: LoanAttentionFilter | undefined,
  asOf: string | undefined,
) {
  if (
    !attention ||
    !["overdue", "ending-today", "ending-soon"].includes(attention) ||
    !asOf ||
    !isValidDateOnly(asOf)
  ) {
    return null;
  }

  return { kind: attention, asOf };
}

function remainingLoanAmount(loan: TenantDocument) {
  const amount = Number(loan.amount ?? 0);
  const totalPaid = Number(loan.total_paid ?? 0);
  return Number(loan.remaining_amount ?? Math.max(amount - totalPaid, 0));
}

export function mapLoanDocument(
  loan: Record<string, unknown> & { $id: string },
  borrowerName: string,
  currency: string,
): LoanRow {
  const loanAmount = Number(loan.amount ?? 0);
  const totalPaid = Number(loan.total_paid ?? 0);
  const remainingAmount = Number(
    loan.remaining_amount ?? Math.max(loanAmount - totalPaid, 0),
  );

  return {
    id: loan.$id,
    borrowerId: String(loan.borrower_id ?? ""),
    borrowerName,
    amount: formatMoney(loanAmount, currency),
    amountValue: String(loan.amount ?? 0),
    totalPaid: formatMoney(totalPaid, currency),
    remainingAmount: formatMoney(remainingAmount, currency),
    interestRate: `${Number(loan.interest_rate ?? 0).toFixed(2)}%`,
    interestRateValue: String(loan.interest_rate ?? 0),
    dailyPayment: formatMoney(Number(loan.daily_payment ?? 0), currency),
    dailyPaymentValue: String(loan.daily_payment ?? 0),
    startDate: formatDate(String(loan.start_date ?? "")),
    startDateInput: formatDateInput(String(loan.start_date ?? "")),
    endDate: formatDate(String(loan.end_date ?? "")),
    endDateInput: formatDateInput(String(loan.end_date ?? "")),
    status: String(loan.status ?? "active"),
  };
}

export async function loanBelongsToActiveLender(loanId: string) {
  const lender = await getPrimaryLender();

  if (!lender) {
    return false;
  }

  const loans = await listTenantDocuments("loans", lender.id, [
    Query.equal("$id", loanId),
    Query.limit(1),
    Query.select(["$id"]),
  ]);

  return loans.total > 0;
}
