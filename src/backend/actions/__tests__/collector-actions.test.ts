import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createTenantDocument: vi.fn(),
  getTenantDocument: vi.fn(),
  listDocuments: vi.fn(),
  redirect: vi.fn(),
  requireActiveCollectorPrincipal: vi.fn(),
  setCollectorSession: vi.fn(),
  updateTenantDocument: vi.fn(),
  verifyCollectorPassword: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/backend/appwrite/config", () => ({
  appwriteServerConfig: {
    databaseId: "database",
    collections: { collectors: "collectors" },
  },
}));
vi.mock("@/backend/appwrite/server-client", async () => {
  const { Query } = await import("node-appwrite");
  return { databases: { listDocuments: mocks.listDocuments }, Query };
});
vi.mock("@/backend/modules/payments/controller", () => ({
  PaymentController: class PaymentController {},
}));
vi.mock("@/backend/modules/payments/service", () => ({
  PaymentService: class PaymentService {},
}));
vi.mock("@/backend/services/collector-auth-service", () => ({
  clearCollectorSession: vi.fn(),
  requireActiveCollectorPrincipal: mocks.requireActiveCollectorPrincipal,
  setCollectorSession: mocks.setCollectorSession,
  verifyCollectorPassword: mocks.verifyCollectorPassword,
}));
vi.mock("@/backend/services/tenant-data-service", () => ({
  createTenantDocument: mocks.createTenantDocument,
  getTenantDocument: mocks.getTenantDocument,
  updateTenantDocument: mocks.updateTenantDocument,
}));

import {
  collectScannedPaymentAction,
  collectorLoginAction,
} from "../collector-actions";

describe("collectorLoginAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listDocuments.mockResolvedValue({
      documents: [
        {
          $id: "collector_A",
          lender_id: "lender_A",
          name: "Jordan Lee",
          password_hash: "stored",
          session_version: 7,
        },
      ],
      total: 1,
    });
    mocks.verifyCollectorPassword.mockReturnValue(true);
    mocks.redirect.mockImplementation((path: string) => {
      throw new Error(`redirect:${path}`);
    });
  });

  it("authenticates by collector ID and stores the current session version", async () => {
    const formData = new FormData();
    formData.set("collector_id", "collector_A");
    formData.set("password", "CollectorPass123!");

    await expect(collectorLoginAction(formData)).rejects.toThrow(
      "redirect:/collector/scan",
    );

    const queries = mocks.listDocuments.mock.calls[0][0].queries as string[];
    const serialized = queries.join(" ");
    expect(serialized).toContain('"attribute":"$id"');
    expect(serialized).toContain('"values":["collector_A"]');
    expect(serialized).not.toContain('"attribute":"name"');
    expect(mocks.setCollectorSession).toHaveBeenCalledWith({
      collectorId: "collector_A",
      lenderId: "lender_A",
      name: "Jordan Lee",
      sessionVersion: 7,
    });
  });

  it("does not collect a loan outside the collector lender", async () => {
    mocks.requireActiveCollectorPrincipal.mockResolvedValue({
      collectorId: "collector_A",
      lenderId: "lender_A",
      name: "Jordan Lee",
      sessionVersion: 1,
    });
    mocks.getTenantDocument.mockImplementation((collection: string) =>
      Promise.resolve(
        collection === "collectors"
          ? { $id: "collector_A", status: "active" }
          : null,
      ),
    );
    const formData = new FormData();
    formData.set("loan_id", "loan_B");
    formData.set("amount", "100");

    await expect(collectScannedPaymentAction(formData)).rejects.toThrow(
      "redirect:/collector/scan?status=error",
    );
    expect(mocks.getTenantDocument).toHaveBeenCalledWith(
      "loans",
      "lender_A",
      "loan_B",
      expect.any(Array),
    );
    expect(mocks.createTenantDocument).not.toHaveBeenCalled();
    expect(mocks.updateTenantDocument).not.toHaveBeenCalled();
  });
});
