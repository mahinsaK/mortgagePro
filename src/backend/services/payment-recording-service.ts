import { appwriteServerConfig } from "@/backend/appwrite/config";
import { databases, Query } from "@/backend/appwrite/server-client";
import { PaymentController } from "@/backend/modules/payments/controller";
import { PaymentService } from "@/backend/modules/payments/service";
import { getPrimaryLender } from "./lender-service";

export type RecordLoanPaymentInput = {
  loanId: string;
  collectorId: string;
  date: string;
  amount: number;
  method: string;
};

export async function recordLoanPayment(input: RecordLoanPaymentInput) {
  const lender = await getPrimaryLender();

  if (!lender) {
    throw new Error("No lender exists in Appwrite yet.");
  }

  const [loanResult, collectorResult] = await Promise.all([
    databases.listDocuments({
      databaseId: appwriteServerConfig.databaseId,
      collectionId: appwriteServerConfig.collections.loans,
      queries: [
        Query.equal("lender_id", lender.id),
        Query.equal("$id", input.loanId),
        Query.limit(1),
        Query.select(["$id", "amount", "total_paid", "status"]),
      ],
    }),
    databases.listDocuments({
      databaseId: appwriteServerConfig.databaseId,
      collectionId: appwriteServerConfig.collections.collectors,
      queries: [
        Query.equal("lender_id", lender.id),
        Query.equal("$id", input.collectorId),
        Query.limit(1),
        Query.select(["$id"]),
      ],
    }),
  ]);
  const loan = loanResult.documents[0];
  const collector = collectorResult.documents[0];

  if (!loan) {
    throw new Error("This loan does not belong to the active lender.");
  }

  if (!collector) {
    throw new Error("This collector does not belong to the active lender.");
  }

  const paymentResult = new PaymentController().record({
    lenderId: lender.id,
    loanId: input.loanId,
    loanLenderId: lender.id,
    collectorId: input.collectorId,
    collectorLenderId: lender.id,
    date: input.date,
    amount: input.amount,
    method: input.method,
  });

  if (!paymentResult.ok || !paymentResult.data) {
    throw new Error(paymentResult.error ?? "Payment recording failed.");
  }

  const paymentId = createDocumentId("payment");
  const totals = new PaymentService().calculateLoanTotals({
    loanAmount: Number(loan.amount ?? 0),
    currentTotalPaid: Number(loan.total_paid ?? 0),
    paymentAmount: input.amount,
    currentStatus: String(loan.status ?? "active"),
  });

  await databases.createDocument({
    databaseId: appwriteServerConfig.databaseId,
    collectionId: appwriteServerConfig.collections.payments,
    documentId: paymentId,
    data: paymentResult.data,
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
  });

  return {
    paymentId,
    loanId: input.loanId,
    totalPaid: totals.totalPaid,
    remainingAmount: totals.remainingAmount,
    status: totals.status,
  };
}

function createDocumentId(prefix: string) {
  const randomPart = crypto.randomUUID().replaceAll("-", "").slice(0, 22);
  return `${prefix}_${randomPart}`;
}
