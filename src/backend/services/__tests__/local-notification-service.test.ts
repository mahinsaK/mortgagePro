import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPrimaryLender: vi.fn(),
  listTenantDocuments: vi.fn(),
}));

vi.mock("@/backend/services/lender-service", () => ({
  getPrimaryLender: mocks.getPrimaryLender,
}));

vi.mock("@/backend/services/tenant-data-service", () => ({
  listTenantDocuments: mocks.listTenantDocuments,
}));

import {
  createNotificationOwnerKey,
  getLocalLenderNotifications,
} from "../local-notification-service";

describe("local notification data service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPrimaryLender.mockResolvedValue({ id: "lender_A" });
    mocks.listTenantDocuments
      .mockResolvedValueOnce({
        documents: [
          {
            $id: "loan_A",
            end_date: "2026-08-03T00:00:00.000Z",
            remaining_amount: 100,
            status: "active",
          },
        ],
        total: 1,
      })
      .mockResolvedValueOnce({ documents: [{ $id: "loan_A" }], total: 1 })
      .mockResolvedValueOnce({ documents: [], total: 0 })
      .mockResolvedValueOnce({
        documents: [{ $id: "borrower_A", contact: "", status: "active" }],
        total: 1,
      });
  });

  it("derives the lender from authentication and performs only tenant reads", async () => {
    const result = await getLocalLenderNotifications({
      localDate: "2026-08-04",
      timezoneOffsetMinutes: "-330",
    });

    expect(result?.items.map((item) => item.kind)).toEqual([
      "loans_overdue",
      "borrowers_missing_phone",
      "no_collections_today",
    ]);
    expect(result?.ownerKey).toBe(createNotificationOwnerKey("lender_A"));
    expect(mocks.listTenantDocuments).toHaveBeenCalledTimes(4);
    expect(
      mocks.listTenantDocuments.mock.calls.every(([, lenderId]) => lenderId === "lender_A"),
    ).toBe(true);
    expect(mocks.listTenantDocuments.mock.calls.map(([collection]) => collection)).toEqual([
      "loans",
      "loans",
      "payments",
      "borrowers",
    ]);
  });

  it("performs no record reads without an authenticated lender", async () => {
    vi.clearAllMocks();
    mocks.getPrimaryLender.mockResolvedValue(null);

    await expect(
      getLocalLenderNotifications({
        localDate: "2026-08-04",
        timezoneOffsetMinutes: "0",
      }),
    ).resolves.toBeNull();
    expect(mocks.listTenantDocuments).not.toHaveBeenCalled();
  });

  it("creates stable opaque owner keys", () => {
    expect(createNotificationOwnerKey("lender_A")).toMatch(/^[a-f0-9]{24}$/);
    expect(createNotificationOwnerKey("lender_A")).toBe(
      createNotificationOwnerKey("lender_A"),
    );
    expect(createNotificationOwnerKey("lender_A")).not.toBe(
      createNotificationOwnerKey("lender_B"),
    );
  });
});
