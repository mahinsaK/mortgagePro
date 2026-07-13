import "server-only";

import { AppwriteException, type Models } from "node-appwrite";
import { cookies } from "next/headers";
import { createAccountClient } from "@/backend/appwrite/server-client";

export const AUTH_SESSION_COOKIE = "mortgagepro_session";

export const AUTH_SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

export type AppwriteSessionResolution =
  | { status: "anonymous" }
  | { status: "invalid" }
  | { status: "unavailable" }
  | {
      status: "authenticated";
      user: Models.User<Models.DefaultPreferences>;
    };

export async function getAuthSessionSecret() {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_SESSION_COOKIE)?.value ?? "";
}

export async function setAuthSessionSecret(secret: string, expires?: string) {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_SESSION_COOKIE, secret, {
    ...AUTH_SESSION_COOKIE_OPTIONS,
    expires: expires ? new Date(expires) : undefined,
  });
}

export async function clearAuthSession() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_SESSION_COOKIE);
}

export async function resolveAppwriteSession(): Promise<AppwriteSessionResolution> {
  const session = await getAuthSessionSecret();

  if (!session) {
    return { status: "anonymous" };
  }

  try {
    const user = await createAccountClient(session).get();
    return { status: "authenticated", user };
  } catch (error) {
    if (error instanceof AppwriteException && error.code === 401) {
      return { status: "invalid" };
    }

    return { status: "unavailable" };
  }
}

export async function getCurrentAppwriteUser() {
  const result = await resolveAppwriteSession();

  if (result.status === "authenticated") {
    return result.user;
  }

  if (result.status === "unavailable") {
    throw new AuthenticationServiceUnavailableError();
  }

  return null;
}

export class AuthenticationServiceUnavailableError extends Error {
  constructor() {
    super("Authentication service is temporarily unavailable.");
    this.name = "AuthenticationServiceUnavailableError";
  }
}
