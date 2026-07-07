import { isoDate, positiveNumber, requiredString } from "../shared";

export type CreateLoanDto = {
  lenderId: string;
  borrowerId: string;
  amount: number;
  interestRate: number;
  dailyPayment: number;
  startDate: string;
  endDate: string;
};

export function toCreateLoanDto(input: Record<string, unknown>): CreateLoanDto {
  const startDate = isoDate(input.startDate, "startDate");
  const endDate = isoDate(input.endDate, "endDate");

  if (new Date(endDate) <= new Date(startDate)) {
    throw new Error("endDate must be after startDate.");
  }

  return {
    lenderId: requiredString(input.lenderId, "lenderId"),
    borrowerId: requiredString(input.borrowerId, "borrowerId"),
    amount: positiveNumber(input.amount, "amount"),
    interestRate: positiveNumber(input.interestRate, "interestRate"),
    dailyPayment: positiveNumber(input.dailyPayment, "dailyPayment"),
    startDate,
    endDate,
  };
}
