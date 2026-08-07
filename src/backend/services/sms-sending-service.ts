import "server-only";

import { createHash } from "node:crypto";
import type { Models } from "node-appwrite";
import { appwriteServerConfig } from "@/backend/appwrite/config";
import { databases, Query } from "@/backend/appwrite/server-client";
import { normalizeSmsPhoneNumber, type SmsPurpose } from "@/backend/modules/sms/dto";
import {
  colomboMonthKey,
  previousSmsMonthKeys,
  smsCharacterCount,
  smsUnitsPerRecipient,
} from "@/backend/modules/sms/policy";
import { SmsService, type SmsProvider } from "@/backend/modules/sms/service";
import { TextlkSmsProvider } from "./textlk-sms-provider";

const MAX_TRANSACTION_ATTEMPTS = 3;
const SMS_SEND_BATCH_SIZE = 20;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;
type SmsDocument = Models.Document & Record<string, unknown>;

export type SmsSendBatchResult = {
  batchId: string;
  duplicate: boolean;
  failedRecipients: number;
  requestedRecipients: number;
  sentRecipients: number;
  status: "sent" | "partial" | "failed";
  usedUnits: number;
};

export type SmsUsageSummary = {
  month: string;
  quota: number;
  sentUnits: number;
  reservedUnits: number;
  remainingUnits: number;
  sentRecipients: number;
  failedRecipients: number;
  batchCount: number;
};

export type SmsBatchSummary = {
  id: string;
  senderId: string;
  month: string;
  characterCount: number;
  unitsPerRecipient: number;
  requestedRecipients: number;
  sentRecipients: number;
  failedRecipients: number;
  usedUnits: number;
  status: "processing" | "sent" | "partial" | "failed" | "review_required";
  createdAt: string;
  completedAt: string;
};

export class SmsSendingError extends Error {
  constructor(
    public readonly code:
      | "account_suspended"
      | "duplicate_processing"
      | "invalid_request"
      | "no_quota"
      | "no_sender"
      | "quota_exceeded"
      | "review_required"
      | "validation",
    message: string,
  ) {
    super(message);
    this.name = "SmsSendingError";
  }
}

export async function sendTenantSmsBatch(
  input: {
    lenderId: string;
    message: string;
    phoneNumbers: string[];
    purpose: SmsPurpose;
    requestId: string;
  },
  provider: SmsProvider = new TextlkSmsProvider(),
): Promise<SmsSendBatchResult> {
  validateRequestId(input.requestId);
  const message = input.message.trim();
  const unitsPerRecipient = smsUnitsPerRecipient(message);

  if (!unitsPerRecipient) {
    throw new SmsSendingError(
      "validation",
      "Message must contain 1 to 480 characters.",
    );
  }

  let phoneNumbers: string[];
  try {
    phoneNumbers = Array.from(
      new Set(input.phoneNumbers.map(normalizeSmsPhoneNumber)),
    );
  } catch (error) {
    throw new SmsSendingError(
      "validation",
      error instanceof Error ? error.message : "A phone number is invalid.",
    );
  }

  if (phoneNumbers.length === 0) {
    throw new SmsSendingError(
      "validation",
      "At least one phone number is required.",
    );
  }

  const month = colomboMonthKey();
  const batchId = documentId("sb", `${input.lenderId}:${input.requestId}`);
  const reservation = await reserveQuota({
    batchId,
    characterCount: smsCharacterCount(message),
    lenderId: input.lenderId,
    month,
    purpose: input.purpose,
    requestId: input.requestId,
    requestedRecipients: phoneNumbers.length,
    unitsPerRecipient,
  });

  if (reservation.duplicate) {
    return reservation.result;
  }

  const smsService = new SmsService(provider);
  const results: PromiseSettledResult<unknown>[] = [];

  for (let index = 0; index < phoneNumbers.length; index += SMS_SEND_BATCH_SIZE) {
    const batch = phoneNumbers.slice(index, index + SMS_SEND_BATCH_SIZE);
    const batchResults = await Promise.allSettled(
      batch.map((phoneNumber) =>
        smsService.send({
          lenderId: input.lenderId,
          message,
          phoneNumber,
          purpose: input.purpose,
          senderId: reservation.senderId,
        }),
      ),
    );
    results.push(...batchResults);
  }

  const sentRecipients = results.filter(
    (result) => result.status === "fulfilled",
  ).length;
  const failedRecipients = phoneNumbers.length - sentRecipients;

  try {
    return await finalizeQuota({
      batchId,
      failedRecipients,
      lenderId: input.lenderId,
      month,
      reservedUnits: phoneNumbers.length * unitsPerRecipient,
      sentRecipients,
      unitsPerRecipient,
    });
  } catch {
    await markReviewRequired(batchId);
    throw new SmsSendingError(
      "review_required",
      "Text.lk processed this request, but usage finalization needs review. Do not resend it.",
    );
  }
}

