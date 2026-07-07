import type { RecordPaymentDto } from "./dto";

type LoanPaymentTotalsInput = {
  loanAmount: number;
  currentTotalPaid: number;
  paymentAmount: number;
  currentStatus: string;
};

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
    const totalPaid = Number(input.currentTotalPaid) + Number(input.paymentAmount);
    const remainingAmount = Math.max(Number(input.loanAmount) - totalPaid, 0);

    return {
      totalPaid,
      remainingAmount,
      status: remainingAmount <= 0 ? "completed" : input.currentStatus,
    };
  }
}
