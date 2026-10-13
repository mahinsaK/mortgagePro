import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getBorrowerLoansPageData: vi.fn(),
  getCollectorsPageData: vi.fn(),
  getLenderDashboardLoansData: vi.fn(),
  getLoansPageData: vi.fn(),
  getPaymentsPageData: vi.fn(),
}));

vi.mock("@/backend/services/lending-service", () => ({
  getBorrowerLoansPageData: mocks.getBorrowerLoansPageData,
  getCollectorsPageData: mocks.getCollectorsPageData,
  getLoansPageData: mocks.getLoansPageData,
  getPaymentsPageData: mocks.getPaymentsPageData,
}));
vi.mock("@/backend/services/dashboard-service", () => ({
  getLenderDashboardLoansData: mocks.getLenderDashboardLoansData,
}));

import { GET as getBorrowerLoans } from "./borrowers/[borrowerId]/loans/route";
import { GET as getCollectors } from "./collectors/route";
import { GET as getDashboardLoans } from "./dashboard/loans/route";
import { GET as getLoans } from "./loans/route";
import { GET as getPayments } from "./payments/route";

const pageResult = {
  lender: { id: "lender_a" },
  loans: [{ id: "loan_1" }],
  payments: [{ id: "payment_1" }],
  collectors: [{ id: "collector_1" }],
  pageInfo: { page: 2, pageSize: 20, total: 22, totalPages: 2 },
};

describe("portal infinite-list routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getLoansPageData.mockResolvedValue(pageResult);
    mocks.getPaymentsPageData.mockResolvedValue(pageResult);
    mocks.getCollectorsPageData.mockResolvedValue(pageResult);
    mocks.getLenderDashboardLoansData.mockResolvedValue(pageResult);
    mocks.getBorrowerLoansPageData.mockResolvedValue({
      ...pageResult,
      borrowerFound: true,
    });
  });

  it("passes bounded page and filter values to each tenant service", async () => {
    const responses = await Promise.all([
      getLoans(new Request("http://localhost/api/loans?page=2&attention=overdue&asOf=2026-10-13")),
      getPayments(new Request("http://localhost/api/payments?page=2")),
      getCollectors(new Request("http://localhost/api/collectors?page=2")),
      getDashboardLoans(new Request("http://localhost/api/dashboard/loans?page=2&q=Avery")),
      getBorrowerLoans(
        new Request("http://localhost/api/borrowers/borrower_1/loans?page=2&status=completed"),
        { params: Promise.resolve({ borrowerId: "borrower_1" }) },
      ),
    ]);

    expect(responses.every((response) => response.status === 200)).toBe(true);
    expect(responses.every((response) => response.headers.get("cache-control") === "private, no-store")).toBe(true);
    expect(mocks.getLoansPageData).toHaveBeenCalledWith(expect.objectContaining({ page: 2, pageSize: 20, attention: "overdue" }));
    expect(mocks.getPaymentsPageData).toHaveBeenCalledWith({ page: 2, pageSize: 20 });
    expect(mocks.getCollectorsPageData).toHaveBeenCalledWith({ page: 2, pageSize: 20 });
    expect(mocks.getLenderDashboardLoansData).toHaveBeenCalledWith({ page: 2, pageSize: 15, query: "Avery" });
    expect(mocks.getBorrowerLoansPageData).toHaveBeenCalledWith("borrower_1", { loanStatus: "completed", page: 2, pageSize: 5 });
  });

  it("returns not found without querying for a malformed borrower id", async () => {
    const response = await getBorrowerLoans(
      new Request("http://localhost/api/borrowers/bad%20id/loans"),
      { params: Promise.resolve({ borrowerId: "bad id" }) },
    );
    expect(response.status).toBe(404);
    expect(mocks.getBorrowerLoansPageData).not.toHaveBeenCalled();
  });
});
