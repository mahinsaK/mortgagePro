import "server-only";
import { Query } from "@/server/appwrite/server-client";
import { formatMoney } from "@/server/lib/currency";
import { getPrimaryLender } from "@/server/services/lender-service";
import { listTenantDocuments } from "@/server/services/tenant-data-service";
import { emptyPageInfo, formatDate, getDateRange, listForLender, MAX_LOOKUP_LIMIT, normalizeDateOnly, normalizePagination, toPageInfo, uniqueStrings } from "@/server/services/lending-query-helpers";
import type { DailyCollectionsOptions, LoanPaymentDetails, PaginationOptions, PaymentRow } from "@/shared/lending-types";

export async function getPaymentsPageData(options: PaginationOptions = {}) {
  const lender = await getPrimaryLender();
  const pagination = normalizePagination(options);

  if (!lender) {
    return {
      lender: null,
      payments: [] as PaymentRow[],
      pageInfo: emptyPageInfo(pagination),
    };
  }

  const payments = await listForLender("payments", lender.id, {
    page: pagination.page,
    pageSize: pagination.pageSize,
    orderBy: "$createdAt",
    select: [
      "$id",
      "$createdAt",
      "loan_id",
      "collector_id",
      "amount",
      "method",
      "date",
      "created_at",
    ],
  });

  return {
    lender,
    pageInfo: toPageInfo(payments.total, pagination),
    payments: await mapPaymentDocuments(lender.id, payments.documents, lender.currency),
  };
}

/**
 * Loads a bounded payment export for the current lender and optional filters.
 */
export async function getPaymentsExportData(options: {
  collectorId?: string;
  startDate?: string;
  endDate?: string;
} = {}) {
  const lender = await getPrimaryLender();

  if (!lender) {
    return { lender: null, payments: [] as PaymentRow[] };
  }

  const queries = [
    Query.orderDesc("$createdAt"),
    Query.limit(MAX_LOOKUP_LIMIT),
    Query.select([
      "$id",
      "$createdAt",
      "loan_id",
      "collector_id",
      "amount",
      "method",
      "date",
      "created_at",
    ]),
  ];

  if (options.startDate) {
    queries.push(Query.greaterThanEqual("date", getDateRange(options.startDate).start));
  }

  if (options.endDate) {
    queries.push(Query.lessThan("date", getDateRange(options.endDate).end));
  }

  if (options.collectorId) {
    queries.push(Query.equal("collector_id", options.collectorId));
  }

  const payments = await listTenantDocuments("payments", lender.id, queries);

  return {
    lender,
    payments: await mapPaymentDocuments(lender.id, payments.documents, lender.currency),
  };
}

/**
 * Loads a paginated day of payments scoped to the authenticated lender.
 */
export async function getDailyCollectionsData(
  date: string,
  options: DailyCollectionsOptions = {},
) {
  const selectedDate = normalizeDateOnly(date);
  const lender = await getPrimaryLender();
  const pagination = normalizePagination(options);

  if (!lender) {
    return {
      lender: null,
      selectedDate,
      payments: [] as PaymentRow[],
      pageInfo: emptyPageInfo(pagination),
    };
  }

  const range = getDateRange(selectedDate);
  const payments = await listForLender("payments", lender.id, {
    page: pagination.page,
    pageSize: pagination.pageSize,
    orderBy: "$createdAt",
    extraQueries: [
      Query.greaterThanEqual("date", range.start),
      Query.lessThan("date", range.end),
      ...(options.collectorId
        ? [Query.equal("collector_id", options.collectorId)]
        : []),
    ],
    select: [
      "$id",
      "$createdAt",
      "loan_id",
      "collector_id",
      "amount",
      "method",
      "date",
      "created_at",
    ],
  });

  return {
    lender,
    selectedDate,
    pageInfo: toPageInfo(payments.total, pagination),
    payments: await mapPaymentDocuments(lender.id, payments.documents, lender.currency),
  };
}

