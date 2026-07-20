import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  getFixedAuthUrl,
  LENDER_OAUTH_STATE_COOKIE,
  LENDER_OAUTH_STATE_COOKIE_OPTIONS,
} from "@/backend/services/lender-google-oauth-service";

const GOOGLE_LOGIN_FAILED = "Google sign-in was cancelled or failed.";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  let loginUrl: URL;

  try {
    loginUrl = getFixedAuthUrl("/auth/login");
  } catch {
    loginUrl = new URL("/auth/login", request.url);
  }

  loginUrl.searchParams.set("status", "error");
  loginUrl.searchParams.set("message", GOOGLE_LOGIN_FAILED);

  const response = NextResponse.redirect(loginUrl, 303);
  response.cookies.set(LENDER_OAUTH_STATE_COOKIE, "", {
    ...LENDER_OAUTH_STATE_COOKIE_OPTIONS,
    expires: new Date(0),
    maxAge: 0,
  });
  return response;
}
