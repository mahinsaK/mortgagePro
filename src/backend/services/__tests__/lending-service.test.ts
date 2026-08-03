import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPrimaryLender: vi.fn(),
  listDocuments: vi.fn(),
}));

vi.mock("../lender-service", () => ({
  getPrimaryLender: mocks.getPrimaryLender,
}));

vi.mock("@/backend/appwrite/config", () => ({
  appwriteServerConfig: {
    databaseId: "database",
    collections: {
      borrowers: "borrowers",
      collectors: "collectors",
      loans: "loans",
      payments: "payments",
    },
  },
}));

vi.mock("@/backend/appwrite/server-client", async () => {
  const { Query } = await import("node-appwrite");

  return {
    databases: { listDocuments: mocks.listDocuments },
    Query,
  };
});

vi.mock("@/backend/lib/currency", () => ({
  formatMoney(value: number, currency = "USD") {
    return new Intl.NumberFormat("en-US", {
      currency,
      style: "currency",
    }).format(value);
  },
}));

import {
  getBorrowerProfileData,
  getBorrowersPageData,
  getLoansPageData,
  getPaymentsPageData,
} from "../lending-service";

describe("lending-service", () => {
  beforeEach(() => {
    mocks.getPrimaryLender.mockResolvedValue({
      id: "lender_1",
      currency: "USD",
    });
    mocks.listDocuments.mockReset();
    mocks.listDocuments.mockResolvedValue({ documents: [], total: 0 });
  });

  it("sorts payments newest-first by their full creation timestamp", async () => {
    await getPaymentsPageData({ page: 1, pageSize: 10 });

    const queries = mocks.listDocuments.mock.calls[0][0].queries as string[];
    const joinedQueries = queries.join(" ");

    expect(joinedQueries).toContain('"attribute":"$createdAt"');
    expect(
      queries.filter((query) => query.includes('"method":"orderDesc"')),
    ).toHaveLength(1);
  });

  it("sorts borrower profile loans newest-first without a status filter", async () => {
    mockBorrowerProfileDocuments();

    await getBorrowerProfileData("borrower_1", { page: 1, pageSize: 5 });

    const listedLoanQueries = getLoanQueries((queries) =>
      queries.some((query) => query.includes('"method":"orderDesc"')),
    );
    const joinedQueries = listedLoanQueries.join(" ");

    expect(joinedQueries).toContain('"attribute":"created_at"');
    expect(joinedQueries).not.toContain('"attribute":"status"');
    expect(joinedQueries).toContain('"method":"limit"');
    expect(joinedQueries).toContain('"values":[5]');
  });

  it("filters completed borrower profile loans and keeps 5 loans per page", async () => {
    mockBorrowerProfileDocuments();

    const profile = await getBorrowerProfileData("borrower_1", {
      loanStatus: "completed",
      page: 2,
      pageSize: 5,
    });

    const listedLoanQueries = getLoanQueries((queries) =>
      queries.some((query) => query.includes('"method":"orderDesc"')),
    );
    const joinedQueries = listedLoanQueries.join(" ");

    expect(joinedQueries).toContain('"attribute":"status"');
    expect(joinedQueries).toContain('"values":["completed"]');
    expect(joinedQueries).toContain('"method":"limit"');
    expect(joinedQueries).toContain('"method":"offset"');
    expect(joinedQueries).toContain('"values":[5]');
    expect(profile.borrower).toMatchObject({
      loanCount: 9,
      activeLoanCount: 4,
      completedLoanCount: 3,
    });
    expect(profile.pageInfo).toMatchObject({
      page: 2,
      pageSize: 5,
      total: 7,
      totalPages: 2,
    });
  });

  it("filters and paginates active borrowers with unusable phone numbers", async () => {
    mocks.listDocuments.mockResolvedValueOnce({
      documents: [
        borrowerDocument("borrower_old", "customer 0771234567", "2026-07-01"),
        borrowerDocument("borrower_valid", "+94 77 123 4567", "2026-07-03"),
        borrowerDocument("borrower_new", "", "2026-07-04"),
      ],
      total: 3,
    });

    const result = await getBorrowersPageData({
      attention: "missing-phone",
      page: 1,
      pageSize: 1,
    });

    expect(result.borrowers.map((borrower) => borrower.id)).toEqual([
      "borrower_new",
    ]);
    expect(result.pageInfo).toMatchObject({ total: 2, totalPages: 2 });
    const queries = mocks.listDocuments.mock.calls[0][0].queries.join(" ");
    expect(queries).toContain('"attribute":"lender_id"');
    expect(queries).toContain('"attribute":"status"');
    expect(queries).toContain('"values":["active"]');
  });

  it("filters ending-soon loans with balances and preserves correct pagination", async () => {
    mocks.listDocuments.mockImplementation((params) => {
      if (params.collectionId === "loans") {
        return Promise.resolve({
          documents: [
            loanDocument("loan_old", "borrower_1", 100, "2026-07-01"),
            loanDocument("loan_paid", "borrower_2", 0, "2026-07-05"),
            loanDocument("loan_new", "borrower_3", 50, "2026-07-06"),
          ],
          total: 3,
        });
      }

      return Promise.resolve({
        documents: [{ $id: "borrower_3", name: "Newest Borrower" }],
        total: 1,
      });
    });

    const result = await getLoansPageData({
      attention: "ending-soon",
      asOf: "2026-08-04",
      page: 1,
      pageSize: 1,
    });

    expect(result.loans.map((loan) => loan.id)).toEqual(["loan_new"]);
    expect(result.pageInfo).toMatchObject({ total: 2, totalPages: 2 });
    const queries = mocks.listDocuments.mock.calls[0][0].queries.join(" ");
    expect(queries).toContain('"attribute":"lender_id"');
    expect(queries).toContain('"attribute":"status"');
    expect(queries).toContain('"attribute":"end_date"');
    expect(queries).toContain("2026-08-05T00:00:00.000Z");
    expect(queries).toContain("2026-08-12T00:00:00.000Z");
  });
});

