import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createTenantDocument: vi.fn(),
  getPrimaryLender: vi.fn(),
  hashCollectorPassword: vi.fn(),
  listDocuments: vi.fn(),
  requireTenantDocument: vi.fn(),
  updateTenantDocument: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/backend/appwrite/config", () => ({
  appwriteServerConfig: {
    databaseId: "database",
    collections: { collectors: "collectors", lenders: "lenders" },
  },
}));
vi.mock("@/backend/appwrite/server-client", async () => {
  const { Query } = await import("node-appwrite");
  return {
    databases: {
      listDocuments: mocks.listDocuments,
      updateDocument: vi.fn(),
    },
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
  createTenantDocument: mocks.createTenantDocument,
  deleteTenantDocument: vi.fn(),
  listTenantDocuments: vi.fn(),
  requireTenantDocument: mocks.requireTenantDocument,
  updateTenantDocument: mocks.updateTenantDocument,
}));

import {
  createCollectorAction,
  updateCollectorAction,
  type CreateCollectorActionState,
} from "../lending-actions";

const INITIAL_COLLECTOR_STATE: CreateCollectorActionState = {
  status: "idle",
  message: "",
};

function collectorForm(status: "active" | "inactive", password = "") {
  const formData = new FormData();
  formData.set("collector_id", "collector_A");
  formData.set("name", "Jordan Lee");
  formData.set("status", status);
  formData.set("password", password);
  return formData;
}

function newCollectorForm(username = "jordanlee4821") {
  const formData = new FormData();
  formData.set("username", username);
  formData.set("name", "Jordan Lee");
  formData.set("phone", "+1 555 0102");
  formData.set("area", "Austin North");
  formData.set("password", "CollectorPass123!");
  formData.set("status", "active");
  return formData;
}

describe("collector writes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPrimaryLender.mockResolvedValue({ id: "lender_A" });
    mocks.listDocuments.mockResolvedValue({ documents: [], total: 0 });
    mocks.requireTenantDocument.mockResolvedValue({ $id: "collector_A" });
    mocks.hashCollectorPassword.mockReturnValue("new-hash");
    mocks.createTenantDocument.mockResolvedValue({ $id: "jordanlee4821" });
  });

  it("uses the permanent username as the collector document ID", async () => {
    const result = await createCollectorAction(
      INITIAL_COLLECTOR_STATE,
      newCollectorForm(),
    );

    expect(result).toMatchObject({ status: "success" });
    expect(mocks.hashCollectorPassword).toHaveBeenCalledWith(
      "CollectorPass123!",
    );
    expect(mocks.createTenantDocument).toHaveBeenCalledWith(
      "collectors",
      "lender_A",
      "jordanlee4821",
      expect.objectContaining({
        name: "Jordan Lee",
        password_hash: "new-hash",
      }),
    );
    expect(mocks.createTenantDocument.mock.calls[0][3]).not.toHaveProperty(
      "session_version",
    );
  });

  it("returns an inline error when the username already exists", async () => {
    mocks.listDocuments.mockResolvedValue({
      documents: [{ $id: "jordanlee4821" }],
      total: 1,
    });

    const result = await createCollectorAction(
      INITIAL_COLLECTOR_STATE,
      newCollectorForm(),
    );

    expect(result).toMatchObject({
      status: "error",
      submittedUsername: "jordanlee4821",
      fieldErrors: { username: "Username already exists." },
    });
    expect(mocks.createTenantDocument).not.toHaveBeenCalled();
  });

  it("handles an Appwrite duplicate race as an inline error", async () => {
    mocks.createTenantDocument.mockRejectedValue({ code: 409 });

    const result = await createCollectorAction(
      INITIAL_COLLECTOR_STATE,
      newCollectorForm(),
    );

    expect(result).toMatchObject({
      status: "error",
      fieldErrors: { username: "Username already exists." },
    });
  });

  it("rejects invalid new usernames before querying Appwrite", async () => {
    const result = await createCollectorAction(
      INITIAL_COLLECTOR_STATE,
      newCollectorForm("JordanLee4821"),
    );

    expect(result).toMatchObject({ status: "error" });
    expect(mocks.listDocuments).not.toHaveBeenCalled();
    expect(mocks.createTenantDocument).not.toHaveBeenCalled();
  });

  it("updates the password hash when the password changes", async () => {
    await updateCollectorAction(collectorForm("active", "NewPassword123!"));

    expect(mocks.updateTenantDocument).toHaveBeenCalledWith(
      "collectors",
      "lender_A",
      "collector_A",
      expect.objectContaining({
        password_hash: "new-hash",
      }),
    );
  });

  it("updates the collector status", async () => {
    await updateCollectorAction(collectorForm("inactive"));

    expect(mocks.updateTenantDocument).toHaveBeenCalledWith(
      "collectors",
      "lender_A",
      "collector_A",
      expect.objectContaining({ status: "inactive" }),
    );
  });

  it("returns an inline error for a short replacement password", async () => {
    const result = await updateCollectorAction(
      collectorForm("active", "short"),
    );

    expect(result).toEqual({
      status: "error",
      message: "Collector password must be at least 8 characters.",
    });
    expect(mocks.updateTenantDocument).not.toHaveBeenCalled();
  });

  it("ignores a manipulated username during collector updates", async () => {
    const formData = collectorForm("active");
    formData.set("username", "attackerchosen9999");

    await updateCollectorAction(formData);

    expect(mocks.updateTenantDocument).toHaveBeenCalledWith(
      "collectors",
      "lender_A",
      "collector_A",
      expect.not.objectContaining({ username: expect.anything() }),
    );
  });
});
