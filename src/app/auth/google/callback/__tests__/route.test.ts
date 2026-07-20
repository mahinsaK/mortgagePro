import { AppwriteException } from "node-appwrite";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSession: vi.fn(),
  findActiveLender: vi.fn(),
  revokeSession: vi.fn(),
  recordSecurityEvent: vi.fn(),
}));

vi.mock("@/backend/appwrite/server-client", () => ({
  createAdminAccountClient: vi.fn(() => ({
    createSession: mocks.createSession,
  })),
}));

vi.mock("@/backend/services/lender-login-service", () => ({
  findActiveLenderByAppwriteUserId: mocks.findActiveLender,
  revokeAppwriteSessionBestEffort: mocks.revokeSession,
}));
vi.mock("@/backend/services/security-event-service", () => ({
  recordSecurityEvent: mocks.recordSecurityEvent,
}));

import { GET } from "../route";

const state = "a".repeat(64);
const createdSession = {
  $id: "session_A",
  userId: "user_A",
  secret: "stored-session-secret",
  expire: "2030-01-02T03:04:05.000Z",
};

function callbackRequest(overrides: Record<string, string> = {}) {
  const url = new URL("https://mortgagepro.example/auth/google/callback");
  const values = {
    state,
    userId: "user_A",
    secret: "one-time-oauth-secret",
    ...overrides,
  };

  for (const [key, value] of Object.entries(values)) {
    url.searchParams.set(key, value);
  }

  return new NextRequest(url, {
    headers: {
      cookie: `mortgagepro_lender_oauth_state=${state}`,
    },
  });
}

describe("Google OAuth callback route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.APP_BASE_URL = "https://mortgagepro.example";
    mocks.createSession.mockResolvedValue(createdSession);
    mocks.findActiveLender.mockResolvedValue({ $id: "lender_A" });
  });

  it("creates an application session only for an active existing lender", async () => {
    const response = await GET(callbackRequest());

    expect(mocks.createSession).toHaveBeenCalledWith({
      userId: "user_A",
      secret: "one-time-oauth-secret",
    });
    expect(mocks.findActiveLender).toHaveBeenCalledWith("user_A");
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://mortgagepro.example/dashboard/lender",
    );
    expect(response.cookies.get("mortgagepro_session")?.value).toBe(
      "stored-session-secret",
    );
    expect(response.cookies.get("mortgagepro_session")?.httpOnly).toBe(true);
    expect(response.cookies.get("mortgagepro_session")?.sameSite).toBe("lax");
    expect(response.cookies.get("mortgagepro_lender_oauth_state")?.value).toBe("");
    expect(response.headers.get("location")).not.toContain("secret");
    expect(mocks.revokeSession).not.toHaveBeenCalled();
    expect(mocks.recordSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "google_login_success",
        outcome: "success",
        lenderId: "lender_A",
      }),
    );
  });

  it("revokes the session and rejects a Google user without a lender profile", async () => {
    mocks.findActiveLender.mockResolvedValue(null);

    const response = await GET(callbackRequest());

    expect(mocks.revokeSession).toHaveBeenCalledWith(createdSession);
    expect(response.headers.get("location")).toContain("/auth/login?status=error");
    expect(response.headers.get("location")).toContain(
      "No+active+lender+account+is+connected",
    );
    expect(response.cookies.get("mortgagepro_session")).toBeUndefined();
  });

  it("rejects mismatched state before exchanging the OAuth token", async () => {
    const response = await GET(callbackRequest({ state: "b".repeat(64) }));

    expect(mocks.createSession).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toContain("/auth/login?status=error");
    expect(response.cookies.get("mortgagepro_lender_oauth_state")?.value).toBe("");
  });

  it("treats a rejected or reused callback token as a login failure", async () => {
    mocks.createSession.mockRejectedValue(
      new AppwriteException("Invalid token", 401, "user_unauthorized"),
    );

    const response = await GET(callbackRequest());

    expect(response.headers.get("location")).toContain("/auth/login?status=error");
    expect(response.cookies.get("mortgagepro_session")).toBeUndefined();
  });

  it("revokes a created session when lender lookup becomes unavailable", async () => {
    mocks.findActiveLender.mockRejectedValue(
      new AppwriteException("Unavailable", 503, "general_server_error"),
    );

    const response = await GET(callbackRequest());

    expect(mocks.revokeSession).toHaveBeenCalledWith(createdSession);
    expect(response.headers.get("location")).toBe(
      "https://mortgagepro.example/auth/unavailable",
    );
    expect(response.cookies.get("mortgagepro_session")).toBeUndefined();
  });

  it("treats a lender lookup authorization error as service unavailability", async () => {
    mocks.findActiveLender.mockRejectedValue(
      new AppwriteException("Runtime key rejected", 401, "user_unauthorized"),
    );

    const response = await GET(callbackRequest());

    expect(mocks.revokeSession).toHaveBeenCalledWith(createdSession);
    expect(response.headers.get("location")).toBe(
      "https://mortgagepro.example/auth/unavailable",
    );
  });
});
