import { OAuthProvider } from "node-appwrite";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createAdminAccountClient } from "@/backend/appwrite/server-client";
import {
  createLenderOAuthState,
  getLenderGoogleOAuthUrls,
  LENDER_OAUTH_STATE_COOKIE,
  LENDER_OAUTH_STATE_COOKIE_OPTIONS,
} from "@/backend/services/lender-google-oauth-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
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
  } catch {
    return NextResponse.redirect(new URL("/auth/unavailable", request.url), 303);
  }
}
