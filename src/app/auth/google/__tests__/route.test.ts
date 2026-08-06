import { AppwriteException } from "node-appwrite";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  consumeAuthAttempt: vi.fn(),
  createOAuth2Token: vi.fn(),
  recordSecurityEvent: vi.fn(),
}));

vi.mock("@/backend/appwrite/server-client", () => ({
  createAccountClient: vi.fn(() => ({
    createOAuth2Token: mocks.createOAuth2Token,
  })),
}));
vi.mock("@/backend/services/authentication-rate-limit-service", () => ({
  consumeAuthenticationAttempt: mocks.consumeAuthAttempt,
  RATE_LIMITED_MESSAGE: "Too many sign-in attempts. Please wait and try again.",
}));
vi.mock("@/backend/services/security-event-service", () => ({
  recordSecurityEvent: mocks.recordSecurityEvent,
}));

import { GET } from "../route";

describe("Google OAuth start route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.APP_BASE_URL = "https://mortgagepro.example";
    mocks.consumeAuthAttempt.mockResolvedValue({ allowed: true });
    mocks.createOAuth2Token.mockResolvedValue(
      "https://fra.cloud.appwrite.io/v1/account/tokens/oauth2/google",
    );
  });

  it("does not start Google OAuth after the IP limit is reached", async () => {
    mocks.consumeAuthAttempt.mockResolvedValue({ allowed: false });

    const response = await GET(
      new NextRequest("https://mortgagepro.example/auth/google"),
    );

    expect(response.headers.get("location")).toContain("/auth/login?status=error");
    expect(response.headers.get("location")).toContain("Too+many+sign-in+attempts");
    expect(mocks.createOAuth2Token).not.toHaveBeenCalled();
    expect(mocks.recordSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "google_login_blocked",
        outcome: "blocked",
      }),
    );
  });

  it("uses fixed callbacks and stores a protected state cookie", async () => {
    const response = await GET(
      new NextRequest("https://untrusted.example/auth/google"),
    );

    const request = mocks.createOAuth2Token.mock.calls[0][0];
    const successUrl = new URL(request.success);
    const stateCookie = response.cookies.get("mortgagepro_lender_oauth_state");

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://fra.cloud.appwrite.io/v1/account/tokens/oauth2/google",
    );
    expect(request.provider).toBe("google");
    expect(successUrl.origin).toBe("https://mortgagepro.example");
    expect(successUrl.pathname).toBe("/auth/google/callback");
    expect(request.failure).toBe(
      "https://mortgagepro.example/auth/google/failure",
    );
    expect(successUrl.searchParams.get("state")).toBe(stateCookie?.value);
    expect(stateCookie?.httpOnly).toBe(true);
    expect(stateCookie?.sameSite).toBe("lax");
    expect(stateCookie?.path).toBe("/auth/google");
    expect(mocks.recordSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "google_login_started",
        outcome: "success",
      }),
    );
  });

  it("fails closed when OAuth configuration is unavailable", async () => {
    mocks.createOAuth2Token.mockRejectedValue(new Error("provider unavailable"));

    const response = await GET(
      new NextRequest("https://mortgagepro.example/auth/google"),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://mortgagepro.example/auth/unavailable",
    );
    expect(response.cookies.get("mortgagepro_lender_oauth_state")).toBeUndefined();
  });

  it("explains when Appwrite rejects the configured application address", async () => {
    mocks.createOAuth2Token.mockRejectedValue(
      new AppwriteException("Invalid redirect", 412, "general_argument_invalid"),
    );

    const response = await GET(
      new NextRequest("https://mortgagepro.example/auth/google"),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("/auth/login?status=error");
    expect(response.headers.get("location")).toContain(
      "Google+sign-in+is+not+configured",
    );
  });

  it("does not misreport rejected runtime credentials as an address error", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const oauthState = "a".repeat(64);
    mocks.createOAuth2Token.mockRejectedValue(
      new AppwriteException(
        `Request rejected: secret=callback-secret state=${oauthState} token=eyJabc.def.ghi`,
        401,
        "user_unauthorized",
      ),
    );

    const response = await GET(
      new NextRequest("https://mortgagepro.example/auth/google"),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://mortgagepro.example/auth/unavailable",
    );
    expect(warning).toHaveBeenCalledWith(
      "Google OAuth start was rejected by Appwrite.",
      expect.objectContaining({
        code: 401,
        type: "user_unauthorized",
        endpoint: expect.any(String),
        projectId: expect.any(String),
        callbackOrigin: "https://mortgagepro.example",
        clientMode: "sessionless",
      }),
    );
    const loggedDiagnostic = JSON.stringify(warning.mock.calls);
    expect(loggedDiagnostic).not.toContain("callback-secret");
    expect(loggedDiagnostic).not.toContain(oauthState);
    expect(loggedDiagnostic).not.toContain("eyJabc.def.ghi");
    expect(loggedDiagnostic).not.toContain("APPWRITE_RUNTIME_API_KEY");
    warning.mockRestore();
  });
});
