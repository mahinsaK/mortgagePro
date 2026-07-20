import { AppwriteException } from "node-appwrite";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createOAuth2Token: vi.fn(),
}));

vi.mock("@/backend/appwrite/server-client", () => ({
  createAdminAccountClient: vi.fn(() => ({
    createOAuth2Token: mocks.createOAuth2Token,
  })),
}));

import { GET } from "../route";

describe("Google OAuth start route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.APP_BASE_URL = "https://mortgagepro.example";
    mocks.createOAuth2Token.mockResolvedValue(
      "https://fra.cloud.appwrite.io/v1/account/tokens/oauth2/google",
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
});
