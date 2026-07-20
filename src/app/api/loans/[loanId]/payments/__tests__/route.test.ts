import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getLoanPaymentDetails: vi.fn(),
}));

vi.mock("@/backend/services/lending-service", () => ({
  getLoanPaymentDetails: mocks.getLoanPaymentDetails,
}));

import { GET } from "../route";

const details = {
  loanId: "loan_A",
  totalPaid: "LKR 3,500.00",
  remaining: "LKR 6,500.00",
  payments: [
    {
      id: "payment_1",
      amount: "LKR 2,500.00",
      collectorName: 'Jordan "Jay" Lee',
      method: "cash",
      date: "20 Jul 2026",
      recordedAt: "2026-07-20T08:30:00.000Z",
    },
  ],
};

describe("loan payment history route", () => {
  beforeEach(() => {
    mocks.getLoanPaymentDetails.mockReset();
    mocks.getLoanPaymentDetails.mockResolvedValue(details);
  });

  it("continues returning payment details as JSON", async () => {
    const response = await GET(
      new Request("https://example.test/api/loans/loan_A/payments"),
      { params: Promise.resolve({ loanId: "loan_A" }) },
    );

    expect(response.headers.get("content-type")).toContain("application/json");
    await expect(response.json()).resolves.toEqual(details);
  });

  it("downloads the selected loan payments as CSV without IDs", async () => {
    const response = await GET(
      new Request(
        "https://example.test/api/loans/loan_A/payments?format=csv",
      ),
      { params: Promise.resolve({ loanId: "loan_A" }) },
    );
    const csv = await response.text();

    expect(response.headers.get("content-type")).toContain("text/csv");
    expect(response.headers.get("content-disposition")).toContain("attachment");
    expect(csv).toContain("date,collected_at,collector,amount,method");
    expect(csv).toContain('"Jordan ""Jay"" Lee"');
    expect(csv).not.toContain("payment_1");
    expect(csv).not.toContain("loan_A");
    expect(mocks.getLoanPaymentDetails).toHaveBeenCalledWith("loan_A");
  });

  it("returns 404 without exporting another lender's loan", async () => {
    mocks.getLoanPaymentDetails.mockResolvedValue(null);

    const response = await GET(
      new Request(
        "https://example.test/api/loans/another-loan/payments?format=csv",
      ),
      { params: Promise.resolve({ loanId: "another-loan" }) },
    );

    expect(response.status).toBe(404);
    await expect(response.text()).resolves.toBe("Loan not found.");
  });
});
