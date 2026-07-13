"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { appwriteServerConfig } from "@/backend/appwrite/config";
import { databases, Query } from "@/backend/appwrite/server-client";
import { PaymentController } from "@/backend/modules/payments/controller";
import { PaymentService } from "@/backend/modules/payments/service";
import {
  clearCollectorSession,
  requireActiveCollectorPrincipal,
  setCollectorSession,
  verifyCollectorPassword,
} from "@/backend/services/collector-auth-service";
import {
  createTenantDocument,
  getTenantDocument,
  updateTenantDocument,
} from "@/backend/services/tenant-data-service";

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

  if (!Number.isFinite(amount) || amount <= 0) {
    redirectWithStatus(
      `/collector/scan?loan=${encodeURIComponent(loanId)}`,
      "error",
      "Amount must be greater than zero.",
    );
  }

  const [loanResult, collectorResult] = await Promise.all([
    getTenantDocument("loans", session.lenderId, loanId, [
      "$id",
      "amount",
      "total_paid",
      "status",
    ]),
    getTenantDocument("collectors", session.lenderId, session.collectorId, [
      "$id",
      "status",
    ]),
  ]);
  const loan = loanResult;
  const collector = collectorResult;

  if (!loan) {
    redirectWithStatus("/collector/scan", "error", "That QR code is not a valid loan.");
  }

  if (!collector || collector.status !== "active") {
    redirectWithStatus(
      "/collector/scan",
      "error",
      "You cannot collect this payment because this collector is not registered for that lender.",
    );
  }

  const paymentResult = new PaymentController().record({
    lenderId: session.lenderId,
    loanId,
    loanLenderId: session.lenderId,
    collectorId: session.collectorId,
    collectorLenderId: session.lenderId,
    date: new Date().toISOString().slice(0, 10),
    amount,
    method: "cash",
  });

  if (!paymentResult.ok || !paymentResult.data) {
    redirectWithStatus(
      `/collector/scan?loan=${encodeURIComponent(loanId)}`,
      "error",
      paymentResult.error ?? "Payment collection failed.",
    );
  }

  const paymentId = createDocumentId("payment");
  const totals = new PaymentService().calculateLoanTotals({
    loanAmount: Number(loan.amount ?? 0),
    currentTotalPaid: Number(loan.total_paid ?? 0),
    paymentAmount: amount,
    currentStatus: String(loan.status ?? "active"),
  });

  await createTenantDocument(
    "payments",
    session.lenderId,
    paymentId,
    paymentResult.data,
  );
  await updateTenantDocument("loans", session.lenderId, loanId, {
    total_paid: totals.totalPaid,
    remaining_amount: totals.remainingAmount,
    status: totals.status,
  });

  revalidatePath("/payments");
  revalidatePath("/dashboard/lender");
  redirectWithStatus("/collector/scan", "success", "Payment collected successfully.");
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

function createDocumentId(prefix: string) {
  const randomPart = crypto.randomUUID().replaceAll("-", "").slice(0, 22);
  return `${prefix}_${randomPart}`;
}
