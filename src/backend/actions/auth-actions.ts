"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { appwriteServerConfig } from "@/backend/appwrite/config";
import {
  createAccountClient,
  databases,
  ID,
  Query,
  users,
} from "@/backend/appwrite/server-client";
import {
  clearAuthSession,
  getAuthSessionSecret,
  setAuthSessionSecret,
} from "@/backend/services/auth-session-service";
import { AuthController } from "@/backend/modules/auth/controller";

const authController = new AuthController();

export async function loginAction(formData: FormData) {
  const result = authController.login(formDataToRecord(formData));

  if (!result.ok || !result.data) {
    redirectWithAuthStatus("/auth/login", "error", result.error ?? "Login failed.");
  }

  let session;

  try {
    session = await createAccountClient().createEmailPasswordSession({
      email: result.data.email,
      password: result.data.password,
    });
  } catch {
    redirectWithAuthStatus(
      "/auth/login",
      "error",
      "Email or password is incorrect.",
    );
  }

  const lender = await findLenderByAppwriteUserId(session.userId);

  if (!lender) {
    await clearAuthSession();
    redirectWithAuthStatus(
      "/auth/login",
      "error",
      "No active lender profile is linked to this account.",
    );
  }

  await setAuthSessionSecret(session.secret, session.expire);
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

    const session = await createAccountClient().createEmailPasswordSession({
      email: result.data.email,
      password,
    });
    await setAuthSessionSecret(session.secret, session.expire);
  } catch (error) {
    redirectWithAuthStatus(
      "/auth/register",
      "error",
      getAppwriteMessage(error, "Could not create lender account."),
    );
  }

  revalidatePath("/dashboard/lender");
  redirect("/dashboard/lender");
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

  try {
    await createAccountClient().createRecovery({
      email: result.data.email,
      url: `${await getRequestOrigin()}/auth/password-reset`,
    });
  } catch {
    // Keep the same user-facing response so the page does not reveal accounts.
  }

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

async function findLenderByAppwriteUserId(appwriteUserId: string) {
  const lenders = await databases.listDocuments({
    databaseId: appwriteServerConfig.databaseId,
    collectionId: appwriteServerConfig.collections.lenders,
    queries: [
      Query.equal("appwrite_user_id", appwriteUserId),
      Query.equal("status", "active"),
      Query.limit(1),
      Query.select(["$id"]),
    ],
  });

  return lenders.documents[0] ?? null;
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
