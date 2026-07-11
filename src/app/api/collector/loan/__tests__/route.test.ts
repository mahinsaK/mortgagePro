import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getTenantDocument: vi.fn(),
  requireActiveCollectorPrincipal: vi.fn(),
}));

vi.mock("@/backend/services/collector-auth-service", () => ({
  requireActiveCollectorPrincipal: mocks.requireActiveCollectorPrincipal,
}));
vi.mock("@/backend/services/tenant-data-service", () => ({
  getTenantDocument: mocks.getTenantDocument,
}));

import { GET } from "../route";

describe("collector loan lookup", () => {
  it("returns 404 for another lender's loan ID", async () => {
    mocks.requireActiveCollectorPrincipal.mockResolvedValue({
      collectorId: "collector_A",
      lenderId: "lender_A",
      name: "Jordan Lee",
      sessionVersion: 1,
    });
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
  });
});
