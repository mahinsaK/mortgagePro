import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  refreshActiveCollectorSession: vi.fn(),
}));

vi.mock("@/backend/services/collector-auth-service", () => ({
  refreshActiveCollectorSession: mocks.refreshActiveCollectorSession,
}));

import { POST } from "./route";

describe("collector session refresh route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renews a validated active collector", async () => {
    mocks.refreshActiveCollectorSession.mockResolvedValue({
      collectorId: "collector_A",
    });

    const response = await POST();

    expect(response.status).toBe(200);
  });

  it("rejects an invalid or revoked collector session", async () => {
    mocks.refreshActiveCollectorSession.mockResolvedValue(null);

    const response = await POST();

    expect(response.status).toBe(401);
  });

  it("keeps temporary service failures recoverable", async () => {
    mocks.refreshActiveCollectorSession.mockRejectedValue(
      new Error("Appwrite unavailable"),
    );

    const response = await POST();

    expect(response.status).toBe(503);
  });
});
