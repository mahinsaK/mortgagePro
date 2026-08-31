import { Query } from "@/backend/appwrite/server-client";
import { formatMoney } from "@/backend/lib/currency";
import {
  addDaysToDateOnly,
  isValidDateOnly,
} from "@/backend/modules/notifications/dto";
import { isUsablePhoneNumber } from "@/backend/modules/notifications/service";
import {
  listTenantDocuments,
  type TenantCollection,
  type TenantDocument,
} from "./tenant-data-service";
import { getPrimaryLender } from "./lender-service";
import { normalizeSearchText } from "./search-text-service";

export type BorrowerRow = {
  id: string;
  name: string;
  businessName: string;
  contactInfo: string;
  addressInfo: string;
  status: string;
  createdAt: string;
  loanCount?: number;
  activeLoanCount?: number;
  completedLoanCount?: number;
};

export type LoanRow = {
  id: string;
  borrowerId: string;
  borrowerName: string;
  amount: string;
  amountValue: string;
  totalPaid: string;
  remainingAmount: string;
  interestRate: string;
  interestRateValue: string;
  dailyPayment: string;
  dailyPaymentValue: string;
  startDate: string;
  startDateInput: string;
  endDate: string;
  endDateInput: string;
  status: string;
};

export type BorrowerProfileData = {
  borrower: BorrowerRow | null;
  currency: string;
  loans: LoanRow[];
  pageInfo: PageInfo;
};

export type CollectorRow = {
  id: string;
  username: string;
  name: string;
  contactInfo: string;
  areaInfo: string;
  status: string;
  createdAt: string;
};

export type PaymentRow = {
  id: string;
  loanId: string;
  borrowerName: string;
  collectorName: string;
  amount: string;
  amountValue: number;
  method: string;
  date: string;
  rawDate: string;
  recordedAt: string;
};

export type LoanPaymentDetails = {
  loanId: string;
  borrowerName: string;
  totalPaid: string;
  remaining: string;
  payments: Array<{
    id: string;
    amount: string;
    collectorName: string;
    method: string;
    date: string;
    recordedAt: string;
  }>;
};

export type PageInfo = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type PaginationOptions = {
  page?: number;
  pageSize?: number;
};

export type BorrowerAttentionFilter = "missing-phone";
export type LoanAttentionFilter = "overdue" | "ending-today" | "ending-soon";

type BorrowersPageOptions = PaginationOptions & {
  attention?: BorrowerAttentionFilter;
  query?: string;
};

type LoansPageOptions = PaginationOptions & {
  attention?: LoanAttentionFilter;
  asOf?: string;
};

type BorrowerProfileOptions = PaginationOptions & {
  loanStatus?: "completed";
};

const DEFAULT_PAGE_SIZE = 10;
const BORROWER_PROFILE_LOAN_PAGE_SIZE = 5;
const MAX_LOOKUP_LIMIT = 5000;

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

