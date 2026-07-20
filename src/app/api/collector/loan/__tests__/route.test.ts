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

import { GET } from "../route";

describe("collector loan lookup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireActiveCollectorPrincipal.mockResolvedValue({
      collectorId: "collector_A",
      lenderId: "lender_A",
      name: "Jordan Lee",
    });
  });

  it("returns only the payment essentials for a lender-owned loan", async () => {
    mocks.getTenantDocument
      .mockResolvedValueOnce({
        $id: "loan_A",
        borrower_id: "borrower_A",
        daily_payment: 250,
        remaining_amount: 2750,
      })
      .mockResolvedValueOnce({ $id: "borrower_A", name: "Amal Perera" });

    const response = await GET(
      new Request("https://example.test/api/collector/loan?loanId=loan_A"),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      loan: {
        id: "loan_A",
        borrowerName: "Amal Perera",
        dailyPayment: 250,
        remainingAmount: 2750,
      },
    });
    expect(data.loan).not.toHaveProperty("amount");
    expect(data.loan).not.toHaveProperty("totalPaid");
    expect(data.loan).not.toHaveProperty("status");

    const loanSelect = mocks.getTenantDocument.mock.calls[0][3] as string[];
    expect(loanSelect).toEqual([
      "$id",
      "borrower_id",
      "remaining_amount",
      "daily_payment",
    ]);
  });

  it("returns 404 for another lender's loan ID", async () => {
    mocks.getTenantDocument.mockResolvedValue(null);

    const response = await GET(
      new Request("https://example.test/api/collector/loan?loanId=loan_B"),
    );

    expect(response.status).toBe(404);
    expect(mocks.getTenantDocument).toHaveBeenCalledWith(
      "loans",
      "lender_A",
      "loan_B",
      expect.any(Array),
    );
    expect(mocks.recordSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "collector_loan_access_denied",
        outcome: "denied",
        lenderId: "lender_A",
      }),
    );
  });
});
