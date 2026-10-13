import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getDailyCollectionsData: vi.fn() }));

vi.mock("@/backend/services/lending-service", () => ({
  getDailyCollectionsData: mocks.getDailyCollectionsData,
}));

import { GET } from "./route";

describe("daily collections infinite-list route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads 20 payments for the selected day and collector", async () => {
    mocks.getDailyCollectionsData.mockResolvedValue({
      lender: { id: "lender_a" },
      payments: [{ id: "payment_1" }],
      pageInfo: { page: 2, pageSize: 20, total: 22, totalPages: 2 },
    });

    const response = await GET(new Request(
      "http://localhost/api/payments/daily?date=2026-10-13&page=2&collector=collector_1",
    ));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.getDailyCollectionsData).toHaveBeenCalledWith("2026-10-13", {
      collectorId: "collector_1",
      page: 2,
      pageSize: 20,
    });
  });

  it("rejects invalid dates before querying data", async () => {
    const response = await GET(new Request(
      "http://localhost/api/payments/daily?date=not-a-date",
    ));

    expect(response.status).toBe(400);
    expect(mocks.getDailyCollectionsData).not.toHaveBeenCalled();
  });
});
