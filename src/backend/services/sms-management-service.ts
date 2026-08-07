import "server-only";

import { createHash } from "node:crypto";
import type { Models } from "node-appwrite";
import { appwriteServerConfig } from "@/backend/appwrite/config";
import { databases, Query } from "@/backend/appwrite/server-client";
import {
  MAX_SMS_TEMPLATES,
  normalizeSmsSenderId,
  normalizeSmsTemplateName,
  STARTER_SMS_TEMPLATES,
  validatePaymentSmsTemplate,
  validateSmsSenderId,
  validateSmsTemplate,
} from "@/backend/modules/sms/policy";
import { listTenantDocuments } from "./tenant-data-service";

const MAX_TRANSACTION_ATTEMPTS = 3;
type SmsDocument = Models.Document & Record<string, unknown>;

export type SmsAccount = {
  id: string;
  status: "active" | "suspended";
  monthlyQuota: number;
  paymentSmsEnabled: boolean;
  paymentSmsTemplateId: string;
};

export type SmsSenderRequest = {
  id: string;
  senderId: string;
  status: "pending" | "approved" | "rejected";
  rejectionReason: string;
  requestedAt: string;
};

export type SmsTemplate = {
  id: string;
  name: string;
  message: string;
  createdAt: string;
  updatedAt: string;
};

export type SmsManagementData = {
  account: SmsAccount | null;
  activeSender: SmsSenderRequest | null;
  pendingRequest: SmsSenderRequest | null;
  latestRejectedRequest: SmsSenderRequest | null;
  templates: SmsTemplate[];
};

export class SmsManagementError extends Error {
  constructor(
    public readonly code:
      | "duplicate_sender"
      | "pending_sender"
      | "account_not_found"
      | "template_duplicate"
      | "template_limit"
      | "template_not_found"
      | "validation",
    message: string,
  ) {
    super(message);
    this.name = "SmsManagementError";
  }
}

export async function getSmsManagementData(
  lenderId: string,
): Promise<SmsManagementData> {
  const [accountResult, senderResult, templateResult] = await Promise.all([
    listTenantDocuments("smsAccounts", lenderId, [
      Query.limit(1),
      Query.select([
        "$id",
        "status",
        "monthly_quota",
        "payment_sms_enabled",
        "payment_sms_template_id",
      ]),
    ]),
    listTenantDocuments("smsSenderRequests", lenderId, [
      Query.orderDesc("requested_at"),
      Query.limit(100),
      Query.select([
        "$id",
        "sender_id",
        "status",
        "rejection_reason",
        "requested_at",
      ]),
    ]),
    listTenantDocuments("smsTemplates", lenderId, [
      Query.orderDesc("updated_at"),
      Query.limit(MAX_SMS_TEMPLATES),
      Query.select(["$id", "name", "message", "created_at", "updated_at"]),
    ]),
  ]);
  const senderRequests = senderResult.documents.map(mapSenderRequest);

  return {
    account: accountResult.documents[0]
      ? mapSmsAccount(accountResult.documents[0])
      : null,
    activeSender:
      senderRequests.find((request) => request.status === "approved") ?? null,
    pendingRequest:
      senderRequests.find((request) => request.status === "pending") ?? null,
    latestRejectedRequest:
      senderRequests.find((request) => request.status === "rejected") ?? null,
    templates: templateResult.documents.map(mapSmsTemplate),
  };
}

