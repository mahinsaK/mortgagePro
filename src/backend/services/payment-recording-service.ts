import "server-only";

import { createHash } from "node:crypto";
import { appwriteServerConfig } from "@/backend/appwrite/config";
import { databases, Query } from "@/backend/appwrite/server-client";
import { PaymentController } from "@/backend/modules/payments/controller";
import {
  PaymentExceedsRemainingBalanceError,
  PaymentService,
} from "@/backend/modules/payments/service";
import { getPrimaryLender } from "./lender-service";

const MAX_TRANSACTION_ATTEMPTS = 3;
const PAYMENT_REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{16,100}$/;

export type RecordLoanPaymentInput = {
  loanId: string;
  collectorId: string;
  date: string;
  amount: number;
  method: string;
  requestId: string;
};

type RecordTenantLoanPaymentInput = RecordLoanPaymentInput & {
  lenderId: string;
};

export type RecordedLoanPayment = {
  paymentId: string;
  loanId: string;
  totalPaid: number;
  remainingAmount: number;
  status: string;
  duplicate: boolean;
};

export type PaymentWriteErrorCode =
  | "collector_not_found"
  | "invalid_payment"
  | "invalid_request_id"
  | "loan_not_found"
  | "overpayment"
  | "request_reused"
  | "transaction_conflict";

export class PaymentWriteError extends Error {
  constructor(
    public readonly code: PaymentWriteErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "PaymentWriteError";
  }
}

export async function recordLoanPayment(input: RecordLoanPaymentInput) {
  const lender = await getPrimaryLender();

  if (!lender) {
    throw new Error("No lender exists in Appwrite yet.");
  }

  return recordTenantLoanPayment({ ...input, lenderId: lender.id });
}

export async function recordTenantLoanPayment(
  input: RecordTenantLoanPaymentInput,
): Promise<RecordedLoanPayment> {
  validateRequestId(input.requestId);
  const paymentId = createPaymentId(input);

  for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
    const transaction = await databases.createTransaction({ ttl: 30 });
    const transactionId = transaction.$id;

    try {
      const [loanResult, collectorResult] = await Promise.all([
        databases.listDocuments({
          databaseId: appwriteServerConfig.databaseId,
          collectionId: appwriteServerConfig.collections.loans,
          queries: [
            Query.equal("$id", input.loanId),
            Query.equal("lender_id", input.lenderId),
            Query.limit(1),
            Query.select(["$id", "amount", "total_paid", "status"]),
          ],
          transactionId,
        }),
        databases.listDocuments({
          databaseId: appwriteServerConfig.databaseId,
          collectionId: appwriteServerConfig.collections.collectors,
          queries: [
            Query.equal("$id", input.collectorId),
            Query.equal("lender_id", input.lenderId),
            Query.equal("status", "active"),
            Query.limit(1),
            Query.select(["$id"]),
          ],
          transactionId,
        }),
      ]);
      const loan = loanResult.documents[0];

      if (!loan) {
        throw new PaymentWriteError(
          "loan_not_found",
          "That QR code is not a valid loan.",
        );
      }

      if (!collectorResult.documents[0]) {
        throw new PaymentWriteError(
          "collector_not_found",
          "This collector cannot collect a payment for that loan.",
        );
      }

      const paymentResult = new PaymentController().record({
        lenderId: input.lenderId,
        loanId: input.loanId,
        loanLenderId: input.lenderId,
        collectorId: input.collectorId,
        collectorLenderId: input.lenderId,
        date: input.date,
        amount: input.amount,
        method: input.method,
      });

      if (!paymentResult.ok || !paymentResult.data) {
        throw new PaymentWriteError(
          "invalid_payment",
          paymentResult.error ?? "Payment recording failed.",
        );
      }

      const existingPayment = await getPaymentInTransaction(
        paymentId,
        transactionId,
      );

      if (existingPayment) {
        if (!matchesPayment(existingPayment, paymentResult.data)) {
          throw new PaymentWriteError(
            "request_reused",
            "This payment request has already been used.",
          );
        }

        await rollbackTransaction(transactionId);
        return loanPaymentResult(paymentId, loan, true);
      }

      let totals;

      try {
        totals = new PaymentService().calculateLoanTotals({
          loanAmount: Number(loan.amount ?? 0),
          currentTotalPaid: Number(loan.total_paid ?? 0),
          paymentAmount: input.amount,
          currentStatus: String(loan.status ?? "active"),
        });
      } catch (error) {
        if (error instanceof PaymentExceedsRemainingBalanceError) {
          throw new PaymentWriteError("overpayment", error.message);
        }

        throw error;
      }

      await databases.createDocument({
        databaseId: appwriteServerConfig.databaseId,
        collectionId: appwriteServerConfig.collections.payments,
        documentId: paymentId,
        data: paymentResult.data,
        transactionId,
      });
      await databases.updateDocument({
        databaseId: appwriteServerConfig.databaseId,
        collectionId: appwriteServerConfig.collections.loans,
        documentId: input.loanId,
        data: {
          total_paid: totals.totalPaid,
          remaining_amount: totals.remainingAmount,
          status: totals.status,
        },
        transactionId,
      });
      await databases.updateTransaction({ transactionId, commit: true });

      return {
        paymentId,
        loanId: input.loanId,
        totalPaid: totals.totalPaid,
        remainingAmount: totals.remainingAmount,
        status: totals.status,
        duplicate: false,
      };
    } catch (error) {
      await rollbackTransaction(transactionId);

      if (isConflict(error) && attempt < MAX_TRANSACTION_ATTEMPTS) {
        continue;
      }

      if (isConflict(error)) {
        throw new PaymentWriteError(
          "transaction_conflict",
          "The loan changed while this payment was being recorded. Please try again.",
        );
      }

      throw error;
    }
  }

  throw new PaymentWriteError(
    "transaction_conflict",
    "The payment could not be recorded safely. Please try again.",
  );
}

