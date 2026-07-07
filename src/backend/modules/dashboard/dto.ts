import { optionalString } from "../shared";

export type DashboardLoanRowDto = {
  id: string;
  borrower: string;
  borrowerContact: string;
  borrowerPhone: string;
  amount: string;
  dailyPayment: string;
  status: string;
  endDate: string;
};

export type DashboardPaymentExportRowDto = {
  payment_id: string;
  date: string;
  borrower: string;
  loan_id: string;
  collector: string;
  amount: string;
  method: string;
};

export type DashboardSearchDto = {
  query: string;
};

export function toDashboardSearchDto(
  input: Record<string, unknown>,
): DashboardSearchDto {
  return {
    query: optionalString(input.query),
  };
}
