import "server-only";

import { appwriteServerConfig } from "@/backend/appwrite/config";
import { databases, Query } from "@/backend/appwrite/server-client";
import { formatMoney } from "@/backend/lib/currency";
import { renderPaymentSmsTemplate } from "@/backend/modules/sms/policy";
import { listTenantDocuments } from "./tenant-data-service";
import { sendTenantSmsBatch } from "./sms-sending-service";

export type AutomaticPaymentSmsResult = {
  status: "disabled" | "failed" | "sent" | "skipped";
  reason?: "invalid_configuration" | "missing_phone" | "send_failed";
};

export async function sendAutomaticPaymentSms(input: {
  lenderId: string;
  loanId: string;
  paymentId: string;
  amount: number;
  remainingAmount: number;
  recordedAt: string;
}): Promise<AutomaticPaymentSmsResult> {
  let account;
  try {
    account = await getSmsAccount(input.lenderId);
  } catch {
    return { status: "failed", reason: "send_failed" };
  }

  if (!account || account.payment_sms_enabled !== true) {
    return { status: "disabled" };
  }

  const templateId = String(account.payment_sms_template_id ?? "");
  if (!templateId) {
    return { status: "failed", reason: "invalid_configuration" };
  }

  try {
    const loanResult = await listTenantDocuments("loans", input.lenderId, [
      Query.equal("$id", input.loanId),
      Query.limit(1),
      Query.select(["$id", "borrower_id"]),
    ]);
    const loan = loanResult.documents[0];

    if (!loan) {
      return { status: "failed", reason: "invalid_configuration" };
    }

    const borrowerId = String(loan.borrower_id ?? "");
    const [borrowerResult, lenderResult, templateResult] = await Promise.all([
      listTenantDocuments("borrowers", input.lenderId, [
        Query.equal("$id", borrowerId),
        Query.limit(1),
        Query.select(["$id", "name", "contact"]),
      ]),
      databases.listDocuments({
        databaseId: appwriteServerConfig.databaseId,
        collectionId: appwriteServerConfig.collections.lenders,
        queries: [
          Query.equal("$id", input.lenderId),
          Query.equal("status", "active"),
          Query.limit(1),
          Query.select(["$id", "company_name", "currency"]),
        ],
      }),
      listTenantDocuments("smsTemplates", input.lenderId, [
        Query.equal("$id", templateId),
        Query.limit(1),
        Query.select(["$id", "message"]),
      ]),
    ]);
    const borrower = borrowerResult.documents[0];
    const lender = lenderResult.documents[0];
    const template = templateResult.documents[0];

    if (!borrower || !lender || !template) {
      return { status: "failed", reason: "invalid_configuration" };
    }

    const phoneNumber = String(borrower.contact ?? "");
    const phoneDigits = phoneNumber.replace(/\D/g, "");
    if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      return { status: "skipped", reason: "missing_phone" };
    }

    const currency = String(lender.currency ?? "USD");
    const message = renderPaymentSmsTemplate(String(template.message ?? ""), {
      amount: formatMoney(input.amount, currency),
      borrowerName: String(borrower.name ?? "Borrower"),
      companyName: String(lender.company_name ?? "MortgagePro"),
      paymentDate: formatPaymentDate(input.recordedAt),
      remainingBalance: formatMoney(input.remainingAmount, currency),
    });
    const result = await sendTenantSmsBatch({
      lenderId: input.lenderId,
      message,
      phoneNumbers: [phoneNumber],
      purpose: "payment_receipt",
      requestId: `receipt_${input.paymentId}`,
    });

    return result.sentRecipients > 0
      ? { status: "sent" }
      : { status: "failed", reason: "send_failed" };
  } catch {
    return { status: "failed", reason: "send_failed" };
  }
}

async function getSmsAccount(lenderId: string) {
  try {
    const account = await databases.getDocument({
      databaseId: appwriteServerConfig.databaseId,
      collectionId: appwriteServerConfig.collections.smsAccounts,
      documentId: lenderId,
      queries: [
        Query.select([
          "$id",
          "lender_id",
          "payment_sms_enabled",
          "payment_sms_template_id",
        ]),
      ],
    });

    return String(account.lender_id ?? "") === lenderId ? account : null;
  } catch (error) {
    if (errorCode(error) === 404) return null;
    throw error;
  }
}

function formatPaymentDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Colombo",
  }).format(date);
}

function errorCode(error: unknown) {
  return typeof error === "object" && error && "code" in error
    ? Number(error.code)
    : 0;
}
