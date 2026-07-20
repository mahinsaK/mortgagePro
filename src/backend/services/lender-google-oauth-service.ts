import "server-only";

import { randomBytes, timingSafeEqual } from "node:crypto";
import { getAppBaseUrl } from "@/backend/appwrite/config";

export const LENDER_OAUTH_STATE_COOKIE = "mortgagepro_lender_oauth_state";

export const LENDER_OAUTH_STATE_COOKIE_OPTIONS = {
  httpOnly: true,
  maxAge: 10 * 60,
  path: "/auth/google",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

export function createLenderOAuthState() {
  return randomBytes(32).toString("hex");
}

export function matchesLenderOAuthState(
  expectedState: string | undefined,
  receivedState: string | null,
) {
  if (
    !expectedState ||
    !receivedState ||
    !/^[a-f0-9]{64}$/.test(expectedState) ||
    !/^[a-f0-9]{64}$/.test(receivedState)
  ) {
    return false;
  }

  return timingSafeEqual(
    Buffer.from(expectedState, "hex"),
    Buffer.from(receivedState, "hex"),
  );
}

export function getLenderGoogleOAuthUrls(state: string) {
  const baseUrl = getAppBaseUrl();
  const success = new URL("/auth/google/callback", baseUrl);
  success.searchParams.set("state", state);

  return {
    failure: new URL("/auth/google/failure", baseUrl).toString(),
    success: success.toString(),
  };
}

export function getFixedAuthUrl(path: string) {
  return new URL(path, getAppBaseUrl());
}
