import { AppwriteException, type Models } from "node-appwrite";
import type { NextRequest, NextResponse as NextResponseType } from "next/server";
import { NextResponse } from "next/server";
import { createAdminAccountClient } from "@/backend/appwrite/server-client";
import {
  AUTH_SESSION_COOKIE,
  AUTH_SESSION_COOKIE_OPTIONS,
} from "@/backend/services/auth-session-service";
import {
  getFixedAuthUrl,
  LENDER_OAUTH_STATE_COOKIE,
  LENDER_OAUTH_STATE_COOKIE_OPTIONS,
  matchesLenderOAuthState,
} from "@/backend/services/lender-google-oauth-service";
import {
  findActiveLenderByAppwriteUserId,
  revokeAppwriteSessionBestEffort,
} from "@/backend/services/lender-login-service";
import { recordSecurityEvent } from "@/backend/services/security-event-service";

const GOOGLE_LOGIN_FAILED = "Google sign-in could not be completed. Please try again.";
const NO_LENDER_PROFILE =
  "No active lender account is connected to this Google account.";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const callbackUrl = request.nextUrl;
  const expectedState = request.cookies.get(LENDER_OAUTH_STATE_COOKIE)?.value;
  const receivedState = callbackUrl.searchParams.get("state");

  if (!matchesLenderOAuthState(expectedState, receivedState)) {
    await recordSecurityEvent({
      eventType: "google_login_failure",
      outcome: "failure",
      principalType: "anonymous",
      headers: request.headers,
      reasonCode: "state_mismatch",
    });
    return loginErrorResponse(request, GOOGLE_LOGIN_FAILED);
  }

  const userId = callbackUrl.searchParams.get("userId");
  const secret = callbackUrl.searchParams.get("secret");

  if (!isValidCallbackCredential(userId, 36) || !isValidCallbackCredential(secret, 4096)) {
    await recordSecurityEvent({
      eventType: "google_login_failure",
      outcome: "failure",
      principalType: "anonymous",
      headers: request.headers,
      reasonCode: "invalid_callback",
    });
    return loginErrorResponse(request, GOOGLE_LOGIN_FAILED);
  }

  let session: Models.Session;

  try {
    session = await createAdminAccountClient().createSession({
      userId,
      secret,
    });
  } catch (error) {
    if (isRejectedOAuthCallback(error)) {
      await recordSecurityEvent({
        eventType: "google_login_failure",
        outcome: "failure",
        principalType: "lender",
        principalIdentifier: userId,
        headers: request.headers,
        reasonCode: "callback_rejected",
      });
      return loginErrorResponse(request, GOOGLE_LOGIN_FAILED);
    }

    await recordSecurityEvent({
      eventType: "google_login_error",
      outcome: "error",
      principalType: "lender",
      principalIdentifier: userId,
      headers: request.headers,
      reasonCode: "session_exchange_unavailable",
    });
    return unavailableResponse(request);
  }

  if (!session.secret || !isValidExpiry(session.expire)) {
    await revokeAppwriteSessionBestEffort(session);
    await recordSecurityEvent({
      eventType: "google_login_error",
      outcome: "error",
      principalType: "lender",
      principalIdentifier: session.userId,
      headers: request.headers,
      reasonCode: "invalid_session_response",
    });
    return unavailableResponse(request);
  }

  let lender;

  try {
    lender = await findActiveLenderByAppwriteUserId(session.userId);
  } catch {
    await revokeAppwriteSessionBestEffort(session);
    await recordSecurityEvent({
      eventType: "google_login_error",
      outcome: "error",
      principalType: "lender",
      principalIdentifier: session.userId,
      headers: request.headers,
      reasonCode: "lender_lookup_unavailable",
    });
    return unavailableResponse(request);
  }

  if (!lender) {
    await revokeAppwriteSessionBestEffort(session);
    await recordSecurityEvent({
      eventType: "google_login_denied",
      outcome: "denied",
      principalType: "lender",
      principalIdentifier: session.userId,
      headers: request.headers,
      reasonCode: "inactive_or_missing_lender",
    });
    return loginErrorResponse(request, NO_LENDER_PROFILE);
  }

  try {
    const response = NextResponse.redirect(safeFixedUrl(request, "/dashboard/lender"), 303);
    response.cookies.set(AUTH_SESSION_COOKIE, session.secret, {
      ...AUTH_SESSION_COOKIE_OPTIONS,
      expires: new Date(session.expire),
    });
    clearOAuthState(response);
    await recordSecurityEvent({
      eventType: "google_login_success",
      outcome: "success",
      principalType: "lender",
      principalIdentifier: session.userId,
      lenderId: lender.$id,
      headers: request.headers,
    });
    return response;
  } catch {
    await revokeAppwriteSessionBestEffort(session);
    await recordSecurityEvent({
      eventType: "google_login_error",
      outcome: "error",
      principalType: "lender",
      principalIdentifier: session.userId,
      lenderId: lender.$id,
      headers: request.headers,
      reasonCode: "session_storage_failed",
    });
    return unavailableResponse(request);
  }
}

function isValidCallbackCredential(
  value: string | null,
  maximumLength: number,
): value is string {
  return Boolean(value && value.length <= maximumLength);
}

function isValidExpiry(expiry: string) {
  return Number.isFinite(new Date(expiry).getTime());
}

function isRejectedOAuthCallback(error: unknown) {
  return error instanceof AppwriteException && error.code >= 400 && error.code < 500;
}

function loginErrorResponse(request: NextRequest, message: string) {
  const loginUrl = safeFixedUrl(request, "/auth/login");
  loginUrl.searchParams.set("status", "error");
  loginUrl.searchParams.set("message", message);
  const response = NextResponse.redirect(loginUrl, 303);
  clearOAuthState(response);
  return response;
}

function unavailableResponse(request: NextRequest) {
  const response = NextResponse.redirect(
    safeFixedUrl(request, "/auth/unavailable"),
    303,
  );
  clearOAuthState(response);
  return response;
}

function safeFixedUrl(request: NextRequest, path: string) {
  try {
    return getFixedAuthUrl(path);
  } catch {
    return new URL(path, request.url);
  }
}

function clearOAuthState(response: NextResponseType) {
  response.cookies.set(LENDER_OAUTH_STATE_COOKIE, "", {
    ...LENDER_OAUTH_STATE_COOKIE_OPTIONS,
    expires: new Date(0),
    maxAge: 0,
  });
}
