import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createDocument: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/backend/appwrite/config", () => ({
  appwriteServerConfig: {
    databaseId: "database",
    collections: { securityEvents: "security_events" },
  },
}));
vi.mock("@/backend/appwrite/server-client", () => ({
  databases: { createDocument: mocks.createDocument },
  ID: { unique: vi.fn(() => "event_1") },
}));

import { recordSecurityEvent } from "../security-event-service";

describe("security event monitoring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SECURITY_MONITORING_SECRET = "m".repeat(32);
    mocks.createDocument.mockResolvedValue({ $id: "event_1" });
    vi.spyOn(console, "info").mockImplementation(mocks.info);
    vi.spyOn(console, "warn").mockImplementation(mocks.warn);
  });

  it("stores and logs only hashed identities and sanitized metadata", async () => {
    await recordSecurityEvent({
      eventType: "lender_login_failure",
      outcome: "failure",
      principalType: "lender",
      principalIdentifier: "Owner@Example.test",
      headers: new Headers({
        "x-forwarded-for": "203.0.113.10",
        "x-request-id": "request_123",
      }),
      reasonCode: "invalid_credentials",
      metadata: {
        route: "/auth/login",
        session_secret: "must-not-be-stored",
      },
    });

    const request = mocks.createDocument.mock.calls[0][0];
    const serialized = JSON.stringify(request);
    expect(serialized).not.toContain("Owner@Example.test");
    expect(serialized).not.toContain("203.0.113.10");
    expect(serialized).not.toContain("must-not-be-stored");
    expect(request.data.principal_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(request.data.ip_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(request.data.request_id).toBe("request_123");
    expect(request.data.metadata).toBe('{"route":"/auth/login"}');
    expect(mocks.info).toHaveBeenCalledOnce();
  });

  it("does not fail authentication when event storage is unavailable", async () => {
    mocks.createDocument.mockRejectedValue(new Error("storage unavailable"));

    await expect(
      recordSecurityEvent({
        eventType: "collector_login_success",
        outcome: "success",
        principalType: "collector",
      }),
    ).resolves.toBeUndefined();

    expect(mocks.warn).toHaveBeenCalledWith(
      expect.not.stringContaining("storage unavailable"),
    );
  });

  it("does not fail authentication when monitoring configuration is missing", async () => {
    delete process.env.SECURITY_MONITORING_SECRET;

    await expect(
      recordSecurityEvent({
        eventType: "lender_login_success",
        outcome: "success",
        principalType: "lender",
        principalIdentifier: "owner@example.test",
      }),
    ).resolves.toBeUndefined();

    expect(mocks.createDocument).not.toHaveBeenCalled();
    expect(mocks.warn).toHaveBeenCalledWith(
      expect.not.stringContaining("owner@example.test"),
    );
  });
});
