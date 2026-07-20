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

import { getBorrowerProfileData, getPaymentsPageData } from "../lending-service";

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
});

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
