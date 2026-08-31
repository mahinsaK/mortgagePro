import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createTenantDocument: vi.fn(),
  clearAuthSession: vi.fn(),
  getPrimaryLender: vi.fn(),
  hashCollectorPassword: vi.fn(),
  listDocuments: vi.fn(),
  requireTenantDocument: vi.fn(),
  updateDocument: vi.fn(),
  updateTenantDocument: vi.fn(),
  updateUserPassword: vi.fn(),
  deleteUserSessions: vi.fn(),
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
      updateDocument: mocks.updateDocument,
    },
    Query,
    users: {
      updatePassword: mocks.updateUserPassword,
      deleteSessions: mocks.deleteUserSessions,
    },
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
  normalizeSessionVersion: vi.fn((value: unknown) => Number(value ?? 1)),
}));
vi.mock("@/backend/services/auth-session-service", () => ({
  clearAuthSession: mocks.clearAuthSession,
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
  createLoanForBorrowerFormAction,
  updateCollectorAction,
  updateLenderProfileAction,
  updateLenderPasswordAction,
  type CreateCollectorActionState,
  type CreateLoanActionState,
} from "../lending-actions";

const INITIAL_COLLECTOR_STATE: CreateCollectorActionState = {
  status: "idle",
  message: "",
};

const INITIAL_LOAN_STATE: CreateLoanActionState = {
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

function newLoanForm() {
  const formData = new FormData();
  formData.set("borrower_id", "borrower_A");
  formData.set("amount", "2500");
  formData.set("interest_rate", "8");
  formData.set("daily_payment", "50");
  formData.set("start_date", "2026-08-03");
  formData.set("end_date", "2026-10-03");
  return formData;
}

describe("collector writes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPrimaryLender.mockResolvedValue({
      id: "lender_A",
      appwriteUserId: "user_A",
    });
    mocks.listDocuments.mockResolvedValue({ documents: [], total: 0 });
    mocks.requireTenantDocument.mockResolvedValue({
      $id: "collector_A",
      session_version: 1,
      status: "active",
    });
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
    expect(mocks.createTenantDocument.mock.calls[0][3]).toHaveProperty(
      "session_version",
      1,
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
        session_version: 2,
      }),
    );
  });

  it("updates the collector status", async () => {
    await updateCollectorAction(collectorForm("inactive"));

    expect(mocks.updateTenantDocument).toHaveBeenCalledWith(
      "collectors",
      "lender_A",
      "collector_A",
      expect.objectContaining({ status: "inactive", session_version: 2 }),
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
    expect(mocks.updateTenantDocument.mock.calls[0][3]).not.toHaveProperty(
      "session_version",
    );
  });

  it("returns inline lender password validation errors", async () => {
    const formData = new FormData();
    formData.set("password", "NewPassword123!");
    formData.set("confirm_password", "DifferentPassword123!");

    const result = await updateLenderPasswordAction(formData);

    expect(result).toEqual({
      status: "error",
      message: "Password and confirmation do not match.",
    });
    expect(mocks.updateUserPassword).not.toHaveBeenCalled();
  });

  it("updates a lender password and signs out every device", async () => {
    const formData = new FormData();
    formData.set("password", "NewPassword123!");
    formData.set("confirm_password", "NewPassword123!");

    await updateLenderPasswordAction(formData);
    expect(mocks.updateUserPassword).toHaveBeenCalledWith({
      userId: "user_A",
      password: "NewPassword123!",
    });
    expect(mocks.deleteUserSessions).toHaveBeenCalledWith({ userId: "user_A" });
    expect(mocks.clearAuthSession).toHaveBeenCalledTimes(1);
  });
});

describe("lender profile updates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPrimaryLender.mockResolvedValue({
      id: "lender_A",
      appwriteUserId: "user_A",
    });
  });

  it("keeps lender email and status read-only for manipulated submissions", async () => {
    const formData = new FormData();
    formData.set("company_name", "Updated Company");
    formData.set("phone", "+94 77 123 4567");
    formData.set("address", "Colombo");
    formData.set("currency", "LKR");
    formData.set("email", "attacker@example.com");
    formData.set("status", "inactive");

    await updateLenderProfileAction(formData);

    expect(mocks.updateDocument).toHaveBeenCalledWith({
      databaseId: "database",
      collectionId: "lenders",
      documentId: "lender_A",
      data: expect.objectContaining({
        company_name: "Updated Company",
        currency: "LKR",
      }),
    });
    const update = mocks.updateDocument.mock.calls[0][0].data;
    expect(update).not.toHaveProperty("email");
    expect(update).not.toHaveProperty("status");
  });
});

describe("loan creation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPrimaryLender.mockResolvedValue({ id: "lender_A" });
    mocks.requireTenantDocument.mockResolvedValue({
      $id: "borrower_A",
      name: "Alex Borrower",
      contact: "+1 555 0104",
      address: "Austin",
    });
    mocks.createTenantDocument.mockResolvedValue({ $id: "loan_new" });
  });

  it("returns success after the loan is stored", async () => {
    const result = await createLoanForBorrowerFormAction(
      INITIAL_LOAN_STATE,
      newLoanForm(),
    );

    expect(result).toEqual({
      status: "success",
      message: "Loan created successfully.",
    });
    expect(mocks.createTenantDocument).toHaveBeenCalledWith(
      "loans",
      "lender_A",
      expect.stringMatching(/^loan_/),
      expect.objectContaining({
        borrower_id: "borrower_A",
        amount: 2500,
        remaining_amount: 2500,
      }),
    );
  });

  it("returns an inline error when the loan is not stored", async () => {
    mocks.createTenantDocument.mockRejectedValue(new Error("Appwrite failure"));

    const result = await createLoanForBorrowerFormAction(
      INITIAL_LOAN_STATE,
      newLoanForm(),
    );

    expect(result).toEqual({
      status: "error",
      message: "Loan could not be created. Check the details and try again.",
    });
  });
});
