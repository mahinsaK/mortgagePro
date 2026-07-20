import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createDocument: vi.fn(),
  createTransaction: vi.fn(),
  deleteDocument: vi.fn(),
  getDocument: vi.fn(),
  listDocuments: vi.fn(),
  updateDocument: vi.fn(),
  updateTransaction: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/backend/appwrite/config", () => ({
  appwriteServerConfig: {
    databaseId: "database",
    collections: {
      collectors: "collectors",
      loans: "loans",
      payments: "payments",
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
vi.mock("@/backend/services/lender-service", () => ({
  getPrimaryLender: vi.fn(),
}));

import {
  deleteTenantLoanPayment,
  recordTenantLoanPayment,
} from "../payment-recording-service";

const baseInput = {
  lenderId: "lender_A",
  loanId: "loan_A",
  collectorId: "collector_A",
  date: "2026-07-17",
  amount: 100,
  method: "cash",
  requestId: "12345678-1234-1234-1234-123456789012",
};

describe("recordTenantLoanPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createTransaction.mockResolvedValue({ $id: "transaction_1" });
    mocks.listDocuments.mockImplementation(({ collectionId }: { collectionId: string }) =>
      Promise.resolve({
        documents:
          collectionId === "loans"
            ? [{ $id: "loan_A", amount: 1000, total_paid: 400, status: "active" }]
            : [{ $id: "collector_A" }],
      }),
    );
    mocks.getDocument.mockRejectedValue({ code: 404 });
    mocks.createDocument.mockResolvedValue({ $id: "payment_staged" });
    mocks.updateDocument.mockResolvedValue({ $id: "loan_A" });
    mocks.updateTransaction.mockResolvedValue({ $id: "transaction_1" });
  });

  it("commits the payment and loan balance update in one transaction", async () => {
    const result = await recordTenantLoanPayment(baseInput);

    expect(mocks.createDocument).toHaveBeenCalledWith(
      expect.objectContaining({ transactionId: "transaction_1" }),
    );
    expect(mocks.updateDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionId: "transaction_1",
        data: {
          total_paid: 500,
          remaining_amount: 500,
          status: "active",
        },
      }),
    );
    expect(mocks.updateTransaction).toHaveBeenCalledWith({
      transactionId: "transaction_1",
      commit: true,
    });
    expect(result).toEqual(
      expect.objectContaining({
        totalPaid: 500,
        remainingAmount: 500,
        duplicate: false,
      }),
    );
  });

  it("returns an already committed request without creating another payment", async () => {
    mocks.getDocument.mockResolvedValue({
      lender_id: "lender_A",
      loan_id: "loan_A",
      collector_id: "collector_A",
      date: "2026-07-17T00:00:00.000Z",
      amount: 100,
      method: "cash",
    });

    const result = await recordTenantLoanPayment(baseInput);

    expect(result.duplicate).toBe(true);
    expect(mocks.createDocument).not.toHaveBeenCalled();
    expect(mocks.updateDocument).not.toHaveBeenCalled();
    expect(mocks.updateTransaction).toHaveBeenCalledWith({
      transactionId: "transaction_1",
      rollback: true,
    });
  });

  it("rejects an overpayment before staging either write", async () => {
    await expect(
      recordTenantLoanPayment({ ...baseInput, amount: 700 }),
    ).rejects.toMatchObject({ code: "overpayment" });

    expect(mocks.createDocument).not.toHaveBeenCalled();
    expect(mocks.updateDocument).not.toHaveBeenCalled();
    expect(mocks.updateTransaction).toHaveBeenCalledWith({
      transactionId: "transaction_1",
      rollback: true,
    });
  });

  it("rolls back when either staged write cannot be completed", async () => {
    mocks.updateDocument.mockRejectedValue(new Error("staging failed"));

    await expect(recordTenantLoanPayment(baseInput)).rejects.toThrow(
      "staging failed",
    );

    expect(mocks.updateTransaction).toHaveBeenCalledWith({
      transactionId: "transaction_1",
      rollback: true,
    });
    expect(mocks.updateTransaction).not.toHaveBeenCalledWith({
      transactionId: "transaction_1",
      commit: true,
    });
  });

  it("rechecks the latest balance after a transaction conflict", async () => {
    const loanReads = [
      { $id: "loan_A", amount: 1000, total_paid: 900, status: "active" },
      { $id: "loan_A", amount: 1000, total_paid: 960, status: "active" },
    ];
    mocks.createTransaction
      .mockResolvedValueOnce({ $id: "transaction_1" })
      .mockResolvedValueOnce({ $id: "transaction_2" });
    mocks.listDocuments.mockImplementation(({ collectionId }: { collectionId: string }) =>
      Promise.resolve({
        documents:
          collectionId === "loans"
            ? [loanReads.shift()]
            : [{ $id: "collector_A" }],
      }),
    );
    mocks.updateTransaction.mockImplementation(
      ({ commit }: { commit?: boolean }) =>
        commit ? Promise.reject({ code: 409 }) : Promise.resolve({}),
    );

    await expect(
      recordTenantLoanPayment({ ...baseInput, amount: 60 }),
    ).rejects.toMatchObject({ code: "overpayment" });

    expect(mocks.createTransaction).toHaveBeenCalledTimes(2);
    expect(mocks.createTransaction).toHaveBeenCalledWith({ ttl: 60 });
    expect(mocks.createDocument).toHaveBeenCalledTimes(1);
    expect(mocks.updateDocument).toHaveBeenCalledTimes(1);
  });
});