export async function getSmsUsageAndHistory(
  lenderId: string,
  quota: number,
): Promise<{
  current: SmsUsageSummary;
  months: SmsUsageSummary[];
  latestBatches: SmsBatchSummary[];
}> {
  const monthKeys = previousSmsMonthKeys(colomboMonthKey(), 12);
  const [usageResult, logResult] = await Promise.all([
    databases.listDocuments({
      databaseId: appwriteServerConfig.databaseId,
      collectionId: appwriteServerConfig.collections.smsMonthlyUsage,
      queries: [
        Query.equal("lender_id", lenderId),
        Query.equal("month_key", monthKeys),
        Query.limit(12),
      ],
    }),
    databases.listDocuments({
      databaseId: appwriteServerConfig.databaseId,
      collectionId: appwriteServerConfig.collections.smsSendLogs,
      queries: [
        Query.equal("lender_id", lenderId),
        Query.orderDesc("created_at"),
        Query.limit(12),
      ],
    }),
  ]);
  const usageByMonth = new Map(
    usageResult.documents.map((document) => [
      String(document.month_key ?? ""),
      document,
    ]),
  );
  const months = monthKeys.map((month, index) =>
    mapUsage(month, usageByMonth.get(month), index === 0 ? quota : 0),
  );

  return {
    current: months[0],
    months,
    latestBatches: logResult.documents.map(mapBatch),
  };
}

async function reserveQuota(input: {
  batchId: string;
  characterCount: number;
  lenderId: string;
  month: string;
  purpose: SmsPurpose;
  requestId: string;
  requestedRecipients: number;
  unitsPerRecipient: number;
}): Promise<
  | { duplicate: false; senderId: string }
  | { duplicate: true; result: SmsSendBatchResult }
> {
  for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
    const transaction = await databases.createTransaction({ ttl: 60 });
    const transactionId = transaction.$id;

    try {
      const usageId = documentId("su", `${input.lenderId}:${input.month}`);
      const [existingBatch, account, usage, senderResult] = await Promise.all([
        getDocumentOrNull(
          appwriteServerConfig.collections.smsSendLogs,
          input.batchId,
          transactionId,
        ),
        getDocumentOrNull(
          appwriteServerConfig.collections.smsAccounts,
          input.lenderId,
          transactionId,
        ),
        getDocumentOrNull(
          appwriteServerConfig.collections.smsMonthlyUsage,
          usageId,
          transactionId,
        ),
        databases.listDocuments({
          databaseId: appwriteServerConfig.databaseId,
          collectionId: appwriteServerConfig.collections.smsSenderRequests,
          queries: [
            Query.equal("lender_id", input.lenderId),
            Query.equal("status", "approved"),
            Query.orderDesc("requested_at"),
            Query.limit(1),
            Query.select(["$id", "sender_id"]),
          ],
          transactionId,
        }),
      ]);

      if (existingBatch) {
        await rollbackTransaction(transactionId);
        const status = String(existingBatch.status ?? "processing");
        if (status === "processing" || status === "review_required") {
          throw new SmsSendingError(
            "duplicate_processing",
            "This send request is already processing or requires review.",
          );
        }
        return { duplicate: true, result: batchResult(existingBatch, true) };
      }

      if (!account || String(account.lender_id ?? "") !== input.lenderId) {
        throw new SmsSendingError(
          "no_quota",
          "SMS sending is not configured for this account.",
        );
      }

      if (String(account.status ?? "") !== "active") {
        throw new SmsSendingError(
          "account_suspended",
          "SMS sending is suspended for this account.",
        );
      }

      const sender = senderResult.documents[0];
      if (!sender) {
        throw new SmsSendingError(
          "no_sender",
          "An approved sender ID is required before sending SMS messages.",
        );
      }

      const quota = Math.max(0, Number(account.monthly_quota ?? 0));
      if (quota === 0) {
        throw new SmsSendingError(
          "no_quota",
          "A monthly SMS quota must be assigned before sending.",
        );
      }

      const sentUnits = Math.max(0, Number(usage?.sent_units ?? 0));
      const reservedUnits = Math.max(0, Number(usage?.reserved_units ?? 0));
      const requestedUnits =
        input.requestedRecipients * input.unitsPerRecipient;

      if (sentUnits + reservedUnits + requestedUnits > quota) {
        throw new SmsSendingError(
          "quota_exceeded",
          "This send exceeds the remaining monthly SMS quota.",
        );
      }

      const now = new Date().toISOString();
      const usageData = {
        lender_id: input.lenderId,
        month_key: input.month,
        sent_recipients: Math.max(0, Number(usage?.sent_recipients ?? 0)),
        failed_recipients: Math.max(0, Number(usage?.failed_recipients ?? 0)),
        sent_units: sentUnits,
        reserved_units: reservedUnits + requestedUnits,
        batch_count: Math.max(0, Number(usage?.batch_count ?? 0)),
        created_at: String(usage?.created_at ?? now),
        updated_at: now,
      };

      if (usage) {
        await databases.updateDocument({
          databaseId: appwriteServerConfig.databaseId,
          collectionId: appwriteServerConfig.collections.smsMonthlyUsage,
          documentId: usageId,
          data: usageData,
          transactionId,
        });
      } else {
        await databases.createDocument({
          databaseId: appwriteServerConfig.databaseId,
          collectionId: appwriteServerConfig.collections.smsMonthlyUsage,
          documentId: usageId,
          data: usageData,
          transactionId,
        });
      }

      await databases.createDocument({
        databaseId: appwriteServerConfig.databaseId,
        collectionId: appwriteServerConfig.collections.smsSendLogs,
        documentId: input.batchId,
        data: {
          lender_id: input.lenderId,
          month_key: input.month,
          request_id: input.requestId,
          sender_id: String(sender.sender_id ?? ""),
          character_count: input.characterCount,
          units_per_recipient: input.unitsPerRecipient,
          requested_recipients: input.requestedRecipients,
          sent_recipients: 0,
          failed_recipients: 0,
          reserved_units: requestedUnits,
          used_units: 0,
          status: "processing",
          purpose: input.purpose,
          created_at: now,
        },
        transactionId,
      });
      await databases.updateTransaction({ transactionId, commit: true });
      return { duplicate: false, senderId: String(sender.sender_id ?? "") };
    } catch (error) {
      await rollbackTransaction(transactionId);

      if (isConflict(error) && attempt < MAX_TRANSACTION_ATTEMPTS) {
        continue;
      }

      throw error;
    }
  }

  throw new SmsSendingError(
    "invalid_request",
    "The SMS request could not be reserved safely. Please try again.",
  );
}

