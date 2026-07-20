import "server-only";

import { randomUUID } from "node:crypto";
import { appwriteServerConfig } from "@/backend/appwrite/config";
import { databases, ID } from "@/backend/appwrite/server-client";
import {
  authenticationSecurityControlsEnabled,
  clientAddress,
  hashSecuritySubject,
} from "@/backend/services/authentication-rate-limit-service";

export type SecurityEventOutcome =
  | "success"
  | "failure"
  | "blocked"
  | "denied"
  | "error";

export type SecurityPrincipalType =
  | "lender"
  | "collector"
  | "anonymous"
  | "system";

type SecurityEventInput = {
  eventType: string;
  outcome: SecurityEventOutcome;
  principalType: SecurityPrincipalType;
  headers?: Headers;
  principalIdentifier?: string;
  lenderId?: string;
  reasonCode?: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
};

const FORBIDDEN_METADATA_KEY =
  /(password|secret|token|session|cookie|authorization|api.?key)/i;

export async function recordSecurityEvent(input: SecurityEventInput) {
  if (!authenticationSecurityControlsEnabled()) {
    return;
  }

  try {
    await persistSecurityEvent(input);
  } catch {
    console.warn(
      JSON.stringify({
        type: "security_event_processing_failure",
        event_type: safeLabel(input.eventType, "security_event"),
        created_at: new Date().toISOString(),
      }),
    );
  }
}

async function persistSecurityEvent(input: SecurityEventInput) {
  const createdAt = new Date().toISOString();
  const requestId = requestIdentifier(input.headers);
  const data = {
    event_type: safeLabel(input.eventType, "security_event"),
    outcome: input.outcome,
    principal_type: input.principalType,
    ...(input.principalIdentifier
      ? {
          principal_hash: hashSecuritySubject(
            `principal:${input.principalIdentifier.trim().toLowerCase()}`,
          ),
        }
      : {}),
    ...(input.lenderId ? { lender_id: safeLabel(input.lenderId, "unknown") } : {}),
    ...(input.headers
      ? {
          ip_hash: hashSecuritySubject(
            `ip:${clientAddress(input.headers)}`,
          ),
        }
      : {}),
    request_id: requestId,
    ...(input.reasonCode
      ? { reason_code: safeLabel(input.reasonCode, "unspecified") }
      : {}),
    metadata: safeMetadata(input.metadata),
    created_at: createdAt,
  };

  console.info(
    JSON.stringify({
      type: "security_event",
      event_type: data.event_type,
      outcome: data.outcome,
      principal_type: data.principal_type,
      request_id: data.request_id,
      reason_code: data.reason_code ?? "",
      created_at: data.created_at,
    }),
  );

  try {
    await databases.createDocument({
      databaseId: appwriteServerConfig.databaseId,
      collectionId: appwriteServerConfig.collections.securityEvents,
      documentId: ID.unique(),
      data,
    });
  } catch {
    console.warn(
      JSON.stringify({
        type: "security_event_storage_failure",
        event_type: data.event_type,
        request_id: data.request_id,
        created_at: createdAt,
      }),
    );
  }
}

function requestIdentifier(headers?: Headers) {
  const supplied =
    headers?.get("x-vercel-id")?.trim() ||
    headers?.get("x-request-id")?.trim();

  return supplied ? safeLabel(supplied, randomUUID()) : randomUUID();
}

function safeMetadata(
  metadata?: Record<string, string | number | boolean | null | undefined>,
) {
  if (!metadata) {
    return "{}";
  }

  const safeEntries = Object.entries(metadata)
    .filter(([key]) => !FORBIDDEN_METADATA_KEY.test(key))
    .slice(0, 10)
    .map(([key, value]) => [
      safeLabel(key, "field"),
      String(value ?? "").slice(0, 256),
    ]);

  return JSON.stringify(Object.fromEntries(safeEntries)).slice(0, 2000);
}

function safeLabel(value: string, fallback: string) {
  const normalized = value.replaceAll(/[^A-Za-z0-9._:-]/g, "_").slice(0, 64);
  return normalized || fallback;
}
