import "server-only";
import { Query } from "@/server/appwrite/server-client";
import { isUsablePhoneNumber } from "@/features/notifications/domain/service";
import { getPrimaryLender } from "@/server/services/lender-service";
import { listTenantDocuments } from "@/server/services/tenant-data-service";
import { normalizeSearchText } from "@/server/services/search-text-service";
import { mapLoanDocument } from "@/features/loans/server/loan-query-service";
import { BORROWER_PROFILE_LOAN_PAGE_SIZE, emptyPageInfo, formatDate, getDateRange, listForLender, MAX_LOOKUP_LIMIT, newestFirst, normalizePagination, paginatedDocuments, toPageInfo } from "@/server/services/lending-query-helpers";
import type { BorrowerProfileData, BorrowerProfileOptions, BorrowerRow, BorrowersPageOptions, LoanRow } from "@/shared/lending-types";

export async function getBorrowersPageData(options: BorrowersPageOptions = {}) {
  const lender = await getPrimaryLender();
  const pagination = normalizePagination(options);
  const searchQuery = normalizeSearchText(options.query ?? "").slice(0, 100);

  if (!lender) {
    return {
      lender: null,
      borrowers: [] as BorrowerRow[],
      pageInfo: emptyPageInfo(pagination),
    };
  }

  const select = [
    "$id",
    "$createdAt",
    "name",
    "business_name",
    "contact",
    "address",
    "status",
    "created_at",
  ];
  const searchQueries = borrowerSearchQueries(searchQuery);
  const borrowers = options.attention === "missing-phone"
    ? await getBorrowersMissingPhone(
        lender.id,
        pagination,
        select,
        searchQueries,
      )
    : await listForLender("borrowers", lender.id, {
        page: pagination.page,
        pageSize: pagination.pageSize,
        orderBy: "created_at",
        extraQueries: searchQueries,
        select,
      });

  return {
    lender,
    pageInfo: toPageInfo(borrowers.total, pagination),
    borrowers: borrowers.documents.map((borrower) => ({
      id: borrower.$id,
      name: String(borrower.name ?? ""),
      businessName: String(borrower.business_name ?? ""),
      contactInfo: String(borrower.contact ?? ""),
      addressInfo: String(borrower.address ?? ""),
      status: String(borrower.status ?? "active"),
      createdAt: formatDate(String(borrower.created_at ?? borrower.$createdAt)),
    })),
  };
}

export async function getBorrowerProfileData(
  borrowerId: string,
  options: BorrowerProfileOptions = {},
): Promise<BorrowerProfileData> {
  const lender = await getPrimaryLender();
  const pagination = normalizePagination({
    page: options.page,
    pageSize: options.pageSize ?? BORROWER_PROFILE_LOAN_PAGE_SIZE,
  });

  if (!lender) {
    return {
      borrower: null,
      currency: "USD",
      loans: [],
      pageInfo: emptyPageInfo(pagination),
    };
  }

  const borrowers = await listTenantDocuments("borrowers", lender.id, [
    Query.equal("$id", borrowerId),
    Query.limit(1),
    Query.select([
      "$id",
      "$createdAt",
      "name",
      "business_name",
      "contact",
      "address",
      "status",
      "created_at",
    ]),
  ]);
  const borrower = borrowers.documents[0];

  if (!borrower) {
    return {
      borrower: null,
      currency: lender.currency,
      loans: [],
      pageInfo: emptyPageInfo(pagination),
    };
  }

  const loanFilters = [
    Query.equal("borrower_id", borrowerId),
    ...(options.loanStatus ? [Query.equal("status", options.loanStatus)] : []),
  ];

  const [loans, totalLoans, activeLoans, completedLoans] = await Promise.all([
    listForLender("loans", lender.id, {
      page: pagination.page,
      pageSize: pagination.pageSize,
      orderBy: "created_at",
      extraQueries: loanFilters,
      select: [
        "$id",
        "borrower_id",
        "amount",
        "interest_rate",
        "daily_payment",
        "total_paid",
        "remaining_amount",
        "start_date",
        "end_date",
        "status",
      ],
    }),
    listTenantDocuments("loans", lender.id, [
      Query.equal("borrower_id", borrowerId),
      Query.limit(1),
      Query.select(["$id"]),
    ]),
    listTenantDocuments("loans", lender.id, [
      Query.equal("borrower_id", borrowerId),
      Query.equal("status", "active"),
      Query.limit(1),
      Query.select(["$id"]),
    ]),
    listTenantDocuments("loans", lender.id, [
      Query.equal("borrower_id", borrowerId),
      Query.equal("status", "completed"),
      Query.limit(1),
      Query.select(["$id"]),
    ]),
  ]);

  const loanRows = loans.documents.map((loan) =>
    mapLoanDocument(loan, String(borrower.name ?? "Unknown borrower"), lender.currency),
  );

  return {
    borrower: {
      id: borrower.$id,
      name: String(borrower.name ?? ""),
      businessName: String(borrower.business_name ?? ""),
      contactInfo: String(borrower.contact ?? ""),
      addressInfo: String(borrower.address ?? ""),
      status: String(borrower.status ?? "active"),
      createdAt: formatDate(String(borrower.created_at ?? borrower.$createdAt)),
      loanCount: totalLoans.total,
      activeLoanCount: activeLoans.total,
      completedLoanCount: completedLoans.total,
    },
    currency: lender.currency,
    loans: loanRows,
    pageInfo: toPageInfo(loans.total, pagination),
  };
}

