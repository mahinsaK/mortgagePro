import { describe, expect, it } from "vitest";
import { addDateOnlyDays, calculateLoanPlan } from "../loan-calculator";

describe("loan calculator", () => {
  it("calculates flat interest across the full repayment term", () => {
    expect(
      calculateLoanPlan({
        capital: 100_000,
        interestRate: 10,
        method: "flat",
        startDate: "2026-08-07",
        termDays: 30,
      }),
    ).toEqual({
      capital: 100_000,
      endDate: "2026-09-06",
      interestAmount: 10_000,
      suggestedDailyPayment: 3_666.67,
      totalRepayable: 110_000,
    });
  });

  it("prorates annual simple interest by the number of days", () => {
    expect(
      calculateLoanPlan({
        capital: 100_000,
        interestRate: 12,
        method: "annual",
        startDate: "2026-01-01",
        termDays: 30,
      }),
    ).toEqual({
      capital: 100_000,
      endDate: "2026-01-31",
      interestAmount: 986.3,
      suggestedDailyPayment: 3_366.21,
      totalRepayable: 100_986.3,
    });
  });

  it("handles month and leap-year boundaries without timezone shifts", () => {
    expect(addDateOnlyDays("2028-02-28", 2)).toBe("2028-03-01");
  });

  it("rejects incomplete or invalid plans", () => {
    expect(
      calculateLoanPlan({
        capital: 0,
        interestRate: 10,
        method: "flat",
        startDate: "2026-08-07",
        termDays: 30,
      }),
    ).toBeNull();
    expect(
      calculateLoanPlan({
        capital: 100,
        interestRate: 10,
        method: "flat",
        startDate: "2026-02-31",
        termDays: 30,
      }),
    ).toBeNull();
  });
});