describe("deleteTenantLoanPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createTransaction.mockResolvedValue({ $id: "transaction_1" });
    mocks.listDocuments.mockImplementation(
      ({ collectionId }: { collectionId: string }) =>
        Promise.resolve({
          documents:
            collectionId === "payments"
              ? [{ $id: "payment_A", loan_id: "loan_A", amount: 100 }]
              : [
                  {
                    $id: "loan_A",
                    amount: 1000,
                    total_paid: 1000,
                    status: "completed",
                  },
                ],
        }),
    );
    mocks.deleteDocument.mockResolvedValue({});
    mocks.updateDocument.mockResolvedValue({ $id: "loan_A" });
    mocks.updateTransaction.mockResolvedValue({ $id: "transaction_1" });
  });

  it("deletes the payment and restores the loan balance in one transaction", async () => {
    const result = await deleteTenantLoanPayment("lender_A", "payment_A");

    expect(mocks.deleteDocument).toHaveBeenCalledWith({
      databaseId: "database",
      collectionId: "payments",
      documentId: "payment_A",
      transactionId: "transaction_1",
    });
    expect(mocks.updateDocument).toHaveBeenCalledWith({
      databaseId: "database",
      collectionId: "loans",
      documentId: "loan_A",
      data: {
        total_paid: 900,
        remaining_amount: 100,
        status: "active",
      },
      transactionId: "transaction_1",
    });
    expect(mocks.updateTransaction).toHaveBeenCalledWith({
      transactionId: "transaction_1",
      commit: true,
    });
    expect(result).toEqual({
      paymentId: "payment_A",
      loanId: "loan_A",
      totalPaid: 900,
      remainingAmount: 100,
      status: "active",
    });
  });

  it("does not reveal or delete a payment outside the lender", async () => {
    mocks.listDocuments.mockResolvedValue({ documents: [] });

    await expect(
      deleteTenantLoanPayment("lender_A", "payment_B"),
    ).rejects.toMatchObject({ code: "payment_not_found" });

    expect(mocks.deleteDocument).not.toHaveBeenCalled();
    expect(mocks.updateDocument).not.toHaveBeenCalled();
    expect(mocks.updateTransaction).toHaveBeenCalledWith({
      transactionId: "transaction_1",
      rollback: true,
    });
  });

  it("rolls back if the loan balance cannot be restored", async () => {
    mocks.updateDocument.mockRejectedValue(new Error("staging failed"));

    await expect(
      deleteTenantLoanPayment("lender_A", "payment_A"),
    ).rejects.toThrow("staging failed");

    expect(mocks.updateTransaction).toHaveBeenCalledWith({
      transactionId: "transaction_1",
      rollback: true,
    });
    expect(mocks.updateTransaction).not.toHaveBeenCalledWith({
      transactionId: "transaction_1",
      commit: true,
    });
  });

  it("rejects deletion when the stored loan total is inconsistent", async () => {
    mocks.listDocuments.mockImplementation(
      ({ collectionId }: { collectionId: string }) =>
        Promise.resolve({
          documents:
            collectionId === "payments"
              ? [{ $id: "payment_A", loan_id: "loan_A", amount: 100 }]
              : [
                  {
                    $id: "loan_A",
                    amount: 1000,
                    total_paid: 50,
                    status: "active",
                  },
                ],
        }),
    );

    await expect(
      deleteTenantLoanPayment("lender_A", "payment_A"),
    ).rejects.toMatchObject({ code: "invalid_payment" });

    expect(mocks.deleteDocument).not.toHaveBeenCalled();
    expect(mocks.updateDocument).not.toHaveBeenCalled();
  });
});
