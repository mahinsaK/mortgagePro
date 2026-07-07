import { describe, expect, it } from "vitest";
import { PaymentController } from "../controller";

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
});
