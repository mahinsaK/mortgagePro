import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCollectorSession: vi.fn(),
  listDocuments: vi.fn(),
}));

vi.mock("@/backend/appwrite/config", () => ({
  appwriteServerConfig: {
    databaseId: "database",
    collections: {
      borrowers: "borrowers",
      loans: "loans",
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

vi.mock("@/backend/services/collector-auth-service", () => ({
  getCollectorSession: mocks.getCollectorSession,
}));

import { GET } from "./route";

describe("collector loan lookup route", () => {
  beforeEach(() => {
    mocks.getCollectorSession.mockResolvedValue({
      collectorId: "collector_1",
      lenderId: "lender_1",
      name: "Jordan",
    });
    mocks.listDocuments.mockReset();
    mocks.listDocuments
      .mockResolvedValueOnce({
        documents: [
          {
            $id: "loan_1",
            lender_id: "lender_1",
            borrower_id: "borrower_1",
            amount: 1000,
            total_paid: 300,
            remaining_amount: 700,
            daily_payment: 45,
            status: "active",
          },
        ],
      })
      .mockResolvedValueOnce({
        documents: [{ $id: "borrower_1", name: "Avery Johnson" }],
      });
  });

  it("returns the daily payment for the scanned-loan payment popup", async () => {
    const response = await GET(
      new Request("http://localhost/api/collector/loan?loanId=loan_1"),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      loan: {
        id: "loan_1",
        borrowerName: "Avery Johnson",
        dailyPayment: 45,
        remainingAmount: 700,
      },
    });

    const loanQueries = mocks.listDocuments.mock.calls[0][0].queries.join(" ");
    expect(loanQueries).toContain("daily_payment");
  });
});
