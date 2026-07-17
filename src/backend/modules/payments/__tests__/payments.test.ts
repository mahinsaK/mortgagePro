import { describe, expect, it } from "vitest";
import { PaymentController } from "../controller";
import { PaymentService } from "../service";

describe("PaymentController", () => {
  it("rejects payment collection for another lender's loan", () => {
    const result = new PaymentController().record({
      lenderId: "lender_1",
      loanId: "loan_1",
      loanLenderId: "lender_2",
      collectorId: "collector_1",
      collectorLenderId: "lender_1",
      date: "2026-07-07",
      amount: "50",
      method: "cash",
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe(
      "This collector cannot collect another lender's loan.",
    );
  });

  it("calculates stored loan payment totals", () => {
    const totals = new PaymentService().calculateLoanTotals({
      loanAmount: 1000,
      currentTotalPaid: 250,
      paymentAmount: 300,
      currentStatus: "active",
    });

    expect(totals).toEqual({
      totalPaid: 550,
      remainingAmount: 450,
      status: "active",
    });
  });

  it("marks the loan completed when payment exactly covers the balance", () => {
    const totals = new PaymentService().calculateLoanTotals({
      loanAmount: 1000,
      currentTotalPaid: 900,
      paymentAmount: 100,
      currentStatus: "active",
    });

    expect(totals).toEqual({
      totalPaid: 1000,
      remainingAmount: 0,
      status: "completed",
    });
  });

  it("rejects a payment above the remaining loan balance", () => {
    expect(() =>
      new PaymentService().calculateLoanTotals({
        loanAmount: 1000,
        currentTotalPaid: 900,
        paymentAmount: 150,
        currentStatus: "active",
      }),
    ).toThrow("Payment amount cannot exceed the remaining loan balance.");
  });

  it("rounds monetary totals to two decimal places", () => {
    const totals = new PaymentService().calculateLoanTotals({
      loanAmount: 1,
      currentTotalPaid: 0.1,
      paymentAmount: 0.2,
      currentStatus: "active",
    });

    expect(totals).toEqual({
      totalPaid: 0.3,
      remainingAmount: 0.7,
      status: "active",
    });
  });
});