export async function getPaymentsExportData(options: {
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

  const payments = await listTenantDocuments("payments", lender.id, queries);

  return {
    lender,
    payments: await mapPaymentDocuments(lender.id, payments.documents, lender.currency),
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

export async function getCollectorsPageData(options: PaginationOptions = {}) {
  const lender = await getPrimaryLender();
  const pagination = normalizePagination(options);

  if (!lender) {
    return {
      lender: null,
      collectors: [] as CollectorRow[],
      summary: { total: 0, active: 0, inactive: 0 },
      pageInfo: emptyPageInfo(pagination),
    };
  }

  const [collectors, activeCollectors] = await Promise.all([
    listForLender("collectors", lender.id, {
      page: pagination.page,
      pageSize: pagination.pageSize,
      orderBy: "created_at",
      select: ["$id", "$createdAt", "name", "contact_info", "status", "created_at"],
    }),
    listForLender("collectors", lender.id, {
      extraQueries: [Query.equal("status", "active")],
      limit: 1,
      select: ["$id"],
    }),
  ]);

  return {
    lender,
    summary: {
      total: collectors.total,
      active: activeCollectors.total,
      inactive: Math.max(collectors.total - activeCollectors.total, 0),
    },
    pageInfo: toPageInfo(collectors.total, pagination),
    collectors: collectors.documents.map((collector) => ({
      id: collector.$id,
      username: collector.$id,
      name: String(collector.name ?? ""),
      contactInfo: formatContactPhone(String(collector.contact_info ?? "")),
      areaInfo: formatContactArea(String(collector.contact_info ?? "")),
      status: String(collector.status ?? "active"),
      createdAt: formatDate(String(collector.created_at ?? collector.$createdAt)),
    })),
  };
}

export async function getDailyCollectionsData(date: string) {
  const selectedDate = normalizeDateOnly(date);
  const lender = await getPrimaryLender();

  if (!lender) {
    return { lender: null, selectedDate, payments: [] as PaymentRow[] };
  }

  const range = getDateRange(selectedDate);
  const payments = await listTenantDocuments("payments", lender.id, [
    Query.greaterThanEqual("date", range.start),
    Query.lessThan("date", range.end),
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
  ]);

  return {
    lender,
    selectedDate,
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

function listForLender(
  collection: TenantCollection,
  lenderId: string,
  options: PaginationOptions & {
    extraQueries?: string[];
    limit?: number;
    orderBy?: string | string[];
    select?: string[];
  } = {},
) {
  const queries = [
    ...(options.extraQueries ?? []),
  ];

  if (options.orderBy) {
    const orderAttributes = Array.isArray(options.orderBy)
      ? options.orderBy
      : [options.orderBy];
    queries.push(
      ...orderAttributes.map((attribute) => Query.orderDesc(attribute)),
    );
  }

  if (options.select) {
    queries.push(Query.select(options.select));
  }

  if (options.page && options.pageSize) {
    queries.push(Query.limit(options.pageSize));
    queries.push(Query.offset((options.page - 1) * options.pageSize));
  } else {
    queries.push(Query.limit(options.limit ?? DEFAULT_PAGE_SIZE));
  }

  return listTenantDocuments(collection, lenderId, queries);
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

function newestFirst(documents: TenantDocument[]) {
  return [...documents].sort((left, right) => {
    const leftDate = Date.parse(String(left.created_at ?? left.$createdAt ?? ""));
    const rightDate = Date.parse(String(right.created_at ?? right.$createdAt ?? ""));
    return (Number.isNaN(rightDate) ? 0 : rightDate) -
      (Number.isNaN(leftDate) ? 0 : leftDate);
  });
}

function paginatedDocuments(
  documents: TenantDocument[],
  pagination: { page: number; pageSize: number },
) {
  const offset = (pagination.page - 1) * pagination.pageSize;
  return {
    documents: documents.slice(offset, offset + pagination.pageSize),
    total: documents.length,
  };
}

function mapLoanDocument(
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

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatDateInput(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return toDateInputValue(date);
}

function formatContactPhone(value: string) {
  if (!value) {
    return "";
  }

  try {
    const parsed = JSON.parse(value) as Record<string, string>;
    return parsed.phone ?? "";
  } catch {
    return value;
  }
}

function formatContactArea(value: string) {
  if (!value) {
    return "";
  }

  try {
    const parsed = JSON.parse(value) as Record<string, string>;
    return parsed.area ?? "";
  } catch {
    return "";
  }
}

function normalizeDateOnly(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return toDateInputValue(new Date());
  }

  return toDateInputValue(date);
}

function normalizePagination(options: PaginationOptions) {
  const page = Math.max(1, Math.floor(Number(options.page ?? 1)) || 1);
  const pageSize = Math.min(
    50,
    Math.max(1, Math.floor(Number(options.pageSize ?? DEFAULT_PAGE_SIZE)) || DEFAULT_PAGE_SIZE),
  );

  return { page, pageSize };
}

function toPageInfo(total: number, pagination: { page: number; pageSize: number }) {
  return {
    page: pagination.page,
    pageSize: pagination.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pagination.pageSize)),
  };
}

function emptyPageInfo(pagination: { page: number; pageSize: number }) {
  return {
    ...pagination,
    total: 0,
    totalPages: 1,
  };
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function getDateRange(dateOnly: string) {
  const startDate = new Date(`${dateOnly}T00:00:00`);
  const endDate = new Date(startDate);

  endDate.setDate(startDate.getDate() + 1);

  return {
    start: startDate.toISOString(),
    end: endDate.toISOString(),
  };
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