export async function requestSmsSenderId(lenderId: string, value: string) {
  const senderId = value.trim();
  const validationError = validateSmsSenderId(senderId);

  if (validationError) {
    throw new SmsManagementError("validation", validationError);
  }

  const normalizedSenderId = normalizeSmsSenderId(senderId);

  for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
    const transaction = await databases.createTransaction({ ttl: 60 });
    const transactionId = transaction.$id;

    try {
      const [existingSender, pendingRequests, account, templates] =
        await Promise.all([
          getDocumentOrNull(
            appwriteServerConfig.collections.smsSenderRequests,
            normalizedSenderId,
            transactionId,
          ),
          databases.listDocuments({
            databaseId: appwriteServerConfig.databaseId,
            collectionId: appwriteServerConfig.collections.smsSenderRequests,
            queries: [
              Query.equal("lender_id", lenderId),
              Query.equal("status", "pending"),
              Query.limit(1),
              Query.select(["$id"]),
            ],
            transactionId,
          }),
          getDocumentOrNull(
            appwriteServerConfig.collections.smsAccounts,
            lenderId,
            transactionId,
          ),
          databases.listDocuments({
            databaseId: appwriteServerConfig.databaseId,
            collectionId: appwriteServerConfig.collections.smsTemplates,
            queries: [
              Query.equal("lender_id", lenderId),
              Query.limit(1),
              Query.select(["$id"]),
            ],
            transactionId,
          }),
        ]);

      if (
        existingSender &&
        String(existingSender.lender_id ?? "") !== lenderId
      ) {
        throw new SmsManagementError(
          "duplicate_sender",
          "That sender ID is already in use. Choose another one.",
        );
      }

      const pendingId = String(pendingRequests.documents[0]?.$id ?? "");
      if (pendingId && pendingId !== normalizedSenderId) {
        throw new SmsManagementError(
          "pending_sender",
          "A sender ID request is already awaiting review.",
        );
      }

      if (
        existingSender &&
        ["pending", "approved"].includes(String(existingSender.status ?? ""))
      ) {
        throw new SmsManagementError(
          existingSender.status === "pending"
            ? "pending_sender"
            : "duplicate_sender",
          existingSender.status === "pending"
            ? "That sender ID is already awaiting review."
            : "That sender ID is already approved.",
        );
      }

      const now = new Date().toISOString();
      const senderData = {
        lender_id: lenderId,
        sender_id: senderId,
        normalized_sender_id: normalizedSenderId,
        status: "pending",
        rejection_reason: "",
        requested_at: now,
      };

      if (existingSender) {
        await databases.updateDocument({
          databaseId: appwriteServerConfig.databaseId,
          collectionId: appwriteServerConfig.collections.smsSenderRequests,
          documentId: normalizedSenderId,
          data: senderData,
          transactionId,
        });
      } else {
        await databases.createDocument({
          databaseId: appwriteServerConfig.databaseId,
          collectionId: appwriteServerConfig.collections.smsSenderRequests,
          documentId: normalizedSenderId,
          data: senderData,
          transactionId,
        });
      }

      if (!account) {
        await databases.createDocument({
          databaseId: appwriteServerConfig.databaseId,
          collectionId: appwriteServerConfig.collections.smsAccounts,
          documentId: lenderId,
          data: {
            lender_id: lenderId,
            status: "active",
            monthly_quota: 0,
            payment_sms_enabled: false,
            payment_sms_template_id: "",
            created_at: now,
            updated_at: now,
          },
          transactionId,
        });
      }

      if (templates.total === 0) {
        for (const template of STARTER_SMS_TEMPLATES) {
          await createTemplateDocument(lenderId, template, now, transactionId);
        }
      }

      await databases.updateTransaction({ transactionId, commit: true });
      return;
    } catch (error) {
      await rollbackTransaction(transactionId);

      if (isConflict(error) && attempt < MAX_TRANSACTION_ATTEMPTS) {
        continue;
      }

      if (isConflict(error)) {
        throw new SmsManagementError(
          "duplicate_sender",
          "That sender ID was just requested. Choose another one.",
        );
      }

      throw error;
    }
  }
}

export async function updateAutomaticPaymentSmsSettings(
  lenderId: string,
  enabled: boolean,
  templateId: string,
) {
  const normalizedTemplateId = templateId.trim();

  if (enabled && !normalizedTemplateId) {
    throw new SmsManagementError(
      "validation",
      "Choose a saved template before enabling automatic payment messages.",
    );
  }

  const transaction = await databases.createTransaction({ ttl: 60 });
  const transactionId = transaction.$id;

  try {
    const [account, template] = await Promise.all([
      getDocumentOrNull(
        appwriteServerConfig.collections.smsAccounts,
        lenderId,
        transactionId,
      ),
      normalizedTemplateId
        ? getTenantDocumentInTransaction(
            lenderId,
            normalizedTemplateId,
            transactionId,
          )
        : Promise.resolve(null),
    ]);

    if (!account || String(account.lender_id ?? "") !== lenderId) {
      throw new SmsManagementError(
        "account_not_found",
        "Request a sender ID before configuring automatic messages.",
      );
    }

    if (normalizedTemplateId && !template) {
      throw new SmsManagementError("template_not_found", "Template not found.");
    }

    if (template) {
      const validationError = validatePaymentSmsTemplate(
        String(template.message ?? ""),
      );
      if (validationError) {
        throw new SmsManagementError("validation", validationError);
      }
    }

    await databases.updateDocument({
      databaseId: appwriteServerConfig.databaseId,
      collectionId: appwriteServerConfig.collections.smsAccounts,
      documentId: lenderId,
      data: {
        payment_sms_enabled: enabled,
        payment_sms_template_id: normalizedTemplateId,
        updated_at: new Date().toISOString(),
      },
      transactionId,
    });
    await databases.updateTransaction({ transactionId, commit: true });
  } catch (error) {
    await rollbackTransaction(transactionId);
    throw error;
  }
}

