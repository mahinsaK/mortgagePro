import type { RecordPaymentDto } from "./dto";

type LoanPaymentTotalsInput = {
  loanAmount: number;
  currentTotalPaid: number;
  paymentAmount: number;
  currentStatus: string;
};

export class PaymentExceedsRemainingBalanceError extends Error {
  constructor() {
    super("Payment amount cannot exceed the remaining loan balance.");
    this.name = "PaymentExceedsRemainingBalanceError";
  }
}

export class PaymentService {
  prepareRecord(dto: RecordPaymentDto) {
    if (dto.loanLenderId !== dto.collectorLenderId) {
      throw new Error("This collector cannot collect another lender's loan.");
    }

    return {
      lender_id: dto.lenderId,
      loan_id: dto.loanId,
      collector_id: dto.collectorId,
      date: dto.date,
      amount: dto.amount,
      method: dto.method,
      created_at: new Date().toISOString(),
    };
  }

  calculateLoanTotals(input: LoanPaymentTotalsInput) {
    const loanAmount = roundMoney(input.loanAmount);
    const currentTotalPaid = roundMoney(input.currentTotalPaid);
    const paymentAmount = roundMoney(input.paymentAmount);
    const remainingBeforePayment = roundMoney(
      Math.max(loanAmount - currentTotalPaid, 0),
    );

    if (paymentAmount > remainingBeforePayment) {
      throw new PaymentExceedsRemainingBalanceError();
    }

    const totalPaid = roundMoney(currentTotalPaid + paymentAmount);
    const remainingAmount = roundMoney(Math.max(loanAmount - totalPaid, 0));

    return {
      totalPaid,
      remainingAmount,
      status: remainingAmount <= 0 ? "completed" : input.currentStatus,
    };
  }
}

function roundMoney(value: number) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}