async function finalizeQuota(input: {
  batchId: string;
  failedRecipients: number;
  lenderId: string;
  month: string;
  reservedUnits: number;
  sentRecipients: number;
  unitsPerRecipient: number;
}): Promise<SmsSendBatchResult> {
  for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
    const transaction = await databases.createTransaction({ ttl: 60 });
    const transactionId = transaction.$id;

    try {
      const usageId = documentId("su", `${input.lenderId}:${input.month}`);
      const [batch, usage] = await Promise.all([
        getDocumentOrNull(
          appwriteServerConfig.collections.smsSendLogs,
          input.batchId,
          transactionId,
        ),
        getDocumentOrNull(
          appwriteServerConfig.collections.smsMonthlyUsage,
          usageId,
          transactionId,
        ),
      ]);

      if (!batch || !usage) {
        throw new Error("Reserved SMS usage was not found.");
      }

      if (String(batch.status ?? "") !== "processing") {
        await rollbackTransaction(transactionId);
        return batchResult(batch, true);
      }

      const usedUnits = input.sentRecipients * input.unitsPerRecipient;
      const status =
        input.sentRecipients === 0
          ? "failed"
          : input.failedRecipients > 0
            ? "partial"
            : "sent";
      const completedAt = new Date().toISOString();

      await databases.updateDocument({
        databaseId: appwriteServerConfig.databaseId,
        collectionId: appwriteServerConfig.collections.smsMonthlyUsage,
        documentId: usageId,
        data: {
          sent_recipients:
            Number(usage.sent_recipients ?? 0) + input.sentRecipients,
          failed_recipients:
            Number(usage.failed_recipients ?? 0) + input.failedRecipients,
          sent_units: Number(usage.sent_units ?? 0) + usedUnits,
          reserved_units: Math.max(
            0,
            Number(usage.reserved_units ?? 0) - input.reservedUnits,
          ),
          batch_count: Number(usage.batch_count ?? 0) + 1,
          updated_at: completedAt,
        },
        transactionId,
      });
      await databases.updateDocument({
        databaseId: appwriteServerConfig.databaseId,
        collectionId: appwriteServerConfig.collections.smsSendLogs,
        documentId: input.batchId,
        data: {
          sent_recipients: input.sentRecipients,
          failed_recipients: input.failedRecipients,
          reserved_units: 0,
          used_units: usedUnits,
          status,
          completed_at: completedAt,
        },
        transactionId,
      });
      await databases.updateTransaction({ transactionId, commit: true });

      return {
        batchId: input.batchId,
        duplicate: false,
        failedRecipients: input.failedRecipients,
        requestedRecipients: input.sentRecipients + input.failedRecipients,
        sentRecipients: input.sentRecipients,
        status,
        usedUnits,
      };
    } catch (error) {
      await rollbackTransaction(transactionId);
      if (isConflict(error) && attempt < MAX_TRANSACTION_ATTEMPTS) {
        continue;
      }
      throw error;
    }
  }

  throw new Error("SMS usage finalization failed.");
}

