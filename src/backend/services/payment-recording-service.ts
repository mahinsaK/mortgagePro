import { PaymentController } from "@/backend/modules/payments/controller";
import { PaymentService } from "@/backend/modules/payments/service";
import {
  createTenantDocument,
  requireTenantDocument,
  updateTenantDocument,
} from "./tenant-data-service";
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

  const [loan] = await Promise.all([
    requireTenantDocument("loans", lender.id, input.loanId, [
      "$id",
      "amount",
      "total_paid",
      "status",
    ]),
    requireTenantDocument("collectors", lender.id, input.collectorId),
  ]);
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

  await createTenantDocument(
    "payments",
    lender.id,
    paymentId,
    paymentResult.data,
  );
  await updateTenantDocument("loans", lender.id, input.loanId, {
    total_paid: totals.totalPaid,
    remaining_amount: totals.remainingAmount,
    status: totals.status,
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
