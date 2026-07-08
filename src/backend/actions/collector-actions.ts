"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { appwriteServerConfig } from "@/backend/appwrite/config";
import { databases, Query } from "@/backend/appwrite/server-client";
import { PaymentController } from "@/backend/modules/payments/controller";
import { PaymentService } from "@/backend/modules/payments/service";
import {
  clearCollectorSession,
  getCollectorSession,
  setCollectorSession,
  verifyCollectorPassword,
} from "@/backend/services/collector-auth-service";

export async function collectorLoginAction(formData: FormData) {
  const name = readRequired(formData, "name");
  const password = readRequired(formData, "password");
  const collectors = await databases.listDocuments({
    databaseId: appwriteServerConfig.databaseId,
    collectionId: appwriteServerConfig.collections.collectors,
    queries: [
      Query.equal("name", name),
      Query.equal("status", "active"),
      Query.limit(20),
      Query.select(["$id", "lender_id", "name", "password_hash"]),
    ],
  });
  const collector = collectors.documents.find((document) =>
    verifyCollectorPassword(password, String(document.password_hash ?? "")),
  );

  if (!collector) {
    redirectWithStatus(
      "/collector/login",
      "error",
      "Collector name or password is incorrect.",
    );
  }

  await setCollectorSession({
    collectorId: collector.$id,
    lenderId: String(collector.lender_id ?? ""),
    name: String(collector.name ?? name),
  });
  redirect("/collector/scan");
}

export async function collectScannedPaymentAction(formData: FormData) {
  const session = await getCollectorSession();

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
    databases.listDocuments({
      databaseId: appwriteServerConfig.databaseId,
      collectionId: appwriteServerConfig.collections.loans,
      queries: [
        Query.equal("$id", loanId),
        Query.limit(1),
        Query.select(["$id", "lender_id", "amount", "total_paid", "status"]),
      ],
    }),
    databases.listDocuments({
      databaseId: appwriteServerConfig.databaseId,
      collectionId: appwriteServerConfig.collections.collectors,
      queries: [
        Query.equal("$id", session.collectorId),
        Query.equal("lender_id", session.lenderId),
        Query.equal("status", "active"),
        Query.limit(1),
        Query.select(["$id", "lender_id"]),
      ],
    }),
  ]);
  const loan = loanResult.documents[0];
  const collector = collectorResult.documents[0];

  if (!loan) {
    redirectWithStatus("/collector/scan", "error", "That QR code is not a valid loan.");
  }

  if (!collector || String(loan.lender_id ?? "") !== session.lenderId) {
    redirectWithStatus(
      "/collector/scan",
      "error",
      "You cannot collect this payment because this collector is not registered for that lender.",
    );
  }

  const paymentResult = new PaymentController().record({
    lenderId: session.lenderId,
    loanId,
    loanLenderId: String(loan.lender_id ?? ""),
    collectorId: session.collectorId,
    collectorLenderId: String(collector.lender_id ?? ""),
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

  await databases.createDocument({
    databaseId: appwriteServerConfig.databaseId,
    collectionId: appwriteServerConfig.collections.payments,
    documentId: paymentId,
    data: paymentResult.data,
  });
  await databases.updateDocument({
    databaseId: appwriteServerConfig.databaseId,
    collectionId: appwriteServerConfig.collections.loans,
    documentId: loanId,
    data: {
      total_paid: totals.totalPaid,
      remaining_amount: totals.remainingAmount,
      status: totals.status,
    },
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
