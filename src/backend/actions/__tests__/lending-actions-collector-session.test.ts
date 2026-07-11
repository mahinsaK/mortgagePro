import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPrimaryLender: vi.fn(),
  hashCollectorPassword: vi.fn(),
  requireTenantDocument: vi.fn(),
  updateTenantDocument: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/backend/appwrite/config", () => ({
  appwriteServerConfig: {
    databaseId: "database",
    collections: { lenders: "lenders" },
  },
}));
vi.mock("@/backend/appwrite/server-client", async () => {
  const { Query } = await import("node-appwrite");
  return {
    databases: { updateDocument: vi.fn() },
    Query,
    users: { updatePassword: vi.fn() },
  };
});
vi.mock("@/backend/lib/currency", () => ({
  normalizeCurrency: vi.fn((value: string) => value || "USD"),
}));
vi.mock("@/backend/modules/payments/service", () => ({
  PaymentService: class PaymentService {},
}));
vi.mock("@/backend/services/collector-auth-service", () => ({
  hashCollectorPassword: mocks.hashCollectorPassword,
}));
vi.mock("@/backend/services/lender-service", () => ({
  getPrimaryLender: mocks.getPrimaryLender,
}));
vi.mock("@/backend/services/search-text-service", () => ({
  createBorrowerSearchText: vi.fn(() => "borrower search"),
  createLoanSearchText: vi.fn(() => "loan search"),
}));
vi.mock("@/backend/services/tenant-data-service", () => ({
  createTenantDocument: vi.fn(),
  deleteTenantDocument: vi.fn(),
  listTenantDocuments: vi.fn(),
  requireTenantDocument: mocks.requireTenantDocument,
  updateTenantDocument: mocks.updateTenantDocument,
}));

import { updateCollectorAction } from "../lending-actions";

function collectorForm(status: "active" | "inactive", password = "") {
  const formData = new FormData();
  formData.set("collector_id", "collector_A");
  formData.set("name", "Jordan Lee");
  formData.set("status", status);
  formData.set("password", password);
  return formData;
}

describe("collector session revocation on lender updates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPrimaryLender.mockResolvedValue({ id: "lender_A" });
    mocks.requireTenantDocument.mockResolvedValue({
      $id: "collector_A",
      session_version: 4,
      status: "active",
    });
    mocks.hashCollectorPassword.mockReturnValue("new-hash");
  });

  it("increments the session version after a password change", async () => {
    await updateCollectorAction(collectorForm("active", "NewPassword123!"));

    expect(mocks.updateTenantDocument).toHaveBeenCalledWith(
      "collectors",
      "lender_A",
      "collector_A",
      expect.objectContaining({
        password_hash: "new-hash",
        session_version: 5,
      }),
    );
  });

  it("increments the session version after a status change", async () => {
    await updateCollectorAction(collectorForm("inactive"));

    expect(mocks.updateTenantDocument).toHaveBeenCalledWith(
      "collectors",
      "lender_A",
      "collector_A",
      expect.objectContaining({ status: "inactive", session_version: 5 }),
    );
  });
});
