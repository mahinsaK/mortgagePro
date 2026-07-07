import { isoDate, positiveNumber, requiredString } from "../shared";

export type RecordPaymentDto = {
  lenderId: string;
  loanId: string;
  loanLenderId: string;
  collectorId: string;
  collectorLenderId: string;
  date: string;
  amount: number;
  method: string;
};

export function toRecordPaymentDto(
  input: Record<string, unknown>,
): RecordPaymentDto {
  return {
    lenderId: requiredString(input.lenderId, "lenderId"),
    loanId: requiredString(input.loanId, "loanId"),
    loanLenderId: requiredString(input.loanLenderId, "loanLenderId"),
    collectorId: requiredString(input.collectorId, "collectorId"),
    collectorLenderId: requiredString(
      input.collectorLenderId,
      "collectorLenderId",
    ),
    date: isoDate(input.date, "date"),
    amount: positiveNumber(input.amount, "amount"),
    method: requiredString(input.method, "method"),
  };
}
