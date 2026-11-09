export type LoanInterestMethod = "annual" | "flat";

export type LoanPlan = {
  capital: number;
  interestAmount: number;
  totalRepayable: number;
  suggestedDailyPayment: number;
  endDate: string;
};

export function calculateLoanPlan(input: {
  capital: number;
  interestRate: number;
  termDays: number;
  method: LoanInterestMethod;
  startDate: string;
}): LoanPlan | null {
  if (
    !Number.isFinite(input.capital) ||
    input.capital <= 0 ||
    !Number.isFinite(input.interestRate) ||
    input.interestRate < 0 ||
    !Number.isInteger(input.termDays) ||
    input.termDays < 1 ||
    input.termDays > 3650 ||
    !isValidDateOnly(input.startDate) ||
    (input.method !== "flat" && input.method !== "annual")
  ) {
    return null;
  }

  const interestMultiplier =
    input.method === "annual" ? input.termDays / 365 : 1;
  const interestAmount = roundMoney(
    input.capital * (input.interestRate / 100) * interestMultiplier,
  );
  const totalRepayable = roundMoney(input.capital + interestAmount);

  return {
    capital: roundMoney(input.capital),
    interestAmount,
    totalRepayable,
    suggestedDailyPayment: roundMoney(totalRepayable / input.termDays),
    endDate: addDateOnlyDays(input.startDate, input.termDays),
  };
}

export function addDateOnlyDays(value: string, days: number) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function isValidDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}
