import { AppwriteException, OAuthProvider } from "node-appwrite";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createAdminAccountClient } from "@/backend/appwrite/server-client";
import {
  createLenderOAuthState,
  getFixedAuthUrl,
  getLenderGoogleOAuthUrls,
  LENDER_OAUTH_STATE_COOKIE,
  LENDER_OAUTH_STATE_COOKIE_OPTIONS,
} from "@/backend/services/lender-google-oauth-service";
import {
  consumeAuthenticationAttempt,
  RATE_LIMITED_MESSAGE,
} from "@/backend/services/authentication-rate-limit-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const rateLimit = await consumeAuthenticationAttempt({
      flow: "google_login",
      headers: request.headers,
    });

    if (!rateLimit.allowed) {
      const loginUrl = getFixedAuthUrl("/auth/login");
      loginUrl.searchParams.set("status", "error");
      loginUrl.searchParams.set("message", RATE_LIMITED_MESSAGE);
      return NextResponse.redirect(loginUrl, 303);
    }
  } catch {
    return NextResponse.redirect(new URL("/auth/unavailable", request.url), 303);
  }

  try {
    const state = createLenderOAuthState();
    const { failure, success } = getLenderGoogleOAuthUrls(state);
    const providerUrl = await createAdminAccountClient().createOAuth2Token({
      provider: OAuthProvider.Google,
      success,
      failure,
    });

    const response = NextResponse.redirect(providerUrl, 303);
    response.cookies.set(
      LENDER_OAUTH_STATE_COOKIE,
      state,
      LENDER_OAUTH_STATE_COOKIE_OPTIONS,
    );
    return response;
  } catch (error) {
    if (
      error instanceof AppwriteException &&
      error.code >= 400 &&
      error.code < 500
    ) {
      const loginUrl = getFixedAuthUrl("/auth/login");
      loginUrl.searchParams.set("status", "error");
      loginUrl.searchParams.set(
        "message",
        "Google sign-in is not configured for this application address. Please use email and password for now.",
      );
      return NextResponse.redirect(loginUrl, 303);
    }

    return NextResponse.redirect(new URL("/auth/unavailable", request.url), 303);
  }
}
