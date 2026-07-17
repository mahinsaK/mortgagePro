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

import { getPaymentsPageData } from "../lending-service";

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
});
