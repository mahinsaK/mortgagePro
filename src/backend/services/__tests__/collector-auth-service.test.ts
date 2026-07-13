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

import {
  createCollectorCredentialFingerprint,
  requireActiveCollectorPrincipal,
} from "../collector-auth-service";
import { encodeCollectorSession } from "../collector-session-codec";

const secret = "0123456789abcdef0123456789abcdef";

describe("requireActiveCollectorPrincipal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("COLLECTOR_SESSION_SECRET", secret);
    const now = Date.now();
    const passwordHash = "salt:current-password-hash";
    const token = encodeCollectorSession(
      {
        collectorId: "collector_A",
        lenderId: "lender_A",
        name: "Old name",
        credentialFingerprint: createCollectorCredentialFingerprint(
          passwordHash,
          secret,
        ),
        issuedAt: now,
        expiresAt: now + 60_000,
      },
      secret,
    );
    mocks.cookieGet.mockReturnValue({ value: token });
    mocks.getTenantDocument.mockResolvedValue({
      $id: "collector_A",
      lender_id: "lender_A",
      name: "Current name",
      password_hash: passwordHash,
      status: "active",
    });
  });

  it("returns a revalidated active collector principal", async () => {
    await expect(requireActiveCollectorPrincipal()).resolves.toMatchObject({
      collectorId: "collector_A",
      lenderId: "lender_A",
      name: "Current name",
    });
    expect(mocks.getTenantDocument).toHaveBeenCalledWith(
      "collectors",
      "lender_A",
      "collector_A",
      ["$id", "lender_id", "name", "password_hash", "status"],
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
        password_hash: "salt:current-password-hash",
        status: "inactive",
      },
    ],
    [
      "password-changed",
      {
        $id: "collector_A",
        lender_id: "lender_A",
        name: "Collector",
        password_hash: "salt:new-password-hash",
        status: "active",
      },
    ],
    [
      "tenant-mismatched",
      {
        $id: "collector_A",
        lender_id: "lender_B",
        name: "Collector",
        password_hash: "salt:current-password-hash",
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
