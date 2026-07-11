import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createDocument: vi.fn(),
  deleteDocument: vi.fn(),
  listDocuments: vi.fn(),
  updateDocument: vi.fn(),
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
    databases: mocks,
    Query,
  };
});

import {
  createTenantDocument,
  deleteTenantDocument,
  listTenantDocuments,
  TenantResourceNotFoundError,
  updateTenantDocument,
} from "../tenant-data-service";

describe("tenant-data-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createDocument.mockResolvedValue({ $id: "created" });
    mocks.deleteDocument.mockResolvedValue({});
    mocks.listDocuments.mockResolvedValue({ documents: [], total: 0 });
    mocks.updateDocument.mockResolvedValue({ $id: "updated" });
  });

  it.each(["borrowers", "collectors", "loans", "payments"] as const)(
    "prepends lender ownership to every %s read",
    async (collection) => {
      await listTenantDocuments(collection, "lender_A", [
        JSON.stringify({ callerSupplied: true }),
      ]);

      const queries = mocks.listDocuments.mock.calls[0][0].queries as string[];
      expect(queries[0]).toContain('"attribute":"lender_id"');
      expect(queries[0]).toContain('"values":["lender_A"]');
      expect(queries[1]).toContain("callerSupplied");
    },
  );

  it("overwrites a caller-supplied lender ID during create", async () => {
    await createTenantDocument("loans", "lender_A", "loan_1", {
      lender_id: "lender_B",
      amount: 100,
    });

    expect(mocks.createDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ lender_id: "lender_A" }),
      }),
    );
  });

  it("strips lender ID changes during an owned update", async () => {
    mocks.listDocuments.mockResolvedValue({
      documents: [{ $id: "loan_1" }],
      total: 1,
    });

    await updateTenantDocument("loans", "lender_A", "loan_1", {
      lender_id: "lender_B",
      status: "active",
    });

    expect(mocks.updateDocument).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "active" } }),
    );
  });

  it.each(
    (["borrowers", "collectors", "loans", "payments"] as const).flatMap(
      (collection) =>
        (["update", "delete"] as const).map(
          (operation) => [collection, operation] as const,
        ),
    ),
  )(
    "does not %s:%s a cross-tenant document ID",
    async (collection, operation) => {
      const request =
        operation === "update"
          ? updateTenantDocument(collection, "lender_A", "record_B", {
              status: "active",
            })
          : deleteTenantDocument(collection, "lender_A", "record_B");

      await expect(request).rejects.toBeInstanceOf(TenantResourceNotFoundError);
      expect(mocks.updateDocument).not.toHaveBeenCalled();
      expect(mocks.deleteDocument).not.toHaveBeenCalled();
    },
  );
});
