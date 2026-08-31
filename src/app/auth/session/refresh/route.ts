import { AppwriteException } from "node-appwrite";
import { NextResponse } from "next/server";
import { createAccountClient } from "@/backend/appwrite/server-client";
import {
  clearAuthSession,
  getAuthSessionSecret,
  setAuthSessionSecret,
} from "@/backend/services/auth-session-service";
import { resolvePrimaryLender } from "@/backend/services/lender-service";

export async function POST() {
  const lenderAuth = await resolvePrimaryLender();

  if (lenderAuth.status === "unavailable") {
    return sessionResponse({ status: "unavailable" }, 503);
  }

  if (lenderAuth.status !== "authenticated") {
    if (lenderAuth.status !== "anonymous") {
      await clearAuthSession();
    }
    return sessionResponse({ status: lenderAuth.status }, 401);
  }

  const secret = await getAuthSessionSecret();

  if (!secret) {
    return sessionResponse({ status: "anonymous" }, 401);
  }

  try {
    const session = await createAccountClient(secret).updateSession({
      sessionId: "current",
    });

    if (!isValidExpiry(session.expire)) {
      return sessionResponse({ status: "unavailable" }, 503);
    }

    await setAuthSessionSecret(session.secret || secret, session.expire);
    return sessionResponse({ status: "refreshed" });
  } catch (error) {
    if (error instanceof AppwriteException && error.code === 401) {
      await clearAuthSession();
      return sessionResponse({ status: "invalid" }, 401);
    }

    return sessionResponse({ status: "unavailable" }, 503);
  }
}

function isValidExpiry(value: string) {
  return Number.isFinite(new Date(value).getTime());
}

function sessionResponse(body: { status: string }, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
