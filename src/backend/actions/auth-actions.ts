"use server";

import { AppwriteException, type Models } from "node-appwrite";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  createAccountClient,
  createAdminAccountClient,
  databases,
  ID,
  users,
} from "@/backend/appwrite/server-client";
import {
  clearAuthSession,
  getAuthSessionSecret,
  setAuthSessionSecret,
} from "@/backend/services/auth-session-service";
import { AuthController } from "@/backend/modules/auth/controller";
import {
  findActiveLenderByAppwriteUserId,
  revokeAppwriteSessionBestEffort,
} from "@/backend/services/lender-login-service";
import {
  clearAuthenticationIdentityLimit,
  consumeAuthenticationAttempt,
  RATE_LIMITED_MESSAGE,
} from "@/backend/services/authentication-rate-limit-service";
import { recordSecurityEvent } from "@/backend/services/security-event-service";
import { appwriteServerConfig } from "@/backend/appwrite/config";

const authController = new AuthController();

export async function loginAction(formData: FormData) {
  const result = authController.login(formDataToRecord(formData));

  if (!result.ok || !result.data) {
    redirectWithAuthStatus("/auth/login", "error", result.error ?? "Login failed.");
  }

  const requestHeaders = await headers();
  let rateLimit;

  try {
    rateLimit = await consumeAuthenticationAttempt({
      flow: "lender_login",
      identity: result.data.email,
      headers: requestHeaders,
    });
  } catch {
    await recordSecurityEvent({
      eventType: "lender_login_error",
      outcome: "error",
      principalType: "lender",
      principalIdentifier: result.data.email,
      headers: requestHeaders,
      reasonCode: "rate_limit_unavailable",
    });
    redirect("/auth/unavailable");
  }

  if (!rateLimit.allowed) {
    await recordSecurityEvent({
      eventType: "lender_login_blocked",
      outcome: "blocked",
      principalType: "lender",
      principalIdentifier: result.data.email,
      headers: requestHeaders,
      reasonCode: "rate_limit",
    });
    redirectWithAuthStatus("/auth/login", "error", RATE_LIMITED_MESSAGE);
  }

  let session: Models.Session;

  try {
    session = await createAdminAccountClient().createEmailPasswordSession({
      email: result.data.email,
      password: result.data.password,
    });
  } catch (error) {
    if (!isRejectedLogin(error)) {
      await recordSecurityEvent({
        eventType: "lender_login_error",
        outcome: "error",
        principalType: "lender",
        principalIdentifier: result.data.email,
        headers: requestHeaders,
        reasonCode: "authentication_unavailable",
      });
      redirect("/auth/unavailable");
    }

    await recordSecurityEvent({
      eventType: "lender_login_failure",
      outcome: "failure",
      principalType: "lender",
      principalIdentifier: result.data.email,
      headers: requestHeaders,
      reasonCode: "invalid_credentials",
    });
    redirectWithAuthStatus(
      "/auth/login",
      "error",
      "Email or password is incorrect.",
    );
  }

  if (!session.secret) {
    await revokeAppwriteSessionBestEffort(session);
    await recordSecurityEvent({
      eventType: "lender_login_error",
      outcome: "error",
      principalType: "lender",
      principalIdentifier: result.data.email,
      headers: requestHeaders,
      reasonCode: "missing_session_secret",
    });
    redirect("/auth/unavailable");
  }

  let lender;

  try {
    lender = await findActiveLenderByAppwriteUserId(session.userId);
  } catch {
    await revokeAppwriteSessionBestEffort(session);
    await recordSecurityEvent({
      eventType: "lender_login_error",
      outcome: "error",
      principalType: "lender",
      principalIdentifier: result.data.email,
      headers: requestHeaders,
      reasonCode: "lender_lookup_unavailable",
    });
    redirect("/auth/unavailable");
  }

  if (!lender) {
    await revokeAppwriteSessionBestEffort(session);
    await recordSecurityEvent({
      eventType: "lender_login_denied",
      outcome: "denied",
      principalType: "lender",
      principalIdentifier: result.data.email,
      headers: requestHeaders,
      reasonCode: "inactive_or_missing_lender",
    });
    redirectWithAuthStatus(
      "/auth/login",
      "error",
      "No active lender profile is linked to this account.",
    );
  }

  try {
    await setAuthSessionSecret(session.secret, session.expire);
  } catch {
    await revokeAppwriteSessionBestEffort(session);
    await recordSecurityEvent({
      eventType: "lender_login_error",
      outcome: "error",
      principalType: "lender",
      principalIdentifier: result.data.email,
      headers: requestHeaders,
      reasonCode: "session_storage_failed",
    });
    redirect("/auth/unavailable");
  }

  await clearAuthenticationIdentityLimit("lender_login", result.data.email);
  await recordSecurityEvent({
    eventType: "lender_login_success",
    outcome: "success",
    principalType: "lender",
    principalIdentifier: result.data.email,
    lenderId: lender.$id,
    headers: requestHeaders,
  });

  redirect("/dashboard/lender");
}