export async function getLoanPaymentDetails(
  loanId: string,
): Promise<LoanPaymentDetails | null> {
  const lender = await getPrimaryLender();

  if (!lender) {
    return null;
  }

  const loans = await listTenantDocuments("loans", lender.id, [
    Query.equal("$id", loanId),
    Query.limit(1),
    Query.select([
      "$id",
      "borrower_id",
      "amount",
      "total_paid",
      "remaining_amount",
    ]),
  ]);
  const loan = loans.documents[0];

  if (!loan) {
    return null;
  }

  const borrowerId = String(loan.borrower_id ?? "");
  const [payments, borrowers] = await Promise.all([
    listTenantDocuments("payments", lender.id, [
      Query.equal("loan_id", loanId),
      Query.orderDesc("$createdAt"),
      Query.limit(MAX_LOOKUP_LIMIT),
      Query.select([
        "$id",
        "$createdAt",
        "collector_id",
        "amount",
        "method",
        "date",
        "created_at",
      ]),
    ]),
    listTenantDocuments("borrowers", lender.id, [
      Query.equal("$id", borrowerId),
      Query.limit(1),
      Query.select(["$id", "name"]),
    ]),
  ]);
  const collectorIds = uniqueStrings(
    payments.documents.map((payment) => String(payment.collector_id ?? "")),
  );
  const collectors =
    collectorIds.length > 0
      ? await listForLender("collectors", lender.id, {
          extraQueries: [Query.equal("$id", collectorIds)],
          limit: collectorIds.length,
          select: ["$id", "name"],
        })
      : { documents: [] };
  const collectorNames = new Map(
    collectors.documents.map((collector) => [
      collector.$id,
      String(collector.name ?? "Unknown collector"),
    ]),
  );
  const loanAmount = Number(loan.amount ?? 0);
  const totalPaid = Number(loan.total_paid ?? 0);
  const remainingAmount = Number(
    loan.remaining_amount ?? Math.max(loanAmount - totalPaid, 0),
  );

  return {
    loanId,
    borrowerName: String(borrowers.documents[0]?.name ?? "Borrower"),
    totalPaid: formatMoney(totalPaid, lender.currency),
    remaining: formatMoney(remainingAmount, lender.currency),
    payments: payments.documents.map((payment) => ({
      id: payment.$id,
      amount: formatMoney(Number(payment.amount ?? 0), lender.currency),
      collectorName:
        collectorNames.get(String(payment.collector_id)) ?? "Unknown collector",
      method: String(payment.method ?? "cash"),
      date: formatDate(String(payment.date ?? "")),
      recordedAt: String(
        payment.$createdAt ?? payment.created_at ?? payment.date ?? "",
      ),
    })),
  };
}

async function mapPaymentDocuments(
  lenderId: string,
  payments: Array<Record<string, unknown> & { $id: string }>,
  currency: string,
) {
  const loanIds = uniqueStrings(
    payments.map((payment) => String(payment.loan_id ?? "")),
  );
  const collectorIds = uniqueStrings(
    payments.map((payment) => String(payment.collector_id ?? "")),
  );
  const [loans, collectors] = await Promise.all([
    loanIds.length > 0
      ? listForLender("loans", lenderId, {
          extraQueries: [Query.equal("$id", loanIds)],
          limit: loanIds.length,
          select: ["$id", "borrower_id"],
        })
      : Promise.resolve({ documents: [] }),
    collectorIds.length > 0
      ? listForLender("collectors", lenderId, {
          extraQueries: [Query.equal("$id", collectorIds)],
          limit: collectorIds.length,
          select: ["$id", "name"],
        })
      : Promise.resolve({ documents: [] }),
  ]);
  const borrowerIds = uniqueStrings(
    loans.documents.map((loan) => String(loan.borrower_id ?? "")),
  );
  const borrowers =
    borrowerIds.length > 0
      ? await listForLender("borrowers", lenderId, {
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
  const collectorNames = new Map(
    collectors.documents.map((collector) => [
      collector.$id,
      String(collector.name ?? "Unknown collector"),
    ]),
  );
  const loanBorrowers = new Map(
    loans.documents.map((loan) => [
      loan.$id,
      borrowerNames.get(String(loan.borrower_id)) ?? "Unknown borrower",
    ]),
  );

  return payments.map((payment) => ({
    id: payment.$id,
    loanId: String(payment.loan_id ?? ""),
    borrowerName: loanBorrowers.get(String(payment.loan_id)) ?? "Unknown",
    collectorName:
      collectorNames.get(String(payment.collector_id)) ?? "Unknown collector",
    amount: formatMoney(Number(payment.amount ?? 0), currency),
    amountValue: Number(payment.amount ?? 0),
    method: String(payment.method ?? "cash"),
    date: formatDate(String(payment.date ?? payment.created_at)),
    rawDate: String(payment.date ?? payment.created_at ?? ""),
    recordedAt: String(
      payment.$createdAt ?? payment.created_at ?? payment.date ?? "",
    ),
  }));
}