function validateRequestId(requestId: string) {
  if (!PAYMENT_REQUEST_ID_PATTERN.test(requestId)) {
    throw new PaymentWriteError(
      "invalid_request_id",
      "This payment request is invalid. Scan the loan again.",
    );
  }
}

function createPaymentId(input: RecordTenantLoanPaymentInput) {
  const digest = createHash("sha256")
    .update(
      `${input.lenderId}\u0000${input.collectorId}\u0000${input.loanId}\u0000${input.requestId}`,
    )
    .digest("hex")
    .slice(0, 28);

  return `payment_${digest}`;
}

async function getPaymentInTransaction(
  paymentId: string,
  transactionId: string,
) {
  try {
    return await databases.getDocument({
      databaseId: appwriteServerConfig.databaseId,
      collectionId: appwriteServerConfig.collections.payments,
      documentId: paymentId,
      queries: [
        Query.select([
          "$id",
          "lender_id",
          "loan_id",
          "collector_id",
          "date",
          "amount",
          "method",
        ]),
      ],
      transactionId,
    });
  } catch (error) {
    if (isNotFound(error)) {
      return null;
    }

    throw error;
  }
}

function matchesPayment(
  existing: Record<string, unknown>,
  expected: Record<string, unknown>,
) {
  return (
    String(existing.lender_id ?? "") === String(expected.lender_id ?? "") &&
    String(existing.loan_id ?? "") === String(expected.loan_id ?? "") &&
    String(existing.collector_id ?? "") ===
      String(expected.collector_id ?? "") &&
    String(existing.date ?? "") === String(expected.date ?? "") &&
    Number(existing.amount ?? 0) === Number(expected.amount ?? 0) &&
    String(existing.method ?? "") === String(expected.method ?? "")
  );
}

function loanPaymentResult(
  paymentId: string,
  loan: Record<string, unknown>,
  duplicate: boolean,
): RecordedLoanPayment {
  const totalPaid = Number(loan.total_paid ?? 0);
  const remainingAmount = Math.max(Number(loan.amount ?? 0) - totalPaid, 0);

  return {
    paymentId,
    loanId: String(loan.$id ?? ""),
    totalPaid,
    remainingAmount,
    status: String(loan.status ?? "active"),
    duplicate,
  };
}

async function rollbackTransaction(transactionId: string) {
  try {
    await databases.updateTransaction({ transactionId, rollback: true });
  } catch {
    // A committed, expired, or already rolled-back transaction needs no cleanup.
  }
}

function isNotFound(error: unknown) {
  return errorCode(error) === 404;
}

function isConflict(error: unknown) {
  return errorCode(error) === 409;
}

function errorCode(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return null;
  }

  return Number(error.code);
}
