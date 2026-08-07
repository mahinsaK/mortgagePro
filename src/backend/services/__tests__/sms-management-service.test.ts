import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createDocument: vi.fn(),
  createTransaction: vi.fn(),
  deleteDocument: vi.fn(),
  deleteTenantDocument: vi.fn(),
  getDocument: vi.fn(),
  listDocuments: vi.fn(),
  listTenantDocuments: vi.fn(),
  updateDocument: vi.fn(),
  updateTransaction: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/backend/appwrite/config", () => ({
  appwriteServerConfig: {
    databaseId: "database",
    collections: {
      smsAccounts: "sms_accounts",
      smsSenderRequests: "sms_sender_requests",
      smsTemplates: "sms_templates",
    },
  },
}));
vi.mock("@/backend/appwrite/server-client", async () => {
  const { Query } = await import("node-appwrite");
  return {
    databases: {
      createDocument: mocks.createDocument,
      createTransaction: mocks.createTransaction,
      deleteDocument: mocks.deleteDocument,
      getDocument: mocks.getDocument,
      listDocuments: mocks.listDocuments,
      updateDocument: mocks.updateDocument,
      updateTransaction: mocks.updateTransaction,
    },
    Query,
  };
});
vi.mock("@/backend/services/tenant-data-service", () => ({
  deleteTenantDocument: mocks.deleteTenantDocument,
  listTenantDocuments: mocks.listTenantDocuments,
}));

import {
  createSmsTemplate,
  requestSmsSenderId,
  updateAutomaticPaymentSmsSettings,
} from "../sms-management-service";

describe("SMS management transactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    let transactionNumber = 0;
    mocks.createTransaction.mockImplementation(() => {
      transactionNumber += 1;
      return Promise.resolve({ $id: "transaction_" + transactionNumber });
    });
    mocks.getDocument.mockRejectedValue({ code: 404 });
    mocks.listDocuments.mockImplementation(
      ({ collectionId }: { collectionId: string }) =>
        Promise.resolve({
          documents: [],
          total: collectionId === "sms_templates" ? 0 : 0,
        }),
    );
    mocks.createDocument.mockResolvedValue({});
    mocks.updateDocument.mockResolvedValue({});
    mocks.deleteDocument.mockResolvedValue({});
    mocks.updateTransaction.mockResolvedValue({});
  });

  it("creates a pending globally keyed sender, account, and starter templates atomically", async () => {
    await requestSmsSenderId("lender_A", "LoanPro");

    expect(mocks.createDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        collectionId: "sms_sender_requests",
        documentId: "loanpro",
        data: expect.objectContaining({
          lender_id: "lender_A",
          sender_id: "LoanPro",
          normalized_sender_id: "loanpro",
          status: "pending",
        }),
        transactionId: "transaction_1",
      }),
    );
    expect(mocks.createDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        collectionId: "sms_accounts",
        documentId: "lender_A",
        data: expect.objectContaining({ monthly_quota: 0, status: "active" }),
      }),
    );
    expect(
      mocks.createDocument.mock.calls.filter(
        ([call]) => call.collectionId === "sms_templates",
      ),
    ).toHaveLength(3);
    expect(mocks.updateTransaction).toHaveBeenCalledWith({
      transactionId: "transaction_1",
      commit: true,
    });
  });

  it("rejects a sender ID owned by another lender without committing", async () => {
    mocks.getDocument.mockImplementation(
      ({ collectionId }: { collectionId: string }) =>
        collectionId === "sms_sender_requests"
          ? Promise.resolve({
              $id: "loanpro",
              lender_id: "lender_B",
              status: "approved",
            })
          : Promise.reject({ code: 404 }),
    );

    await expect(
      requestSmsSenderId("lender_A", "LoanPro"),
    ).rejects.toMatchObject({ code: "duplicate_sender" });
    expect(mocks.createDocument).not.toHaveBeenCalled();
    expect(mocks.updateTransaction).not.toHaveBeenCalledWith(
      expect.objectContaining({ commit: true }),
    );
  });

  it("allows only one pending replacement request per lender", async () => {
    mocks.listDocuments.mockImplementation(
      ({ collectionId }: { collectionId: string }) =>
        Promise.resolve({
          documents:
            collectionId === "sms_sender_requests"
              ? [{ $id: "anotherid" }]
              : [],
          total: 0,
        }),
    );

    await expect(
      requestSmsSenderId("lender_A", "LoanPro"),
    ).rejects.toMatchObject({ code: "pending_sender" });
    expect(mocks.createDocument).not.toHaveBeenCalled();
  });

  it("reports a clean duplicate error when a concurrent sender request wins", async () => {
    mocks.createDocument.mockRejectedValue({ code: 409 });

    await expect(
      requestSmsSenderId("lender_A", "LoanPro"),
    ).rejects.toMatchObject({ code: "duplicate_sender" });
    expect(mocks.createTransaction).toHaveBeenCalledTimes(3);
  });

  it("enforces the 20-template limit inside the transaction", async () => {
    mocks.listDocuments.mockResolvedValue({ documents: [], total: 20 });

    await expect(
      createSmsTemplate("lender_A", "Another reminder", "Pay today."),
    ).rejects.toMatchObject({ code: "template_limit" });
    expect(mocks.createDocument).not.toHaveBeenCalled();
  });

  it("enables automatic payment messages only with a lender-owned template", async () => {
    mocks.getDocument.mockResolvedValue({
      $id: "lender_A",
      lender_id: "lender_A",
    });
    mocks.listDocuments.mockResolvedValue({
      documents: [
        {
          $id: "template_A",
          lender_id: "lender_A",
          message: "Hi {{borrowerName}}, we received {{amount}}.",
        },
      ],
      total: 1,
    });

    await updateAutomaticPaymentSmsSettings(
      "lender_A",
      true,
      "template_A",
    );

    expect(mocks.updateDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        collectionId: "sms_accounts",
        documentId: "lender_A",
        data: expect.objectContaining({
          payment_sms_enabled: true,
          payment_sms_template_id: "template_A",
        }),
        transactionId: "transaction_1",
      }),
    );
    expect(mocks.updateTransaction).toHaveBeenCalledWith({
      transactionId: "transaction_1",
      commit: true,
    });
  });

  it("rejects enabling automatic messages with another lender's template", async () => {
    mocks.getDocument.mockResolvedValue({
      $id: "lender_A",
      lender_id: "lender_A",
    });
    mocks.listDocuments.mockResolvedValue({ documents: [], total: 0 });

    await expect(
      updateAutomaticPaymentSmsSettings("lender_A", true, "template_B"),
    ).rejects.toMatchObject({ code: "template_not_found" });
    expect(mocks.updateDocument).not.toHaveBeenCalled();
    expect(mocks.updateTransaction).toHaveBeenCalledWith({
      transactionId: "transaction_1",
      rollback: true,
    });
  });
});