export async function createSmsTemplate(
  lenderId: string,
  nameValue: string,
  messageValue: string,
) {
  return saveSmsTemplate(lenderId, null, nameValue, messageValue);
}

export async function updateSmsTemplate(
  lenderId: string,
  templateId: string,
  nameValue: string,
  messageValue: string,
) {
  return saveSmsTemplate(lenderId, templateId, nameValue, messageValue);
}

export async function deleteSmsTemplate(
  lenderId: string,
  templateId: string,
) {
  const transaction = await databases.createTransaction({ ttl: 60 });
  const transactionId = transaction.$id;

  try {
    const [template, account] = await Promise.all([
      getTenantDocumentInTransaction(lenderId, templateId, transactionId),
      getDocumentOrNull(
        appwriteServerConfig.collections.smsAccounts,
        lenderId,
        transactionId,
      ),
    ]);

    if (!template) {
      throw new SmsManagementError("template_not_found", "Template not found.");
    }

    if (String(account?.payment_sms_template_id ?? "") === templateId) {
      await databases.updateDocument({
        databaseId: appwriteServerConfig.databaseId,
        collectionId: appwriteServerConfig.collections.smsAccounts,
        documentId: lenderId,
        data: {
          payment_sms_enabled: false,
          payment_sms_template_id: "",
          updated_at: new Date().toISOString(),
        },
        transactionId,
      });
    }

    await databases.deleteDocument({
      databaseId: appwriteServerConfig.databaseId,
      collectionId: appwriteServerConfig.collections.smsTemplates,
      documentId: templateId,
      transactionId,
    });
    await databases.updateTransaction({ transactionId, commit: true });
  } catch (error) {
    await rollbackTransaction(transactionId);
    throw error;
  }
}

async function saveSmsTemplate(
  lenderId: string,
  existingTemplateId: string | null,
  nameValue: string,
  messageValue: string,
) {
  const name = nameValue.trim().replaceAll(/\s+/g, " ");
  const message = messageValue.trim();
  const validationError = validateSmsTemplate(name, message);

  if (validationError) {
    throw new SmsManagementError("validation", validationError);
  }

  const normalizedName = normalizeSmsTemplateName(name);
  const destinationId = templateDocumentId(lenderId, normalizedName);

  for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
    const transaction = await databases.createTransaction({ ttl: 60 });
    const transactionId = transaction.$id;

    try {
      const [existingTemplate, destination, templateList] = await Promise.all([
        existingTemplateId
          ? getTenantDocumentInTransaction(
              lenderId,
              existingTemplateId,
              transactionId,
            )
          : Promise.resolve(null),
        getDocumentOrNull(
          appwriteServerConfig.collections.smsTemplates,
          destinationId,
          transactionId,
        ),
        databases.listDocuments({
          databaseId: appwriteServerConfig.databaseId,
          collectionId: appwriteServerConfig.collections.smsTemplates,
          queries: [
            Query.equal("lender_id", lenderId),
            Query.limit(MAX_SMS_TEMPLATES + 1),
            Query.select(["$id"]),
          ],
          transactionId,
        }),
      ]);

      if (existingTemplateId && !existingTemplate) {
        throw new SmsManagementError(
          "template_not_found",
          "Template not found.",
        );
      }

      if (!existingTemplateId && templateList.total >= MAX_SMS_TEMPLATES) {
        throw new SmsManagementError(
          "template_limit",
          "You can save up to 20 message templates.",
        );
      }

      if (destination && destination.$id !== existingTemplateId) {
        throw new SmsManagementError(
          "template_duplicate",
          "A template with that name already exists.",
        );
      }

      const now = new Date().toISOString();
      const data = {
        lender_id: lenderId,
        name,
        normalized_name: normalizedName,
        message,
        created_at: String(existingTemplate?.created_at ?? now),
        updated_at: now,
      };

      if (destination) {
        await databases.updateDocument({
          databaseId: appwriteServerConfig.databaseId,
          collectionId: appwriteServerConfig.collections.smsTemplates,
          documentId: destinationId,
          data,
          transactionId,
        });
      } else {
        await databases.createDocument({
          databaseId: appwriteServerConfig.databaseId,
          collectionId: appwriteServerConfig.collections.smsTemplates,
          documentId: destinationId,
          data,
          transactionId,
        });
      }

      if (existingTemplateId && existingTemplateId !== destinationId) {
        await databases.deleteDocument({
          databaseId: appwriteServerConfig.databaseId,
          collectionId: appwriteServerConfig.collections.smsTemplates,
          documentId: existingTemplateId,
          transactionId,
        });
      }

      await databases.updateTransaction({ transactionId, commit: true });
      return;
    } catch (error) {
      await rollbackTransaction(transactionId);

      if (isConflict(error) && attempt < MAX_TRANSACTION_ATTEMPTS) {
        continue;
      }

      if (isConflict(error)) {
        throw new SmsManagementError(
          "template_duplicate",
          "A template with that name already exists.",
        );
      }

      throw error;
    }
  }
}

