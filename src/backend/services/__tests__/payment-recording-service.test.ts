import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createDocument: vi.fn(),
  createTransaction: vi.fn(),
  deleteDocument: vi.fn(),
  getDocument: vi.fn(),
  getPrimaryLender: vi.fn(),
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
  getPrimaryLender: mocks.getPrimaryLender,
}));

import {
  deleteLoanPayment,
  deleteTenantLoanPayment,
  PaymentWriteError,
  recordLoanPayment,
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
    mocks.getPrimaryLender.mockResolvedValue({ id: "lender_A" });
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

  it("rejects malformed request IDs before opening a transaction", async () => {
    await expect(
      recordTenantLoanPayment({ ...baseInput, requestId: "short" }),
    ).rejects.toMatchObject({ code: "invalid_request_id" });
    expect(mocks.createTransaction).not.toHaveBeenCalled();
  });

  it("rejects missing loans and inactive collectors without staging writes", async () => {
    mocks.listDocuments.mockResolvedValueOnce({ documents: [] });
    await expect(recordTenantLoanPayment(baseInput)).rejects.toMatchObject({
      code: "loan_not_found",
    });

    vi.clearAllMocks();
    mocks.createTransaction.mockResolvedValue({ $id: "transaction_1" });
    mocks.listDocuments
      .mockResolvedValueOnce({
        documents: [{ $id: "loan_A", amount: 1000, total_paid: 0, status: "active" }],
      })
      .mockResolvedValueOnce({ documents: [] });
    mocks.updateTransaction.mockResolvedValue({});
    await expect(recordTenantLoanPayment(baseInput)).rejects.toMatchObject({
      code: "collector_not_found",
    });
  });

  it("rejects invalid payment domain values", async () => {
    await expect(
      recordTenantLoanPayment({ ...baseInput, amount: -1 }),
    ).rejects.toMatchObject({ code: "invalid_payment" });
  });

  it("rejects reuse of a request ID with different payment data", async () => {
    mocks.getDocument.mockResolvedValue({
      lender_id: "lender_A",
      loan_id: "loan_A",
      collector_id: "collector_A",
      date: "2026-07-17T00:00:00.000Z",
      amount: 999,
      method: "cash",
    });

    await expect(recordTenantLoanPayment(baseInput)).rejects.toMatchObject({
      code: "request_reused",
    });
  });

  it("propagates unexpected existing-payment lookup failures", async () => {
    mocks.getDocument.mockRejectedValue(new Error("lookup failed"));
    await expect(recordTenantLoanPayment(baseInput)).rejects.toThrow(
      "lookup failed",
    );
  });

  it("returns a typed conflict after all retries and tolerates rollback failure", async () => {
    mocks.updateTransaction.mockRejectedValue({ code: 409 });

    await expect(recordTenantLoanPayment(baseInput)).rejects.toMatchObject({
      code: "transaction_conflict",
    });
    expect(mocks.createTransaction).toHaveBeenCalledTimes(3);
  });

  it("records through the authenticated lender wrapper", async () => {
    await expect(recordLoanPayment(baseInput)).resolves.toMatchObject({
      loanId: "loan_A",
    });
    mocks.getPrimaryLender.mockResolvedValue(null);
    await expect(recordLoanPayment(baseInput)).rejects.toThrow(
      "No lender exists",
    );
  });

  it("constructs typed payment errors", () => {
    const error = new PaymentWriteError("invalid_payment", "invalid");
    expect(error.name).toBe("PaymentWriteError");
    expect(error.code).toBe("invalid_payment");
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
    mocks.getPrimaryLender.mockResolvedValue({ id: "lender_A" });
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

  it("rejects an empty payment ID before opening a transaction", async () => {
    await expect(deleteTenantLoanPayment("lender_A", "")).rejects.toMatchObject({
      code: "payment_not_found",
    });
    expect(mocks.createTransaction).not.toHaveBeenCalled();
  });

  it("rejects deletion when the owning loan is missing", async () => {
    mocks.listDocuments
      .mockResolvedValueOnce({
        documents: [{ $id: "payment_A", loan_id: "loan_A", amount: 100 }],
      })
      .mockResolvedValueOnce({ documents: [] });

    await expect(
      deleteTenantLoanPayment("lender_A", "payment_A"),
    ).rejects.toMatchObject({ code: "loan_not_found" });
  });

  it.each([Number.NaN, -1])(
    "rejects an invalid stored money value %s",
    async (amount) => {
      mocks.listDocuments.mockImplementation(
        ({ collectionId }: { collectionId: string }) =>
          Promise.resolve({
            documents:
              collectionId === "payments"
                ? [{ $id: "payment_A", loan_id: "loan_A", amount }]
                : [{ $id: "loan_A", amount: 1000, total_paid: 500, status: "active" }],
          }),
      );
      await expect(
        deleteTenantLoanPayment("lender_A", "payment_A"),
      ).rejects.toMatchObject({ code: "invalid_payment" });
    },
  );

  it("preserves a non-completed loan status and rounds restored money", async () => {
    mocks.listDocuments.mockImplementation(
      ({ collectionId }: { collectionId: string }) =>
        Promise.resolve({
          documents:
            collectionId === "payments"
              ? [{ $id: "payment_A", loan_id: "loan_A", amount: 0.1 }]
              : [{ $id: "loan_A", amount: 1, total_paid: 0.3, status: "active" }],
        }),
    );

    await expect(
      deleteTenantLoanPayment("lender_A", "payment_A"),
    ).resolves.toMatchObject({
      totalPaid: 0.2,
      remainingAmount: 0.8,
      status: "active",
    });
  });

  it("retries deletion conflicts and fails safely after the final conflict", async () => {
    mocks.updateTransaction.mockImplementation(
      ({ commit }: { commit?: boolean }) =>
        commit ? Promise.reject({ code: 409 }) : Promise.resolve({}),
    );

    await expect(
      deleteTenantLoanPayment("lender_A", "payment_A"),
    ).rejects.toMatchObject({ code: "transaction_conflict" });
    expect(mocks.createTransaction).toHaveBeenCalledTimes(3);
  });

  it("deletes through the authenticated lender wrapper", async () => {
    await expect(deleteLoanPayment("payment_A")).resolves.toMatchObject({
      paymentId: "payment_A",
    });
    mocks.getPrimaryLender.mockResolvedValue(null);
    await expect(deleteLoanPayment("payment_A")).rejects.toThrow(
      "No lender exists",
    );
  });
});