export async function registerLenderAction(formData: FormData) {
  const result = authController.registerLender(formDataToRecord(formData));

  if (!result.ok || !result.data) {
    redirectWithAuthStatus(
      "/auth/register",
      "error",
      result.error ?? "Registration failed.",
    );
  }

  const password = result.data.password;
  const confirmPassword = readRequired(formData, "confirmPassword");

  if (password.length < 8) {
    redirectWithAuthStatus(
      "/auth/register",
      "error",
      "Password must be at least 8 characters.",
    );
  }

  if (password !== confirmPassword) {
    redirectWithAuthStatus(
      "/auth/register",
      "error",
      "Password and confirmation do not match.",
    );
  }

  const requestHeaders = await headers();
  let rateLimit;

  try {
    rateLimit = await consumeAuthenticationAttempt({
      flow: "registration",
      headers: requestHeaders,
    });
  } catch {
    await recordSecurityEvent({
      eventType: "lender_registration_error",
      outcome: "error",
      principalType: "anonymous",
      principalIdentifier: result.data.email,
      headers: requestHeaders,
      reasonCode: "rate_limit_unavailable",
    });
    redirect("/auth/unavailable");
  }

  if (!rateLimit.allowed) {
    await recordSecurityEvent({
      eventType: "lender_registration_blocked",
      outcome: "blocked",
      principalType: "anonymous",
      principalIdentifier: result.data.email,
      headers: requestHeaders,
      reasonCode: "rate_limit",
    });
    redirectWithAuthStatus("/auth/register", "error", RATE_LIMITED_MESSAGE);
  }

  try {
    const user = await users.create({
      userId: ID.unique(),
      email: result.data.email,
      password,
      name: result.data.companyName,
    });

    await databases.createDocument({
      databaseId: appwriteServerConfig.databaseId,
      collectionId: appwriteServerConfig.collections.lenders,
      documentId: ID.unique(),
      data: {
        appwrite_user_id: user.$id,
        company_name: result.data.companyName,
        email: result.data.email,
        contact_info: JSON.stringify({
          phone: readOptional(formData, "phone"),
          address: readOptional(formData, "address"),
        }),
        status: "active",
        currency: "USD",
        created_at: new Date().toISOString(),
      },
    });

    await createAndStoreServerSession(user.$id);
  } catch (error) {
    redirectWithAuthStatus(
      "/auth/register",
      "error",
      getAppwriteMessage(error, "Could not create lender account."),
    );
  }

  await recordSecurityEvent({
    eventType: "lender_registration_success",
    outcome: "success",
    principalType: "lender",
    principalIdentifier: result.data.email,
    headers: requestHeaders,
  });
  revalidatePath("/dashboard/lender");
  redirect("/dashboard/lender");
}

async function createAndStoreServerSession(userId: string) {
  const session = await users.createSession({ userId });

  if (!session.secret) {
    await revokeAppwriteSessionBestEffort(session);
    throw new Error("Could not create an Appwrite server session.");
  }

  try {
    await setAuthSessionSecret(session.secret, session.expire);
  } catch (error) {
    await revokeAppwriteSessionBestEffort(session);
    throw error;
  }
}