async function markReviewRequired(batchId: string) {
  try {
    await databases.updateDocument({
      databaseId: appwriteServerConfig.databaseId,
      collectionId: appwriteServerConfig.collections.smsSendLogs,
      documentId: batchId,
      data: { status: "review_required" },
    });
  } catch {
    // The retained reservation still prevents overspending and automatic resend.
  }
}

async function getDocumentOrNull(
  collectionId: string,
  documentId: string,
  transactionId: string,
): Promise<SmsDocument | null> {
  try {
    return (await databases.getDocument({
      databaseId: appwriteServerConfig.databaseId,
      collectionId,
      documentId,
      transactionId,
    })) as SmsDocument;
  } catch (error) {
    if (errorCode(error) === 404) {
      return null;
    }
    throw error;
  }
}

function mapUsage(
  month: string,
  document: SmsDocument | undefined,
  quota: number,
): SmsUsageSummary {
  const sentUnits = Math.max(0, Number(document?.sent_units ?? 0));
  const reservedUnits = Math.max(0, Number(document?.reserved_units ?? 0));
  return {
    month,
    quota,
    sentUnits,
    reservedUnits,
    remainingUnits: Math.max(0, quota - sentUnits - reservedUnits),
    sentRecipients: Math.max(0, Number(document?.sent_recipients ?? 0)),
    failedRecipients: Math.max(0, Number(document?.failed_recipients ?? 0)),
    batchCount: Math.max(0, Number(document?.batch_count ?? 0)),
  };
}

function mapBatch(document: Models.Document): SmsBatchSummary {
  const value = document as SmsDocument;
  const storedStatus = String(value.status ?? "processing");
  const statuses = [
    "processing",
    "sent",
    "partial",
    "failed",
    "review_required",
  ] as const;
  return {
    id: value.$id,
    senderId: String(value.sender_id ?? ""),
    month: String(value.month_key ?? ""),
    characterCount: Number(value.character_count ?? 0),
    unitsPerRecipient: Number(value.units_per_recipient ?? 0),
    requestedRecipients: Number(value.requested_recipients ?? 0),
    sentRecipients: Number(value.sent_recipients ?? 0),
    failedRecipients: Number(value.failed_recipients ?? 0),
    usedUnits: Number(value.used_units ?? 0),
    status: statuses.includes(storedStatus as (typeof statuses)[number])
      ? (storedStatus as SmsBatchSummary["status"])
      : "processing",
    createdAt: String(value.created_at ?? value.$createdAt),
    completedAt: String(value.completed_at ?? ""),
  };
}

function batchResult(document: SmsDocument, duplicate: boolean): SmsSendBatchResult {
  const status = String(document.status ?? "failed");
  return {
    batchId: document.$id,
    duplicate,
    failedRecipients: Number(document.failed_recipients ?? 0),
    requestedRecipients: Number(document.requested_recipients ?? 0),
    sentRecipients: Number(document.sent_recipients ?? 0),
    status: status === "sent" || status === "partial" ? status : "failed",
    usedUnits: Number(document.used_units ?? 0),
  };
}

function validateRequestId(requestId: string) {
  if (!REQUEST_ID_PATTERN.test(requestId)) {
    throw new SmsSendingError(
      "invalid_request",
      "The SMS request identifier is invalid. Refresh and try again.",
    );
  }
}

function documentId(prefix: string, value: string) {
  const digest = createHash("sha256").update(value).digest("hex");
  return `${prefix}_${digest.slice(0, 32)}`;
}

async function rollbackTransaction(transactionId: string) {
  try {
    await databases.updateTransaction({ transactionId, rollback: true });
  } catch {
    // Preserve the original operation error.
  }
}

function isConflict(error: unknown) {
  return errorCode(error) === 409;
}

function errorCode(error: unknown) {
  return typeof error === "object" && error && "code" in error
    ? Number(error.code)
    : 0;
}
