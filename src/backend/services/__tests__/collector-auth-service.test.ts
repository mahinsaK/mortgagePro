import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookieDelete: vi.fn(),
  cookieGet: vi.fn(),
  cookieSet: vi.fn(),
  getTenantDocument: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    delete: mocks.cookieDelete,
    get: mocks.cookieGet,
    set: mocks.cookieSet,
  })),
}));

vi.mock("../tenant-data-service", () => ({
  getTenantDocument: mocks.getTenantDocument,
}));

import { requireActiveCollectorPrincipal } from "../collector-auth-service";
import { encodeCollectorSession } from "../collector-session-codec";

const secret = "0123456789abcdef0123456789abcdef";

describe("requireActiveCollectorPrincipal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("COLLECTOR_SESSION_SECRET", secret);
    const now = Date.now();
    const token = encodeCollectorSession(
      {
        collectorId: "collector_A",
        lenderId: "lender_A",
        name: "Old name",
        issuedAt: now,
        expiresAt: now + 60_000,
        sessionVersion: 4,
      },
      secret,
    );
    mocks.cookieGet.mockReturnValue({ value: token });
    mocks.getTenantDocument.mockResolvedValue({
      $id: "collector_A",
      lender_id: "lender_A",
      name: "Current name",
      session_version: 4,
      status: "active",
    });
  });

  it("returns a revalidated active collector principal", async () => {
    await expect(requireActiveCollectorPrincipal()).resolves.toMatchObject({
      collectorId: "collector_A",
      lenderId: "lender_A",
      name: "Current name",
      sessionVersion: 4,
    });
    expect(mocks.getTenantDocument).toHaveBeenCalledWith(
      "collectors",
      "lender_A",
      "collector_A",
      expect.arrayContaining(["lender_id", "status", "session_version"]),
    );
  });

  it.each([
    ["deleted", null],
    [
      "inactive",
      {
        $id: "collector_A",
        lender_id: "lender_A",
        name: "Collector",
        session_version: 4,
        status: "inactive",
      },
    ],
    [
      "version-mismatched",
      {
        $id: "collector_A",
        lender_id: "lender_A",
        name: "Collector",
        session_version: 5,
        status: "active",
      },
    ],
    [
      "tenant-mismatched",
      {
        $id: "collector_A",
        lender_id: "lender_B",
        name: "Collector",
        session_version: 4,
        status: "active",
      },
    ],
  ])("rejects and clears a %s collector session", async (_label, collector) => {
    mocks.getTenantDocument.mockResolvedValue(collector);

    await expect(requireActiveCollectorPrincipal()).resolves.toBeNull();
    expect(mocks.cookieDelete).toHaveBeenCalledWith(
      "mortgagepro_collector_session",
    );
  });
});
