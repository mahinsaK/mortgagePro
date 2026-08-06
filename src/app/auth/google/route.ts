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
import { recordSecurityEvent } from "@/backend/services/security-event-service";

export const dynamic = "force-dynamic";

const GOOGLE_ADDRESS_NOT_CONFIGURED =
  "Google sign-in is not configured for this application address. Please use email and password for now.";

export async function GET(request: NextRequest) {
  try {
    const rateLimit = await consumeAuthenticationAttempt({
      flow: "google_login",
      headers: request.headers,
    });

    if (!rateLimit.allowed) {
      await recordSecurityEvent({
        eventType: "google_login_blocked",
        outcome: "blocked",
        principalType: "anonymous",
        headers: request.headers,
        reasonCode: "rate_limit",
      });
      const loginUrl = getFixedAuthUrl("/auth/login");
      loginUrl.searchParams.set("status", "error");
      loginUrl.searchParams.set("message", RATE_LIMITED_MESSAGE);
      return NextResponse.redirect(loginUrl, 303);
    }
  } catch {
    await recordSecurityEvent({
      eventType: "google_login_error",
      outcome: "error",
      principalType: "anonymous",
      headers: request.headers,
      reasonCode: "rate_limit_unavailable",
    });
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
    await recordSecurityEvent({
      eventType: "google_login_started",
      outcome: "success",
      principalType: "anonymous",
      headers: request.headers,
    });
    return response;
  } catch (error) {
    if (isApplicationAddressError(error)) {
      await recordSecurityEvent({
        eventType: "google_login_failure",
        outcome: "failure",
        principalType: "anonymous",
        headers: request.headers,
        reasonCode: "provider_configuration",
      });
      const loginUrl = getFixedAuthUrl("/auth/login");
      loginUrl.searchParams.set("status", "error");
      loginUrl.searchParams.set("message", GOOGLE_ADDRESS_NOT_CONFIGURED);
      return NextResponse.redirect(loginUrl, 303);
    }

    if (error instanceof AppwriteException) {
      console.warn("Google OAuth start was rejected by Appwrite.", {
        code: error.code,
        type: error.type,
      });
    }

    await recordSecurityEvent({
      eventType: "google_login_error",
      outcome: "error",
      principalType: "anonymous",
      headers: request.headers,
      reasonCode: "provider_unavailable",
    });
    return NextResponse.redirect(new URL("/auth/unavailable", request.url), 303);
  }
}

function isApplicationAddressError(error: unknown) {
  return (
    error instanceof AppwriteException &&
    error.code >= 400 &&
    error.code < 500 &&
    error.type === "general_argument_invalid"
  );
}