/** Loads one tenant-validated page of loans for a borrower profile. */
export async function getBorrowerLoansPageData(
  borrowerId: string,
  options: BorrowerProfileOptions = {},
) {
  const lender = await getPrimaryLender();
  const pagination = normalizePagination({
    page: options.page,
    pageSize: options.pageSize ?? BORROWER_PROFILE_LOAN_PAGE_SIZE,
  });

  if (!lender) {
    return {
      lender: null,
      borrowerFound: false,
      loans: [] as LoanRow[],
      pageInfo: emptyPageInfo(pagination),
    };
  }

  const borrowers = await listTenantDocuments("borrowers", lender.id, [
    Query.equal("$id", borrowerId),
    Query.limit(1),
    Query.select(["$id", "name"]),
  ]);
  const borrower = borrowers.documents[0];

  if (!borrower) {
    return {
      lender,
      borrowerFound: false,
      loans: [] as LoanRow[],
      pageInfo: emptyPageInfo(pagination),
    };
  }

  const loans = await listForLender("loans", lender.id, {
    page: pagination.page,
    pageSize: pagination.pageSize,
    orderBy: "created_at",
    extraQueries: [
      Query.equal("borrower_id", borrowerId),
      ...(options.loanStatus
        ? [Query.equal("status", options.loanStatus)]
        : []),
    ],
    select: [
      "$id",
      "borrower_id",
      "amount",
      "interest_rate",
      "daily_payment",
      "total_paid",
      "remaining_amount",
      "start_date",
      "end_date",
      "status",
    ],
  });

  return {
    lender,
    borrowerFound: true,
    loans: loans.documents.map((loan) =>
      mapLoanDocument(
        loan,
        String(borrower.name ?? "Unknown borrower"),
        lender.currency,
      ),
    ),
    pageInfo: toPageInfo(loans.total, pagination),
  };
}

export async function getBorrowersExportData(options: {
  startDate?: string;
  endDate?: string;
} = {}) {
  const lender = await getPrimaryLender();

  if (!lender) {
    return { lender: null, borrowers: [] as BorrowerRow[] };
  }

  const queries = [
    Query.orderDesc("created_at"),
    Query.limit(MAX_LOOKUP_LIMIT),
    Query.select([
      "$id",
      "$createdAt",
      "name",
      "business_name",
      "contact",
      "address",
      "status",
      "created_at",
    ]),
  ];

  if (options.startDate) {
    queries.push(Query.greaterThanEqual("created_at", getDateRange(options.startDate).start));
  }

  if (options.endDate) {
    queries.push(Query.lessThan("created_at", getDateRange(options.endDate).end));
  }

  const borrowers = await listTenantDocuments("borrowers", lender.id, queries);

  return {
    lender,
    borrowers: borrowers.documents.map((borrower) => ({
      id: borrower.$id,
      name: String(borrower.name ?? ""),
      businessName: String(borrower.business_name ?? ""),
      contactInfo: String(borrower.contact ?? ""),
      addressInfo: String(borrower.address ?? ""),
      status: String(borrower.status ?? "active"),
      createdAt: String(borrower.created_at ?? borrower.$createdAt ?? ""),
    })),
  };
}

async function getBorrowersMissingPhone(
  lenderId: string,
  pagination: { page: number; pageSize: number },
  select: string[],
  searchQueries: string[] = [],
) {
  const borrowers = await listTenantDocuments("borrowers", lenderId, [
    Query.equal("status", "active"),
    ...searchQueries,
    Query.limit(MAX_LOOKUP_LIMIT),
    Query.select(select),
  ]);
  const filtered = newestFirst(
    borrowers.documents.filter((borrower) =>
      !isUsablePhoneNumber(String(borrower.contact ?? "")),
    ),
  );

  return paginatedDocuments(filtered, pagination);
}

function borrowerSearchQueries(query: string) {
  if (!query) return [];

  return [
    Query.or([
      Query.search("search_text", query),
      Query.search("name", query),
      Query.search("business_name", query),
      Query.search("contact", query),
      Query.search("address", query),
    ]),
  ];
}