export async function requestPasswordResetAction(formData: FormData) {
  const result = authController.requestPasswordReset(formDataToRecord(formData));

  if (!result.ok || !result.data) {
    redirectWithAuthStatus(
      "/auth/password-reset",
      "error",
      result.error ?? "Password reset failed.",
    );
  }

  const requestHeaders = await headers();
  let rateLimit;

  try {
    rateLimit = await consumeAuthenticationAttempt({
      flow: "password_reset",
      identity: result.data.email,
      headers: requestHeaders,
    });
  } catch {
    await recordSecurityEvent({
      eventType: "password_reset_error",
      outcome: "error",
      principalType: "anonymous",
      principalIdentifier: result.data.email,
      headers: requestHeaders,
      reasonCode: "rate_limit_unavailable",
    });
    redirect("/auth/unavailable");
  }

  if (!rateLimit.allowed) {
    await recordSecurityEvent({
      eventType: "password_reset_blocked",
      outcome: "blocked",
      principalType: "anonymous",
      principalIdentifier: result.data.email,
      headers: requestHeaders,
      reasonCode: "rate_limit",
    });
    redirectWithAuthStatus(
      "/auth/password-reset",
      "success",
      "If that email exists, a reset link has been sent.",
    );
  }

  try {
    await createAccountClient().createRecovery({
      email: result.data.email,
      url: `${await getRequestOrigin()}/auth/password-reset`,
    });
  } catch {
    // Keep the same user-facing response so the page does not reveal accounts.
  }

  await recordSecurityEvent({
    eventType: "password_reset_requested",
    outcome: "success",
    principalType: "anonymous",
    principalIdentifier: result.data.email,
    headers: requestHeaders,
  });

  redirectWithAuthStatus(
    "/auth/password-reset",
    "success",
    "If that email exists, a reset link has been sent.",
  );
}

export async function completePasswordResetAction(formData: FormData) {
  const userId = readRequired(formData, "userId");
  const secret = readRequired(formData, "secret");
  const password = readRequired(formData, "password");
  const confirmPassword = readRequired(formData, "confirmPassword");

  if (password.length < 8) {
    redirectWithAuthStatus(
      `/auth/password-reset?userId=${encodeURIComponent(userId)}&secret=${encodeURIComponent(secret)}`,
      "error",
      "Password must be at least 8 characters.",
    );
  }

  if (password !== confirmPassword) {
    redirectWithAuthStatus(
      `/auth/password-reset?userId=${encodeURIComponent(userId)}&secret=${encodeURIComponent(secret)}`,
      "error",
      "Password and confirmation do not match.",
    );
  }

  try {
    await createAccountClient().updateRecovery({
      userId,
      secret,
      password,
    });
  } catch (error) {
    redirectWithAuthStatus(
      "/auth/password-reset",
      "error",
      getAppwriteMessage(error, "Could not reset password."),
    );
  }

  redirectWithAuthStatus(
    "/auth/login",
    "success",
    "Password updated. Sign in with your new password.",
  );
}

export async function logoutAction() {
  const session = await getAuthSessionSecret();

  if (session) {
    try {
      await createAccountClient(session).deleteSession({ sessionId: "current" });
    } catch {
      // The cookie still needs to be removed if Appwrite already expired it.
    }
  }

  await clearAuthSession();
  redirect("/auth/login");
}

function formDataToRecord(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function readRequired(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    throw new Error(`${key} is required.`);
  }

  return value;
}

function readOptional(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

async function getRequestOrigin() {
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = headersList.get("x-forwarded-proto") ?? "http";
  return `${protocol}://${host}`;
}

function redirectWithAuthStatus(
  path: string,
  status: "error" | "success",
  message: string,
): never {
  const separator = path.includes("?") ? "&" : "?";
  redirect(
    `${path}${separator}status=${status}&message=${encodeURIComponent(message)}`,
  );
}

function getAppwriteMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function isRejectedLogin(error: unknown) {
  return (
    error instanceof AppwriteException &&
    error.code === 401 &&
    ["user_invalid_credentials", "user_blocked", "user_unauthorized"].includes(
      error.type,
    )
  );
}