function borrowerDocument(id: string, contact: string, createdAt: string) {
  return {
    $id: id,
    $createdAt: `${createdAt}T00:00:00.000Z`,
    name: id,
    business_name: "",
    contact,
    address: "",
    status: "active",
    created_at: `${createdAt}T00:00:00.000Z`,
  };
}

function loanDocument(
  id: string,
  borrowerId: string,
  remainingAmount: number,
  createdAt: string,
) {
  return {
    $id: id,
    $createdAt: `${createdAt}T00:00:00.000Z`,
    borrower_id: borrowerId,
    amount: 1000,
    interest_rate: 10,
    daily_payment: 100,
    total_paid: 1000 - remainingAmount,
    remaining_amount: remainingAmount,
    start_date: "2026-07-01T00:00:00.000Z",
    end_date: "2026-08-10T00:00:00.000Z",
    status: "active",
    created_at: `${createdAt}T00:00:00.000Z`,
  };
}

function mockBorrowerProfileDocuments() {
  mocks.listDocuments.mockImplementation((params) => {
    const queries = params.queries as string[];
    const joinedQueries = queries.join(" ");

    if (params.collectionId === "borrowers") {
      return Promise.resolve({
        documents: [
          {
            $id: "borrower_1",
            $createdAt: "2026-07-20T08:00:00.000Z",
            name: "Avery Johnson",
            business_name: "Johnson Market",
            contact: "+94 77 123 0101",
            address: "22 Cedar Road",
            status: "active",
            created_at: "2026-07-20T08:00:00.000Z",
          },
        ],
        total: 1,
      });
    }

    if (params.collectionId !== "loans") {
      return Promise.resolve({ documents: [], total: 0 });
    }

    if (joinedQueries.includes('"method":"orderDesc"')) {
      return Promise.resolve({
        documents: [
          {
            $id: "loan_1",
            borrower_id: "borrower_1",
            amount: 1000,
            interest_rate: 10,
            daily_payment: 100,
            total_paid: 1000,
            remaining_amount: 0,
            start_date: "2026-07-01T00:00:00.000Z",
            end_date: "2026-07-10T00:00:00.000Z",
            status: "completed",
          },
        ],
        total: 7,
      });
    }

    if (joinedQueries.includes('"values":["active"]')) {
      return Promise.resolve({ documents: [{ $id: "loan_active" }], total: 4 });
    }

    if (joinedQueries.includes('"values":["completed"]')) {
      return Promise.resolve({
        documents: [{ $id: "loan_completed" }],
        total: 3,
      });
    }

    return Promise.resolve({ documents: [{ $id: "loan_total" }], total: 9 });
  });
}

function getLoanQueries(predicate: (queries: string[]) => boolean) {
  const loanCall = mocks.listDocuments.mock.calls.find(([params]) => {
    const queries = params.queries as string[];
    return params.collectionId === "loans" && predicate(queries);
  });

  if (!loanCall) {
    throw new Error("Expected loan query was not called.");
  }

  return loanCall[0].queries as string[];
}
