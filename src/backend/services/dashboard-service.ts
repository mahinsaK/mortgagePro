import { Query } from "@/backend/appwrite/server-client";
import { formatMoney } from "@/backend/lib/currency";
import { normalizeSearchText } from "@/backend/services/search-text-service";
import { listTenantDocuments } from "./tenant-data-service";
import { getPrimaryLender } from "./lender-service";

type DashboardStat = {
  label: string;
  value: string;
  change: string;
};

export type DashboardLoan = {
  id: string;
  borrowerId: string;
  borrower: string;
  borrowerContact: string;
  borrowerPhone: string;
  amount: string;
  totalPaid: string;
  remainingAmount: string;
  dailyPayment: string;
  status: string;
  endDate: string;
};

export type LenderDashboardData = {
  lender: Awaited<ReturnType<typeof getPrimaryLender>>;
  stats: DashboardStat[];
  loans: DashboardLoan[];
  pageInfo: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type DashboardOptions = {
  page?: number;
  pageSize?: number;
  query?: string;
};

const DEFAULT_PAGE_SIZE = 15;
const MAX_DAILY_PAYMENT_LIMIT = 5000;
const BORROWER_SEARCH_FALLBACK_LIMIT = 500;
const OVERDUE_LOAN_PREVIEW_LIMIT = 20;

export async function getLenderDashboardData(
  options: DashboardOptions = {},
): Promise<LenderDashboardData> {
  const lender = await getPrimaryLender();
  const pagination = normalizePagination(options);

  if (!lender) {
    return {
      lender: null,
      stats: emptyStats(),
      loans: [],
      pageInfo: emptyPageInfo(pagination),
    };
  }

  const searchQuery = normalizeSearchQuery(options.query);
  const today = toColomboDateInputValue(new Date());
  const todayRange = getDateRange(today);
  const loanQueries = [
    Query.orderDesc("created_at"),
    Query.limit(pagination.pageSize),
    Query.offset((pagination.page - 1) * pagination.pageSize),
    Query.select([
      "$id",
      "borrower_id",
      "amount",
      "total_paid",
      "remaining_amount",
      "daily_payment",
      "status",
      "end_date",
    ]),
  ];

  if (searchQuery) {
    loanQueries.unshift(Query.search("search_text", searchQuery));
  }

  const [
    initialLoans,
    totalBorrowers,
    activeLoans,
    todaysPayments,
    overdueLoanCount,
  ] =
    await Promise.all([
      listTenantDocuments("loans", lender.id, loanQueries),
      listTenantDocuments("borrowers", lender.id, [
        Query.limit(1),
        Query.select(["$id"]),
      ]),
      listTenantDocuments("loans", lender.id, [
        Query.equal("status", "active"),
        Query.limit(1),
        Query.select(["$id"]),
      ]),
      listTenantDocuments("payments", lender.id, [
        Query.greaterThanEqual("date", todayRange.start),
        Query.lessThan("date", todayRange.end),
        Query.limit(MAX_DAILY_PAYMENT_LIMIT),
        Query.select(["amount"]),
      ]),
      listTenantDocuments("loans", lender.id, [
        Query.equal("status", ["active", "overdue"]),
        Query.lessThan("end_date", todayRange.end),
        Query.limit(1),
        Query.select(["$id"]),
      ]),
    ]);
  const loans =
    searchQuery && initialLoans.total === 0
      ? await findLoansByBorrowerSearch(lender.id, searchQuery, pagination)
      : initialLoans;
  const borrowerIds = uniqueStrings(
    loans.documents.map((loan) => String(loan.borrower_id ?? "")),
  );
  const borrowers =
    borrowerIds.length > 0
      ? await listTenantDocuments("borrowers", lender.id, [
            Query.equal("$id", borrowerIds),
            Query.limit(borrowerIds.length),
            Query.select(["$id", "name", "contact", "address"]),
          ])
      : { documents: [] };

  const borrowerNames = new Map(
    borrowers.documents.map((borrower) => [
      borrower.$id,
      String(borrower.name ?? "Unknown borrower"),
    ]),
  );
  const borrowerContacts = new Map(
    borrowers.documents.map((borrower) => [
      borrower.$id,
      {
        display: String(borrower.contact ?? ""),
        phone: String(borrower.contact ?? ""),
      },
    ]),
  );
  const todaysCollection = todaysPayments.documents.reduce(
    (total, payment) => total + Number(payment.amount ?? 0),
    0,
  );

  return {
    lender,
    pageInfo: toPageInfo(loans.total, pagination),
    stats: [
      {
        label: "Total borrowers",
        value: String(totalBorrowers.total),
        change: "Registered profiles",
      },
      {
        label: "Active loans",
        value: String(activeLoans.total),
        change: "Currently running",
      },
      {
        label: "Today's collection",
        value: formatMoney(todaysCollection, lender.currency),
        change: "Collected today",
      },
      {
        label: "Overdue loans",
        value: String(overdueLoanCount.total),
        change: "Past the end date",
      },
    ],
    loans: loans.documents.map((loan) =>
      toDashboardLoan(loan, lender.currency, borrowerNames, borrowerContacts),
    ),
  };
}

export async function getDashboardOverdueLoans(asOf: string) {
  if (!isDateOnly(asOf)) {
    throw new Error("asOf must be a valid date in YYYY-MM-DD format.");
  }

  const lender = await getPrimaryLender();
  if (!lender) {
    return null;
  }

  const dateRange = getDateRange(asOf);
  const overdueLoans = await listTenantDocuments("loans", lender.id, [
    Query.equal("status", ["active", "overdue"]),
    Query.lessThan("end_date", dateRange.end),
    Query.orderAsc("end_date"),
    Query.limit(OVERDUE_LOAN_PREVIEW_LIMIT),
    Query.select([
      "$id",
      "borrower_id",
      "amount",
      "total_paid",
      "remaining_amount",
      "daily_payment",
      "status",
      "end_date",
    ]),
  ]);
  const borrowerIds = uniqueStrings(
    overdueLoans.documents.map((loan) => String(loan.borrower_id ?? "")),
  );
  const borrowers =
    borrowerIds.length > 0
      ? await listTenantDocuments("borrowers", lender.id, [
          Query.equal("$id", borrowerIds),
          Query.limit(borrowerIds.length),
          Query.select(["$id", "name", "contact"]),
        ])
      : { documents: [] };
  const borrowerNames = new Map(
    borrowers.documents.map((borrower) => [
      borrower.$id,
      String(borrower.name ?? "Unknown borrower"),
    ]),
  );
  const borrowerContacts = new Map(
    borrowers.documents.map((borrower) => [
      borrower.$id,
      {
        display: String(borrower.contact ?? ""),
        phone: String(borrower.contact ?? ""),
      },
    ]),
  );

  return {
    loans: overdueLoans.documents.map((loan) =>
      toDashboardLoan(loan, lender.currency, borrowerNames, borrowerContacts),
    ),
    total: overdueLoans.total,
  };
}

function toDashboardLoan(
  loan: { $id: string; [key: string]: unknown },
  currency: string,
  borrowerNames: Map<string, string>,
  borrowerContacts: Map<string, { display: string; phone: string }>,
): DashboardLoan {
  const borrowerId = String(loan.borrower_id ?? "");
  const contact = borrowerContacts.get(borrowerId) ?? {
    display: "",
    phone: "",
  };

  return {
    id: loan.$id,
    borrowerId,
    borrower: borrowerNames.get(borrowerId) ?? "Unknown borrower",
    borrowerContact: contact.display,
    borrowerPhone: contact.phone,
    amount: formatMoney(Number(loan.amount ?? 0), currency),
    totalPaid: formatMoney(Number(loan.total_paid ?? 0), currency),
    remainingAmount: formatMoney(
      Number(
        loan.remaining_amount ??
          Math.max(Number(loan.amount ?? 0) - Number(loan.total_paid ?? 0), 0),
      ),
      currency,
    ),
    dailyPayment: formatMoney(Number(loan.daily_payment ?? 0), currency),
    status: String(loan.status ?? "active"),
    endDate: formatDate(String(loan.end_date ?? "")),
  };
}

async function findLoansByBorrowerSearch(
  lenderId: string,
  searchQuery: string,
  pagination: { page: number; pageSize: number },
) {
  const borrowers = await listTenantDocuments("borrowers", lenderId, [
    Query.or([
      Query.search("name", searchQuery),
      Query.search("address", searchQuery),
      Query.search("contact", searchQuery),
    ]),
    Query.limit(BORROWER_SEARCH_FALLBACK_LIMIT),
    Query.select(["$id"]),
  ]);
  const borrowerIds = uniqueStrings(
    borrowers.documents.map((borrower) => borrower.$id),
  );

  if (borrowerIds.length === 0) {
    return { documents: [], total: 0 };
  }

  return listTenantDocuments("loans", lenderId, [
    Query.equal("borrower_id", borrowerIds),
    Query.orderDesc("created_at"),
    Query.limit(pagination.pageSize),
    Query.offset((pagination.page - 1) * pagination.pageSize),
    Query.select([
      "$id",
      "borrower_id",
      "amount",
      "total_paid",
      "remaining_amount",
      "daily_payment",
      "status",
      "end_date",
    ]),
  ]);
}

function emptyStats() {
  return [
    { label: "Total borrowers", value: "0", change: "Registered profiles" },
    { label: "Active loans", value: "0", change: "Currently running" },
    { label: "Today's collection", value: formatMoney(0, "USD"), change: "Collected today" },
    { label: "Overdue loans", value: "0", change: "Past the end date" },
  ];
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

function normalizePagination(options: DashboardOptions) {
  const page = Math.max(1, Math.floor(Number(options.page ?? 1)) || 1);
  const pageSize = Math.min(
    50,
    Math.max(1, Math.floor(Number(options.pageSize ?? DEFAULT_PAGE_SIZE)) || DEFAULT_PAGE_SIZE),
  );

  return { page, pageSize };
}

function normalizeSearchQuery(value: string | undefined) {
  return normalizeSearchText(String(value ?? "")).slice(0, 120);
}

function getDateRange(dateOnly: string) {
  const startDate = new Date(`${dateOnly}T00:00:00+05:30`);
  const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);

  return {
    start: startDate.toISOString(),
    end: endDate.toISOString(),
  };
}

function isDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
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

function toColomboDateInputValue(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Colombo",
    year: "numeric",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${value.year}-${value.month}-${value.day}`;
}
