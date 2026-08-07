import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDocument: vi.fn(),
  listDocuments: vi.fn(),
  listTenantDocuments: vi.fn(),
  sendTenantSmsBatch: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/backend/appwrite/config", () => ({
  appwriteServerConfig: {
    databaseId: "database",
    collections: {
      lenders: "lenders",
      smsAccounts: "sms_accounts",
    },
  },
}));
vi.mock("@/backend/appwrite/server-client", async () => {
  const { Query } = await import("node-appwrite");
  return {
    databases: {
      getDocument: mocks.getDocument,
      listDocuments: mocks.listDocuments,
    },
    Query,
  };
});
vi.mock("@/backend/services/tenant-data-service", () => ({
  listTenantDocuments: mocks.listTenantDocuments,
}));
vi.mock("@/backend/services/sms-sending-service", () => ({
  sendTenantSmsBatch: mocks.sendTenantSmsBatch,
}));

import { sendAutomaticPaymentSms } from "../payment-sms-service";

const input = {
  lenderId: "lender_A",
  loanId: "loan_A",
  paymentId: "payment_1234567890123456789012345678",
  amount: 1000,
  remainingAmount: 4000,
  recordedAt: "2026-08-07T05:00:00.000Z",
};

describe("automatic payment SMS", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDocument.mockResolvedValue({
      $id: "lender_A",
      lender_id: "lender_A",
      payment_sms_enabled: true,
      payment_sms_template_id: "template_A",
    });
    mocks.listTenantDocuments.mockImplementation(
      (collection: string) => {
        if (collection === "loans") {
          return Promise.resolve({
            documents: [{ $id: "loan_A", borrower_id: "borrower_A" }],
          });
        }
        if (collection === "borrowers") {
          return Promise.resolve({
            documents: [
              { $id: "borrower_A", name: "Jordan", contact: "+94771234567" },
            ],
          });
        }
        return Promise.resolve({
          documents: [
            {
              $id: "template_A",
              message:
                "Hi {{borrowerName}}, {{amount}} received. Balance {{remainingBalance}}. {{companyName}}",
            },
          ],
        });
      },
    );
    mocks.listDocuments.mockResolvedValue({
      documents: [
        { $id: "lender_A", company_name: "River Capital", currency: "LKR" },
      ],
    });
    mocks.sendTenantSmsBatch.mockResolvedValue({ sentRecipients: 1 });
  });

  it("sends the lender-selected template after rendering trusted payment data", async () => {
    await expect(sendAutomaticPaymentSms(input)).resolves.toEqual({
      status: "sent",
    });

    expect(mocks.sendTenantSmsBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        lenderId: "lender_A",
        phoneNumbers: ["+94771234567"],
        purpose: "payment_receipt",
        requestId: `receipt_${input.paymentId}`,
        message: expect.stringContaining("Jordan"),
      }),
    );
  });

  it("does no tenant-data or provider work while the setting is off", async () => {
    mocks.getDocument.mockResolvedValue({
      $id: "lender_A",
      lender_id: "lender_A",
      payment_sms_enabled: false,
    });

    await expect(sendAutomaticPaymentSms(input)).resolves.toEqual({
      status: "disabled",
    });
    expect(mocks.listTenantDocuments).not.toHaveBeenCalled();
    expect(mocks.sendTenantSmsBatch).not.toHaveBeenCalled();
  });

  it("skips a borrower without a usable phone number", async () => {
    mocks.listTenantDocuments.mockImplementation((collection: string) => {
      if (collection === "loans") {
        return Promise.resolve({
          documents: [{ $id: "loan_A", borrower_id: "borrower_A" }],
        });
      }
      if (collection === "borrowers") {
        return Promise.resolve({
          documents: [{ $id: "borrower_A", name: "Jordan", contact: "" }],
        });
      }
      return Promise.resolve({
        documents: [{ $id: "template_A", message: "Payment received." }],
      });
    });

    await expect(sendAutomaticPaymentSms(input)).resolves.toEqual({
      status: "skipped",
      reason: "missing_phone",
    });
    expect(mocks.sendTenantSmsBatch).not.toHaveBeenCalled();
  });

  it("never throws into the completed payment flow when SMS infrastructure fails", async () => {
    mocks.getDocument.mockRejectedValue(new Error("Appwrite unavailable"));

    await expect(sendAutomaticPaymentSms(input)).resolves.toEqual({
      status: "failed",
      reason: "send_failed",
    });
  });
});
