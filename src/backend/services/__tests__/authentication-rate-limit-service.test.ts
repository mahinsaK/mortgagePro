import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createDocument: vi.fn(),
  createTransaction: vi.fn(),
  deleteDocument: vi.fn(),
  getDocument: vi.fn(),
  updateDocument: vi.fn(),
  updateTransaction: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/backend/appwrite/config", () => ({
  appwriteServerConfig: {
    databaseId: "database",
    collections: { authRateLimits: "auth_rate_limits" },
  },
}));
vi.mock("@/backend/appwrite/server-client", () => ({
  databases: mocks,
}));

import {
  clearAuthenticationIdentityLimit,
  consumeAuthenticationAttempt,
} from "../authentication-rate-limit-service";

const now = new Date("2026-07-20T06:00:00.000Z");
const headers = new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" });

describe("authentication rate limiting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SECURITY_MONITORING_SECRET = "s".repeat(32);
    mocks.createTransaction.mockResolvedValue({ $id: "transaction_1" });
    mocks.getDocument.mockRejectedValue({ code: 404 });
    mocks.createDocument.mockResolvedValue({});
    mocks.updateDocument.mockResolvedValue({});
    mocks.updateTransaction.mockResolvedValue({});
    mocks.deleteDocument.mockResolvedValue({});
  });

  it("stores hashed IP and identity attempts without raw values", async () => {
    const result = await consumeAuthenticationAttempt({
      flow: "lender_login",
      identity: "Owner@Example.test",
      headers,
      now,
    });

    expect(result.allowed).toBe(true);
    expect(mocks.createDocument).toHaveBeenCalledTimes(2);
    const serialized = JSON.stringify(mocks.createDocument.mock.calls);
    expect(serialized).not.toContain("203.0.113.7");
    expect(serialized).not.toContain("Owner@Example.test");
    expect(serialized).toContain("lender_login_identity");
    expect(mocks.updateTransaction).toHaveBeenCalledWith({
      transactionId: "transaction_1",
      commit: true,
    });
  });

  it("blocks the ninth lender identity attempt for fifteen minutes", async () => {
    mocks.getDocument
      .mockRejectedValueOnce({ code: 404 })
      .mockResolvedValueOnce({
        attempt_count: 8,
        window_started_at: "2026-07-20T05:55:00.000Z",
      });

    const result = await consumeAuthenticationAttempt({
      flow: "lender_login",
      identity: "owner@example.test",
      headers,
      now,
    });

    expect(result).toEqual({ allowed: false, retryAfterSeconds: 900 });
    expect(mocks.updateDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          attempt_count: 9,
          blocked_until: "2026-07-20T06:15:00.000Z",
        }),
      }),
    );
  });

  it("does not authenticate while an existing block is active", async () => {
    mocks.getDocument.mockResolvedValue({
      attempt_count: 9,
      window_started_at: "2026-07-20T05:55:00.000Z",
      blocked_until: "2026-07-20T06:05:00.000Z",
    });

    const result = await consumeAuthenticationAttempt({
      flow: "google_login",
      headers,
      now,
    });

    expect(result).toEqual({ allowed: false, retryAfterSeconds: 300 });
    expect(mocks.createDocument).not.toHaveBeenCalled();
    expect(mocks.updateDocument).not.toHaveBeenCalled();
    expect(mocks.updateTransaction).toHaveBeenCalledWith({
      transactionId: "transaction_1",
      rollback: true,
    });
  });

  it("retries a concurrent transaction conflict", async () => {
    mocks.createTransaction
      .mockResolvedValueOnce({ $id: "transaction_1" })
      .mockResolvedValueOnce({ $id: "transaction_2" });
    mocks.updateTransaction.mockImplementation(
      ({ commit }: { commit?: boolean }) =>
        commit ? Promise.reject({ code: 409 }) : Promise.resolve({}),
    );

    await expect(
      consumeAuthenticationAttempt({ flow: "google_login", headers, now }),
    ).rejects.toMatchObject({ code: 409 });
    expect(mocks.createTransaction).toHaveBeenCalledTimes(3);
  });

  it("best-effort clears the successful identity counter", async () => {
    await expect(
      clearAuthenticationIdentityLimit("collector_login", "JordanLee4821"),
    ).resolves.toBeUndefined();

    const request = mocks.deleteDocument.mock.calls[0][0];
    expect(request.collectionId).toBe("auth_rate_limits");
    expect(request.documentId).toMatch(/^rl_[a-f0-9]{32}$/);
    expect(JSON.stringify(request)).not.toContain("JordanLee4821");
  });

  it("fails closed when the dedicated hashing secret is absent", async () => {
    delete process.env.SECURITY_MONITORING_SECRET;

    await expect(
      consumeAuthenticationAttempt({ flow: "google_login", headers, now }),
    ).rejects.toThrow("SECURITY_MONITORING_SECRET");
    expect(mocks.createTransaction).not.toHaveBeenCalled();
  });
});
