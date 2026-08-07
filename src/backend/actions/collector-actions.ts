"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { appwriteServerConfig } from "@/backend/appwrite/config";
import { databases, Query } from "@/backend/appwrite/server-client";
import {
  clearCollectorSession,
  requireActiveCollectorPrincipal,
  setCollectorSession,
  verifyCollectorPassword,
} from "@/backend/services/collector-auth-service";
import {
  PaymentWriteError,
  recordTenantLoanPayment,
} from "@/backend/services/payment-recording-service";
import {
  sendAutomaticPaymentSms,
  type AutomaticPaymentSmsResult,
} from "@/backend/services/payment-sms-service";
import {
  clearAuthenticationIdentityLimit,
  consumeAuthenticationAttempt,
  RATE_LIMITED_MESSAGE,
} from "@/backend/services/authentication-rate-limit-service";
import { recordSecurityEvent } from "@/backend/services/security-event-service";

export async function collectorLoginAction(formData: FormData) {
  const collectorId = readRequired(formData, "username");
  const password = readRequired(formData, "password");
  const requestHeaders = await headers();
  let rateLimit;

  try {
    rateLimit = await consumeAuthenticationAttempt({
      flow: "collector_login",
      identity: collectorId,
      headers: requestHeaders,
    });
  } catch {
    await recordSecurityEvent({
      eventType: "collector_login_error",
      outcome: "error",
      principalType: "collector",
      principalIdentifier: collectorId,
      headers: requestHeaders,
      reasonCode: "rate_limit_unavailable",
    });
    redirect("/auth/unavailable");
  }

  if (!rateLimit.allowed) {
    await recordSecurityEvent({
      eventType: "collector_login_blocked",
      outcome: "blocked",
      principalType: "collector",
      principalIdentifier: collectorId,
      headers: requestHeaders,
      reasonCode: "rate_limit",
    });
    redirectWithStatus(
      "/collector/login",
      "error",
      RATE_LIMITED_MESSAGE,
    );
  }

  let collectors;

  try {
    collectors = await databases.listDocuments({
      databaseId: appwriteServerConfig.databaseId,
      collectionId: appwriteServerConfig.collections.collectors,
      queries: [
        Query.equal("$id", collectorId),
        Query.equal("status", "active"),
        Query.limit(1),
        Query.select([
          "$id",
          "lender_id",
          "name",
          "password_hash",
        ]),
      ],
    });
  } catch {
    await recordSecurityEvent({
      eventType: "collector_login_error",
      outcome: "error",
      principalType: "collector",
      principalIdentifier: collectorId,
      headers: requestHeaders,
      reasonCode: "collector_lookup_unavailable",
    });
    redirect("/auth/unavailable");
  }
  const collector = collectors.documents[0];

  if (
    !collector ||
    !verifyCollectorPassword(password, String(collector.password_hash ?? ""))
  ) {
    await recordSecurityEvent({
      eventType: "collector_login_failure",
      outcome: "failure",
      principalType: "collector",
      principalIdentifier: collectorId,
      headers: requestHeaders,
      reasonCode: "invalid_credentials",
    });
    redirectWithStatus(
      "/collector/login",
      "error",
      "Username or password is incorrect.",
    );
  }

  try {
    await setCollectorSession({
      collectorId: collector.$id,
      lenderId: String(collector.lender_id ?? ""),
      name: String(collector.name ?? collectorId),
      passwordHash: String(collector.password_hash ?? ""),
    });
  } catch {
    await recordSecurityEvent({
      eventType: "collector_login_error",
      outcome: "error",
      principalType: "collector",
      principalIdentifier: collectorId,
      lenderId: String(collector.lender_id ?? ""),
      headers: requestHeaders,
      reasonCode: "session_storage_failed",
    });
    redirect("/auth/unavailable");
  }
  await clearAuthenticationIdentityLimit("collector_login", collectorId);
  await recordSecurityEvent({
    eventType: "collector_login_success",
    outcome: "success",
    principalType: "collector",
    principalIdentifier: collectorId,
    lenderId: String(collector.lender_id ?? ""),
    headers: requestHeaders,
  });
  redirect("/collector/scan");
}

export async function collectScannedPaymentAction(formData: FormData) {
  const session = await requireActiveCollectorPrincipal();

  if (!session) {
    redirect("/collector/login");
  }

  const loanId = readRequired(formData, "loan_id");
  const amount = Number(readRequired(formData, "amount"));
  const requestId = String(formData.get("payment_request_id") ?? "").trim();

  if (!Number.isFinite(amount) || amount <= 0) {
    redirectWithStatus(
      `/collector/scan?loan=${encodeURIComponent(loanId)}`,
      "error",
      "Amount must be greater than zero.",
    );
  }

  let duplicate = false;
  let automaticSms: AutomaticPaymentSmsResult = { status: "disabled" };

  try {
    const result = await recordTenantLoanPayment({
      lenderId: session.lenderId,
      loanId,
      collectorId: session.collectorId,
      date: new Date().toISOString().slice(0, 10),
      amount,
      method: "cash",
      requestId,
    });
    duplicate = result.duplicate;
    if (!result.duplicate) {
      automaticSms = await sendAutomaticPaymentSms({
        lenderId: session.lenderId,
        loanId: result.loanId,
        paymentId: result.paymentId,
        amount,
        remainingAmount: result.remainingAmount,
        recordedAt: result.recordedAt,
      });
    }
  } catch (error) {
    redirectWithStatus(
      `/collector/scan?loan=${encodeURIComponent(loanId)}`,
      "error",
      error instanceof PaymentWriteError
        ? error.message
        : "Payment collection failed. Please try again.",
    );
  }

  revalidatePath("/payments");
  revalidatePath("/dashboard/lender");
  redirectWithStatus(
    "/collector/scan",
    "success",
    duplicate
      ? "This payment was already recorded. No duplicate was added."
      : paymentSuccessMessage(automaticSms),
  );
}

function paymentSuccessMessage(result: AutomaticPaymentSmsResult) {
  if (result.status === "sent") {
    return "Payment collected successfully. The receipt SMS was sent.";
  }

  if (result.status === "skipped" && result.reason === "missing_phone") {
    return "Payment collected successfully. The automatic SMS was skipped because the borrower has no usable phone number.";
  }

  if (result.status === "failed") {
    return "Payment collected successfully, but the automatic SMS could not be sent.";
  }

  return "Payment collected successfully.";
}

export async function collectorLogoutAction() {
  await clearCollectorSession();
  redirect("/collector/login");
}

function readRequired(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    throw new Error(`${key} is required.`);
  }

  return value;
}

function redirectWithStatus(
  path: string,
  status: "error" | "success",
  message: string,
): never {
  const separator = path.includes("?") ? "&" : "?";
  redirect(
    `${path}${separator}status=${status}&message=${encodeURIComponent(message)}`,
  );
}
