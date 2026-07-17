"use server";

import { revalidatePath } from "next/cache";
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

export async function collectorLoginAction(formData: FormData) {
  const collectorId = readRequired(formData, "username");
  const password = readRequired(formData, "password");
  const collectors = await databases.listDocuments({
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
  const collector = collectors.documents[0];

  if (
    !collector ||
    !verifyCollectorPassword(password, String(collector.password_hash ?? ""))
  ) {
    redirectWithStatus(
      "/collector/login",
      "error",
      "Username or password is incorrect.",
    );
  }

  await setCollectorSession({
    collectorId: collector.$id,
    lenderId: String(collector.lender_id ?? ""),
    name: String(collector.name ?? collectorId),
    passwordHash: String(collector.password_hash ?? ""),
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
      : "Payment collected successfully.",
  );
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
