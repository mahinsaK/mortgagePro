import { describe, expect, it } from "vitest";
import { LoanController } from "../controller";

describe("LoanController", () => {
  it("prepares a loan payload with a QR code", () => {
    const result = new LoanController().create({
      lenderId: "lender_1",
      borrowerId: "borrower_1",
      amount: "1000",
      interestRate: "8",
      dailyPayment: "50",
      startDate: "2026-07-01",
      endDate: "2026-08-01",
      qrCode: "data:image/png;base64,qr",
    });

    expect(result.ok).toBe(true);
    expect(result.data).toMatchObject({
      amount: 1000,
      total_paid: 0,
      remaining_amount: 1000,
      status: "active",
      qr_code: "data:image/png;base64,qr",
    });
  });

  it("rejects end dates before start dates", () => {
    const result = new LoanController().create({
      lenderId: "lender_1",
      borrowerId: "borrower_1",
      amount: "1000",
      interestRate: "8",
      dailyPayment: "50",
      startDate: "2026-08-01",
      endDate: "2026-07-01",
      qrCode: "qr",
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe("endDate must be after startDate.");
  });
});
