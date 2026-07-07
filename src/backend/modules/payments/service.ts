import type { RecordPaymentDto } from "./dto";

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
}
