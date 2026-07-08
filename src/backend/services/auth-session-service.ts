import "server-only";

import { cookies } from "next/headers";
import { createAccountClient } from "@/backend/appwrite/server-client";

export const AUTH_SESSION_COOKIE = "mortgagepro_session";

export async function getAuthSessionSecret() {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_SESSION_COOKIE)?.value ?? "";
}

export async function setAuthSessionSecret(secret: string, expires?: string) {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_SESSION_COOKIE, secret, {
    expires: expires ? new Date(expires) : undefined,
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearAuthSession() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_SESSION_COOKIE);
}

export async function getCurrentAppwriteUser() {
  const session = await getAuthSessionSecret();

  if (!session) {
    return null;
  }

  try {
    return await createAccountClient(session).get();
  } catch {
    await clearAuthSession();
    return null;
  }
}
