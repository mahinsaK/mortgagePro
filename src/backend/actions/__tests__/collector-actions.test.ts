import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  clearIdentityLimit: vi.fn(),
  consumeAuthAttempt: vi.fn(),
  listDocuments: vi.fn(),
  recordTenantLoanPayment: vi.fn(),
  redirect: vi.fn(),
  recordSecurityEvent: vi.fn(),
  requireActiveCollectorPrincipal: vi.fn(),
  setCollectorSession: vi.fn(),
  verifyCollectorPassword: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));
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
vi.mock("@/backend/services/collector-auth-service", () => ({
  clearCollectorSession: vi.fn(),
  requireActiveCollectorPrincipal: mocks.requireActiveCollectorPrincipal,
  setCollectorSession: mocks.setCollectorSession,
  verifyCollectorPassword: mocks.verifyCollectorPassword,
}));
vi.mock("@/backend/services/payment-recording-service", () => ({
  PaymentWriteError: class PaymentWriteError extends Error {},
  recordTenantLoanPayment: mocks.recordTenantLoanPayment,
}));
vi.mock("@/backend/services/authentication-rate-limit-service", () => ({
  clearAuthenticationIdentityLimit: mocks.clearIdentityLimit,
  consumeAuthenticationAttempt: mocks.consumeAuthAttempt,
  RATE_LIMITED_MESSAGE: "Too many sign-in attempts. Please wait and try again.",
}));
vi.mock("@/backend/services/security-event-service", () => ({
  recordSecurityEvent: mocks.recordSecurityEvent,
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
          $id: "jordanlee4821",
          lender_id: "lender_A",
          name: "Jordan Lee",
          password_hash: "stored",
        },
      ],
      total: 1,
    });
    mocks.verifyCollectorPassword.mockReturnValue(true);
    mocks.consumeAuthAttempt.mockResolvedValue({ allowed: true });
    mocks.redirect.mockImplementation((path: string) => {
      throw new Error(`redirect:${path}`);
    });
  });

  it("authenticates by username and stores the collector identity", async () => {
    const formData = new FormData();
    formData.set("username", "jordanlee4821");
    formData.set("password", "CollectorPass123!");

    await expect(collectorLoginAction(formData)).rejects.toThrow(
      "redirect:/collector/scan",
    );

    const queries = mocks.listDocuments.mock.calls[0][0].queries as string[];
    const serialized = queries.join(" ");
    expect(serialized).toContain('"attribute":"$id"');
    expect(serialized).toContain('"values":["jordanlee4821"]');
    expect(serialized).not.toContain('"attribute":"name"');
    expect(serialized).not.toContain("session_version");
    expect(mocks.setCollectorSession).toHaveBeenCalledWith({
      collectorId: "jordanlee4821",
      lenderId: "lender_A",
      name: "Jordan Lee",
      passwordHash: "stored",
    });
    expect(mocks.clearIdentityLimit).toHaveBeenCalledWith(
      "collector_login",
      "jordanlee4821",
    );
    expect(mocks.recordSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "collector_login_success",
        lenderId: "lender_A",
      }),
    );
  });

  it("does not query collectors after the login limit is reached", async () => {
    mocks.consumeAuthAttempt.mockResolvedValue({ allowed: false });
    const formData = new FormData();
    formData.set("username", "jordanlee4821");
    formData.set("password", "CollectorPass123!");

    await expect(collectorLoginAction(formData)).rejects.toThrow(
      "redirect:/collector/login?status=error",
    );
    expect(mocks.listDocuments).not.toHaveBeenCalled();
    expect(mocks.setCollectorSession).not.toHaveBeenCalled();
    expect(mocks.recordSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "collector_login_blocked" }),
    );
  });

  it("continues to accept an existing legacy collector ID as the username", async () => {
    mocks.listDocuments.mockResolvedValue({
      documents: [
        {
          $id: "collector_A",
          lender_id: "lender_A",
          name: "Jordan Lee",
          password_hash: "stored",
        },
      ],
      total: 1,
    });
    const formData = new FormData();
    formData.set("username", "collector_A");
    formData.set("password", "CollectorPass123!");

    await expect(collectorLoginAction(formData)).rejects.toThrow(
      "redirect:/collector/scan",
    );
    expect(mocks.setCollectorSession).toHaveBeenCalledWith(
      expect.objectContaining({ collectorId: "collector_A" }),
    );
  });

  it("returns a generic error for an unknown username", async () => {
    mocks.listDocuments.mockResolvedValue({ documents: [], total: 0 });
    const formData = new FormData();
    formData.set("username", "unknownuser4821");
    formData.set("password", "CollectorPass123!");

    await expect(collectorLoginAction(formData)).rejects.toThrow(
      "redirect:/collector/login?status=error&message=Username%20or%20password%20is%20incorrect.",
    );
    expect(mocks.verifyCollectorPassword).not.toHaveBeenCalled();
    expect(mocks.setCollectorSession).not.toHaveBeenCalled();
  });

  it("does not collect a loan outside the collector lender", async () => {
    mocks.requireActiveCollectorPrincipal.mockResolvedValue({
      collectorId: "collector_A",
      lenderId: "lender_A",
      name: "Jordan Lee",
    });
    mocks.recordTenantLoanPayment.mockRejectedValue(
      new Error("Loan not found for this lender."),
    );
    const formData = new FormData();
    formData.set("loan_id", "loan_B");
    formData.set("amount", "100");
    formData.set("payment_request_id", "12345678-1234-1234-1234-123456789012");

    await expect(collectScannedPaymentAction(formData)).rejects.toThrow(
      "redirect:/collector/scan?loan=loan_B&status=error",
    );
    expect(mocks.recordTenantLoanPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        lenderId: "lender_A",
        collectorId: "collector_A",
        loanId: "loan_B",
        amount: 100,
        requestId: "12345678-1234-1234-1234-123456789012",
      }),
    );
  });
});
