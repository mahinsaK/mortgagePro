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

vi.mock("@/backend/services/search-text-service", () => ({
  normalizeSearchText(value: string) {
    return value.toLowerCase().replaceAll(/[^a-z0-9]+/g, " ").trim();
  },
}));

import { getLenderDashboardData } from "../dashboard-service";

describe("dashboard-service", () => {
  beforeEach(() => {
    mocks.getPrimaryLender.mockResolvedValue({
      id: "lender_1",
      currency: "USD",
    });
    mocks.listDocuments.mockReset();
    mocks.listDocuments.mockImplementation(({ collectionId, queries }) => {
      const joinedQueries = (queries as string[]).join(" ");

      if (collectionId === "loans" && joinedQueries.includes('"attribute":"search_text"')) {
        return Promise.resolve({ documents: [], total: 0 });
      }

      if (collectionId === "borrowers" && joinedQueries.includes('"method":"or"')) {
        return Promise.resolve({
          documents: [{ $id: "borrower_1" }],
          total: 1,
        });
      }

      if (collectionId === "loans" && joinedQueries.includes('"attribute":"borrower_id"')) {
        return Promise.resolve({
          documents: [
            {
              $id: "loan_1",
              borrower_id: "borrower_1",
              amount: 1000,
              total_paid: 100,
              remaining_amount: 900,
              daily_payment: 50,
              status: "active",
              end_date: "2026-08-01T00:00:00.000Z",
            },
          ],
          total: 1,
        });
      }

      if (
        collectionId === "loans" &&
        joinedQueries.includes('"attribute":"end_date"') &&
        joinedQueries.includes('"method":"lessThan"')
      ) {
        return Promise.resolve({
          documents: [
            {
              $id: "loan_overdue",
              borrower_id: "borrower_1",
              amount: 800,
              total_paid: 300,
              remaining_amount: 500,
              daily_payment: 40,
              status: "overdue",
              end_date: "2026-07-15T00:00:00.000Z",
            },
          ],
          total: 3,
        });
      }

      if (collectionId === "borrowers" && joinedQueries.includes('"attribute":"$id"')) {
        return Promise.resolve({
          documents: [
            {
              $id: "borrower_1",
              name: "Avery Johnson",
              contact: "+1 555 0101",
              address: "22 Cedar Road",
            },
          ],
          total: 1,
        });
      }

      if (collectionId === "borrowers") {
        return Promise.resolve({ documents: [], total: 1 });
      }

      if (collectionId === "loans") {
        return Promise.resolve({ documents: [], total: 1 });
      }

      if (collectionId === "payments") {
        return Promise.resolve({ documents: [{ amount: 75 }], total: 1 });
      }

      return Promise.resolve({ documents: [], total: 0 });
    });
  });

  it("falls back to borrower name, address, and contact search when loan search has no matches", async () => {
    const dashboard = await getLenderDashboardData({ query: "avery" });
    const borrowerFallbackCall = mocks.listDocuments.mock.calls.find(
      ([params]) =>
        params.collectionId === "borrowers" &&
        (params.queries as string[]).join(" ").includes('"method":"or"'),
    );
    const fallbackQueries = borrowerFallbackCall?.[0].queries.join(" ") ?? "";

    expect(fallbackQueries).toContain('"attribute":"name"');
    expect(fallbackQueries).toContain('"attribute":"address"');
    expect(fallbackQueries).toContain('"attribute":"contact"');
    expect(dashboard.loans).toHaveLength(1);
    expect(dashboard.loans[0]).toMatchObject({
      id: "loan_1",
      borrowerId: "borrower_1",
      borrower: "Avery Johnson",
      borrowerContact: "+1 555 0101",
    });
    expect(dashboard.overdueLoans).toHaveLength(1);
    expect(dashboard.overdueLoans[0]).toMatchObject({
      id: "loan_overdue",
      borrowerId: "borrower_1",
      borrower: "Avery Johnson",
      remainingAmount: "$500.00",
      status: "overdue",
    });
    expect(dashboard.stats[3]).toEqual({
      label: "Overdue loans",
      value: "3",
      change: "Past the end date",
    });

    const overdueCall = mocks.listDocuments.mock.calls.find(
      ([params]) =>
        params.collectionId === "loans" &&
        (params.queries as string[]).join(" ").includes('"method":"lessThan"'),
    );
    const overdueQueries = overdueCall?.[0].queries.join(" ") ?? "";

    expect(overdueQueries).toContain('"attribute":"lender_id"');
    expect(overdueQueries).toContain('"values":["active","overdue"]');
    expect(overdueQueries).toContain('"attribute":"end_date"');
    expect(overdueQueries).toContain('"method":"orderAsc"');
  });
});