async function createTemplateDocument(
  lenderId: string,
  template: { name: string; message: string },
  now: string,
  transactionId: string,
) {
  const normalizedName = normalizeSmsTemplateName(template.name);
  await databases.createDocument({
    databaseId: appwriteServerConfig.databaseId,
    collectionId: appwriteServerConfig.collections.smsTemplates,
    documentId: templateDocumentId(lenderId, normalizedName),
    data: {
      lender_id: lenderId,
      name: template.name,
      normalized_name: normalizedName,
      message: template.message,
      created_at: now,
      updated_at: now,
    },
    transactionId,
  });
}

async function getTenantDocumentInTransaction(
  lenderId: string,
  documentId: string,
  transactionId: string,
) {
  const result = await databases.listDocuments({
    databaseId: appwriteServerConfig.databaseId,
    collectionId: appwriteServerConfig.collections.smsTemplates,
    queries: [
      Query.equal("$id", documentId),
      Query.equal("lender_id", lenderId),
      Query.limit(1),
    ],
    transactionId,
  });

  return result.documents[0] ?? null;
}

async function getDocumentOrNull(
  collectionId: string,
  documentId: string,
  transactionId: string,
) {
  try {
    return await databases.getDocument({
      databaseId: appwriteServerConfig.databaseId,
      collectionId,
      documentId,
      transactionId,
    });
  } catch (error) {
    if (errorCode(error) === 404) {
      return null;
    }

    throw error;
  }
}

async function rollbackTransaction(transactionId: string) {
  try {
    await databases.updateTransaction({ transactionId, rollback: true });
  } catch {
    // Preserve the original operation error.
  }
}

function templateDocumentId(lenderId: string, normalizedName: string) {
  const digest = createHash("sha256")
    .update(`${lenderId}:${normalizedName}`)
    .digest("hex");
  return `st_${digest.slice(0, 32)}`;
}

function mapSmsAccount(document: SmsDocument): SmsAccount {
  return {
    id: document.$id,
    status: document.status === "suspended" ? "suspended" : "active",
    monthlyQuota: Math.max(0, Number(document.monthly_quota ?? 0)),
    paymentSmsEnabled: document.payment_sms_enabled === true,
    paymentSmsTemplateId: String(document.payment_sms_template_id ?? ""),
  };
}

function mapSenderRequest(document: SmsDocument): SmsSenderRequest {
  const status = String(document.status ?? "pending");
  return {
    id: document.$id,
    senderId: String(document.sender_id ?? ""),
    status:
      status === "approved" || status === "rejected" ? status : "pending",
    rejectionReason: String(document.rejection_reason ?? ""),
    requestedAt: String(document.requested_at ?? document.$createdAt),
  };
}

function mapSmsTemplate(document: SmsDocument): SmsTemplate {
  return {
    id: document.$id,
    name: String(document.name ?? ""),
    message: String(document.message ?? ""),
    createdAt: String(document.created_at ?? document.$createdAt),
    updatedAt: String(document.updated_at ?? document.$updatedAt),
  };
}

function isConflict(error: unknown) {
  return errorCode(error) === 409;
}

function errorCode(error: unknown) {
  return typeof error === "object" && error && "code" in error
    ? Number(error.code)
    : 0;
}
