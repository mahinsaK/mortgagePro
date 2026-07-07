import type { CreateLoanDto } from "./dto";

export class LoanService {
  prepareCreate(dto: CreateLoanDto, qrCode: string) {
    return {
      lender_id: dto.lenderId,
      borrower_id: dto.borrowerId,
      amount: dto.amount,
      interest_rate: dto.interestRate,
      daily_payment: dto.dailyPayment,
      start_date: dto.startDate,
      end_date: dto.endDate,
      status: "active",
      qr_code: qrCode,
      created_at: new Date().toISOString(),
    };
  }
}
