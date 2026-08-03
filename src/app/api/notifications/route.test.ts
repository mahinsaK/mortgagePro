import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getLocalLenderNotifications: vi.fn(),
}));

vi.mock("@/backend/services/local-notification-service", () => ({
  getLocalLenderNotifications: mocks.getLocalLenderNotifications,
}));

import { GET } from "./route";

describe("local notifications route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns tenant-generated notifications without public caching", async () => {
    mocks.getLocalLenderNotifications.mockResolvedValue({
      generatedAt: "2026-08-04T03:00:00.000Z",
      items: [],
      ownerKey: "owner-key",
    });

    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.getLocalLenderNotifications).toHaveBeenCalledWith({
      localDate: "2026-08-04",
      timezoneOffsetMinutes: "-330",
    });
  });

  it("rejects an unauthenticated lender", async () => {
    mocks.getLocalLenderNotifications.mockResolvedValue(null);

    const response = await GET(request());

    expect(response.status).toBe(401);
  });

  it("returns a validation error for malformed local context", async () => {
    mocks.getLocalLenderNotifications.mockRejectedValue(
      new Error("localDate must be a valid date in YYYY-MM-DD format."),
    );

    const response = await GET(request());

    expect(response.status).toBe(400);
  });

  it("uses a generic unavailable response for data failures", async () => {
    mocks.getLocalLenderNotifications.mockRejectedValue(
      new Error("Appwrite request failed with a secret"),
    );

    const response = await GET(request());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Notifications are temporarily unavailable.",
    });
  });
});

function request() {
  return new Request(
    "http://localhost/api/notifications?localDate=2026-08-04&timezoneOffsetMinutes=-330",
  );
}
