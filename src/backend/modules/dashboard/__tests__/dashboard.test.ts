import { describe, expect, it } from "vitest";
import { DashboardController } from "../controller";
import type { DashboardLoanRowDto } from "../dto";

const loans: DashboardLoanRowDto[] = [
  {
    id: "loan_1",
    borrower: "Avery Johnson",
    borrowerContact: "+1 555 0101 / Cedar Road",
    borrowerPhone: "+1 555 0101",
    amount: "$1,000.00",
    dailyPayment: "$50.00",
    status: "active",
    endDate: "Aug 01, 2026",
  },
  {
    id: "loan_2",
    borrower: "Mina Stone",
    borrowerContact: "+1 555 0102 / Pine Road",
    borrowerPhone: "+1 555 0102",
    amount: "$2,000.00",
    dailyPayment: "$75.00",
    status: "active",
    endDate: "Aug 10, 2026",
  },
];

describe("DashboardController", () => {
  it("searches loans by borrower phone number", () => {
    const result = new DashboardController().searchLoans(loans, {
      query: "0102",
    });

    expect(result.ok).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0].borrower).toBe("Mina Stone");
  });
});
