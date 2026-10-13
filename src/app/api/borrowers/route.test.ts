import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getBorrowersPageData: vi.fn() }));

vi.mock("@/backend/services/lending-service", () => ({
  getBorrowersPageData: mocks.getBorrowersPageData,
}));

import { GET } from "./route";

describe("borrowers infinite-list route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads 20 tenant-scoped borrowers for the requested search page", async () => {
    mocks.getBorrowersPageData.mockResolvedValue({
      lender: { id: "lender_a" },
      borrowers: [{ id: "borrower_1" }],
      pageInfo: { page: 2, pageSize: 20, total: 21, totalPages: 2 },
    });

    const response = await GET(new Request(
      "http://localhost/api/borrowers?page=2&q=Avery&attention=missing-phone",
    ));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.getBorrowersPageData).toHaveBeenCalledWith({
      attention: "missing-phone",
      page: 2,
      pageSize: 20,
      query: "Avery",
    });
  });

  it("rejects an unauthenticated lender", async () => {
    mocks.getBorrowersPageData.mockResolvedValue({
      lender: null,
      borrowers: [],
      pageInfo: { page: 1, pageSize: 20, total: 0, totalPages: 1 },
    });

    expect((await GET(new Request("http://localhost/api/borrowers"))).status)
      .toBe(401);
  });
});
