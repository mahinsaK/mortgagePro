import { appwriteServerConfig } from "@/backend/appwrite/config";
import { databases, Query } from "@/backend/appwrite/server-client";
import { normalizeSearchText } from "@/backend/services/search-text-service";
import { getPrimaryLender } from "./lender-service";

type DashboardStat = {
  label: string;
  value: string;
  change: string;
};

export type DashboardLoan = {
  id: string;
  borrower: string;
  borrowerContact: string;
  borrowerPhone: string;
  amount: string;
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
  const today = toDateInputValue(new Date());
  const todayRange = getDateRange(today);
  const loanQueries = [
    Query.equal("lender_id", lender.id),
    Query.orderDesc("created_at"),
    Query.limit(pagination.pageSize),
    Query.offset((pagination.page - 1) * pagination.pageSize),
    Query.select([
      "$id",
      "borrower_id",
      "amount",
      "daily_payment",
      "status",
      "end_date",
    ]),
  ];

  if (searchQuery) {
    loanQueries.splice(1, 0, Query.search("search_text", searchQuery));
  }

  const [loans, activeLoans, todaysPayments] = await Promise.all([
    databases.listDocuments({
      databaseId: appwriteServerConfig.databaseId,
      collectionId: appwriteServerConfig.collections.loans,
      queries: loanQueries,
    }),
    databases.listDocuments({
      databaseId: appwriteServerConfig.databaseId,
      collectionId: appwriteServerConfig.collections.loans,
      queries: [
        Query.equal("lender_id", lender.id),
        Query.equal("status", "active"),
        Query.limit(1),
        Query.select(["$id"]),
      ],
    }),
    databases.listDocuments({
      databaseId: appwriteServerConfig.databaseId,
      collectionId: appwriteServerConfig.collections.payments,
      queries: [
        Query.equal("lender_id", lender.id),
        Query.greaterThanEqual("date", todayRange.start),
        Query.lessThan("date", todayRange.end),
        Query.limit(MAX_DAILY_PAYMENT_LIMIT),
        Query.select(["amount"]),
      ],
    }),
  ]);
  const borrowerIds = uniqueStrings(
    loans.documents.map((loan) => String(loan.borrower_id ?? "")),
  );
  const borrowers =
    borrowerIds.length > 0
      ? await databases.listDocuments({
          databaseId: appwriteServerConfig.databaseId,
          collectionId: appwriteServerConfig.collections.borrowers,
          queries: [
            Query.equal("lender_id", lender.id),
            Query.equal("$id", borrowerIds),
            Query.limit(borrowerIds.length),
            Query.select(["$id", "name", "contact_info"]),
          ],
        })
      : { documents: [] };

  const borrowerNames = new Map(
    borrowers.documents.map((borrower) => [
      borrower.$id,
      String(borrower.name ?? "Unknown borrower"),
    ]),
  );
  const borrowerContacts = new Map(
    borrowers.documents.map((borrower) => {
      const contact = parseContactInfo(String(borrower.contact_info ?? ""));

      return [
        borrower.$id,
        {
          display: formatContactInfo(contact),
          phone: contact.phone,
        },
      ];
    }),
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
        label: "Active loans",
        value: String(activeLoans.total),
        change: "Currently running",
      },
      {
        label: "Today's collection",
        value: formatCurrency(todaysCollection),
        change: "Collected today",
      },
      {
        label: "",
        value: "",
        change: "",
      },
      {
        label: "",
        value: "",
        change: "",
      },
    ],
    loans: loans.documents.map((loan) => {
      const borrowerId = String(loan.borrower_id);
      const contact = borrowerContacts.get(borrowerId) ?? {
        display: "",
        phone: "",
      };

      return {
        id: loan.$id,
        borrower: borrowerNames.get(borrowerId) ?? "Unknown borrower",
        borrowerContact: contact.display,
        borrowerPhone: contact.phone,
        amount: formatCurrency(Number(loan.amount ?? 0)),
        dailyPayment: formatCurrency(Number(loan.daily_payment ?? 0)),
        status: String(loan.status ?? "active"),
        endDate: formatDate(String(loan.end_date ?? "")),
      };
    }),
  };
}

function emptyStats() {
  return [
    { label: "Active loans", value: "0", change: "Currently running" },
    { label: "Today's collection", value: "$0.00", change: "Collected today" },
    { label: "", value: "", change: "" },
    { label: "", value: "", change: "" },
  ];
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
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

function parseContactInfo(value: string) {
  if (!value) {
    return { phone: "", address: "", area: "" };
  }

  try {
    const parsed = JSON.parse(value) as Record<string, string>;
    return {
      phone: parsed.phone ?? "",
      address: parsed.address ?? "",
      area: parsed.area ?? "",
    };
  } catch {
    return { phone: value, address: "", area: "" };
  }
}

function formatContactInfo(contact: {
  phone: string;
  address: string;
  area: string;
}) {
  return [contact.phone, contact.address, contact.area].filter(Boolean).join(" / ");
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
  const startDate = new Date(`${dateOnly}T00:00:00`);
  const endDate = new Date(startDate);

  endDate.setDate(startDate.getDate() + 1);

  return {
    start: startDate.toISOString(),
    end: endDate.toISOString(),
  };
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

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
