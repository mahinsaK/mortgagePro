import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  clearIdentityLimit: vi.fn(),
  clearCollectorSession: vi.fn(),
  consumeAuthAttempt: vi.fn(),
  getLenderCurrencyById: vi.fn(),
  listDocuments: vi.fn(),
  recordTenantLoanPayment: vi.fn(),
  sendAutomaticPaymentSms: vi.fn(),
  redirect: vi.fn(),
  recordSecurityEvent: vi.fn(),
  requireActiveCollectorPrincipal: vi.fn(),
  setCollectorSession: vi.fn(),
  normalizeSessionVersion: vi.fn((value: unknown) => Number(value ?? 1)),
  verifyCollectorPassword: vi.fn(),
  updateTenantDocument: vi.fn(),
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
  clearCollectorSession: mocks.clearCollectorSession,
  normalizeSessionVersion: mocks.normalizeSessionVersion,
  requireActiveCollectorPrincipal: mocks.requireActiveCollectorPrincipal,
  setCollectorSession: mocks.setCollectorSession,
  verifyCollectorPassword: mocks.verifyCollectorPassword,
}));
vi.mock("@/backend/services/tenant-data-service", () => ({
  updateTenantDocument: mocks.updateTenantDocument,
}));
vi.mock("@/backend/services/lender-service", () => ({
  getLenderCurrencyById: mocks.getLenderCurrencyById,
}));
vi.mock("@/backend/services/payment-recording-service", () => ({
  PaymentWriteError: class PaymentWriteError extends Error {},
  recordTenantLoanPayment: mocks.recordTenantLoanPayment,
}));
vi.mock("@/backend/services/payment-sms-service", () => ({
  sendAutomaticPaymentSms: mocks.sendAutomaticPaymentSms,
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
  collectorLogoutAllDevicesAction,
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
          session_version: 1,
        },
      ],
      total: 1,
    });
    mocks.verifyCollectorPassword.mockReturnValue(true);
    mocks.getLenderCurrencyById.mockResolvedValue("LKR");
    mocks.consumeAuthAttempt.mockResolvedValue({ allowed: true });
    mocks.sendAutomaticPaymentSms.mockResolvedValue({ status: "disabled" });
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
    expect(serialized).toContain("session_version");
    expect(mocks.setCollectorSession).toHaveBeenCalledWith({
      collectorId: "jordanlee4821",
      currency: "LKR",
      lenderId: "lender_A",
      name: "Jordan Lee",
      passwordHash: "stored",
      sessionVersion: 1,
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

  it("increments the session generation when logging out every device", async () => {
    mocks.requireActiveCollectorPrincipal.mockResolvedValue({
      collectorId: "collector_A",
      lenderId: "lender_A",
      sessionVersion: 4,
    });

    await expect(collectorLogoutAllDevicesAction()).rejects.toThrow(
      "redirect:/collector/login?status=success",
    );

    expect(mocks.updateTenantDocument).toHaveBeenCalledWith(
      "collectors",
      "lender_A",
      "collector_A",
      { session_version: 5 },
    );
    expect(mocks.clearCollectorSession).toHaveBeenCalledTimes(1);
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
    expect(mocks.sendAutomaticPaymentSms).not.toHaveBeenCalled();
  });

  it("sends one automatic receipt only after a new payment succeeds", async () => {
    mocks.requireActiveCollectorPrincipal.mockResolvedValue({
      collectorId: "collector_A",
      lenderId: "lender_A",
      name: "Jordan Lee",
    });
    mocks.recordTenantLoanPayment.mockResolvedValue({
      paymentId: "payment_123",
      loanId: "loan_A",
      remainingAmount: 900,
      recordedAt: "2026-08-07T05:00:00.000Z",
      duplicate: false,
    });
    mocks.sendAutomaticPaymentSms.mockResolvedValue({ status: "sent" });
    const formData = new FormData();
    formData.set("loan_id", "loan_A");
    formData.set("amount", "100");
    formData.set("payment_request_id", "12345678-1234-1234-1234-123456789012");

    await expect(collectScannedPaymentAction(formData)).rejects.toThrow(
      "redirect:/collector/scan?status=success",
    );
    expect(mocks.sendAutomaticPaymentSms).toHaveBeenCalledWith({
      lenderId: "lender_A",
      loanId: "loan_A",
      paymentId: "payment_123",
      amount: 100,
      remainingAmount: 900,
      recordedAt: "2026-08-07T05:00:00.000Z",
    });
  });

  it("does not send another receipt for an idempotent duplicate payment", async () => {
    mocks.requireActiveCollectorPrincipal.mockResolvedValue({
      collectorId: "collector_A",
      lenderId: "lender_A",
      name: "Jordan Lee",
    });
    mocks.recordTenantLoanPayment.mockResolvedValue({
      paymentId: "payment_123",
      loanId: "loan_A",
      remainingAmount: 900,
      recordedAt: "",
      duplicate: true,
    });
    const formData = new FormData();
    formData.set("loan_id", "loan_A");
    formData.set("amount", "100");
    formData.set("payment_request_id", "12345678-1234-1234-1234-123456789012");

    await expect(collectScannedPaymentAction(formData)).rejects.toThrow(
      "redirect:/collector/scan?status=success",
    );
    expect(mocks.sendAutomaticPaymentSms).not.toHaveBeenCalled();
  });
});
