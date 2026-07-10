import { Query } from "@/backend/appwrite/server-client";
import { formatMoney } from "@/backend/lib/currency";
import {
  listTenantDocuments,
  type TenantCollection,
} from "./tenant-data-service";
import { getPrimaryLender } from "./lender-service";

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
  loans: LoanRow[];
  pageInfo: PageInfo;
};

export type CollectorRow = {
  id: string;
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
};

export type LoanPaymentDetails = {
  loanId: string;
  totalPaid: string;
  remaining: string;
  payments: Array<{
    id: string;
    amount: string;
    collectorName: string;
    method: string;
    date: string;
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

const DEFAULT_PAGE_SIZE = 10;
const BORROWER_PROFILE_LOAN_PAGE_SIZE = 8;
const MAX_LOOKUP_LIMIT = 5000;

export async function getBorrowersPageData(options: PaginationOptions = {}) {
  const lender = await getPrimaryLender();
  const pagination = normalizePagination(options);

  if (!lender) {
    return {
      lender: null,
      borrowers: [] as BorrowerRow[],
      pageInfo: emptyPageInfo(pagination),
    };
  }

  const borrowers = await listForLender("borrowers", lender.id, {
    page: pagination.page,
    pageSize: pagination.pageSize,
    orderBy: "created_at",
    select: [
      "$id",
      "$createdAt",
      "name",
      "business_name",
      "contact",
      "address",
      "status",
      "created_at",
    ],
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
  options: PaginationOptions = {},
): Promise<BorrowerProfileData> {
  const lender = await getPrimaryLender();
  const pagination = normalizePagination({
    page: options.page,
    pageSize: options.pageSize ?? BORROWER_PROFILE_LOAN_PAGE_SIZE,
  });

  if (!lender) {
    return { borrower: null, loans: [], pageInfo: emptyPageInfo(pagination) };
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
    return { borrower: null, loans: [], pageInfo: emptyPageInfo(pagination) };
  }

  const [loans, activeLoans] = await Promise.all([
    listTenantDocuments("loans", lender.id, [
      Query.equal("borrower_id", borrowerId),
      Query.limit(pagination.pageSize),
      Query.offset((pagination.page - 1) * pagination.pageSize),
      Query.select([
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
      ]),
    ]),
    listTenantDocuments("loans", lender.id, [
      Query.equal("borrower_id", borrowerId),
      Query.equal("status", "active"),
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
      loanCount: loans.total,
      activeLoanCount: activeLoans.total,
    },
    loans: loanRows,
    pageInfo: toPageInfo(loans.total, pagination),
  };
}

export async function getLoansPageData(options: PaginationOptions = {}) {
  const lender = await getPrimaryLender();
  const pagination = normalizePagination(options);

  if (!lender) {
    return {
      lender: null,
      loans: [] as LoanRow[],
      pageInfo: emptyPageInfo(pagination),
    };
  }

  const loans = await listForLender("loans", lender.id, {
    page: pagination.page,
    pageSize: pagination.pageSize,
    orderBy: "created_at",
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
    orderBy: ["date", "$createdAt"],
    select: [
      "$id",
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
    Query.orderDesc("date"),
    Query.orderDesc("$createdAt"),
    Query.limit(MAX_LOOKUP_LIMIT),
    Query.select([
      "$id",
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
    Query.orderDesc("date"),
    Query.orderDesc("$createdAt"),
    Query.limit(MAX_LOOKUP_LIMIT),
    Query.select([
      "$id",
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
    Query.select(["$id", "amount", "total_paid", "remaining_amount"]),
  ]);
  const loan = loans.documents[0];

  if (!loan) {
    return null;
  }

  const payments = await listTenantDocuments("payments", lender.id, [
    Query.equal("loan_id", loanId),
    Query.orderDesc("date"),
    Query.orderDesc("$createdAt"),
    Query.limit(MAX_LOOKUP_LIMIT),
    Query.select(["$id", "collector_id", "amount", "method", "date"]),
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
    totalPaid: formatMoney(totalPaid, lender.currency),
    remaining: formatMoney(remainingAmount, lender.currency),
    payments: payments.documents.map((payment) => ({
      id: payment.$id,
      amount: formatMoney(Number(payment.amount ?? 0), lender.currency),
      collectorName:
        collectorNames.get(String(payment.collector_id)) ?? "Unknown collector",
      method: String(payment.method ?? "cash"),
      date: formatDate(String(payment.date ?? "")),
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
