import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getTenantDocument: vi.fn(),
  requireActiveCollectorPrincipal: vi.fn(),
  recordSecurityEvent: vi.fn(),
}));

vi.mock("@/backend/services/collector-auth-service", () => ({
  requireActiveCollectorPrincipal: mocks.requireActiveCollectorPrincipal,
}));
vi.mock("@/backend/services/tenant-data-service", () => ({
  getTenantDocument: mocks.getTenantDocument,
}));
vi.mock("@/backend/services/security-event-service", () => ({
  recordSecurityEvent: mocks.recordSecurityEvent,
}));

import { GET } from "./route";

describe("collector loan lookup route", () => {
  beforeEach(() => {
    mocks.requireActiveCollectorPrincipal.mockResolvedValue({
      collectorId: "collector_1",
      lenderId: "lender_1",
      name: "Jordan",
    });
    mocks.getTenantDocument.mockImplementation((collection: string) =>
      Promise.resolve(
        collection === "loans"
          ? {
              $id: "loan_1",
              borrower_id: "borrower_1",
              amount: 1000,
              total_paid: 300,
              remaining_amount: 700,
              daily_payment: 45,
              status: "active",
            }
          : { $id: "borrower_1", name: "Avery Johnson" },
      ),
    );
  });

  it("returns the daily payment for the scanned-loan payment popup", async () => {
    const response = await GET(
      new Request("http://localhost/api/collector/loan?loanId=loan_1"),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      loan: {
        id: "loan_1",
        borrowerName: "Avery Johnson",
        dailyPayment: 45,
        remainingAmount: 700,
      },
    });

    expect(mocks.getTenantDocument).toHaveBeenCalledWith(
      "loans",
      "lender_1",
      "loan_1",
      expect.arrayContaining(["daily_payment"]),
    );
  });
});
