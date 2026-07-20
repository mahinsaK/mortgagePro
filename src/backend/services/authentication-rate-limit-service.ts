import "server-only";

import { createHmac } from "node:crypto";
import { appwriteServerConfig } from "@/backend/appwrite/config";
import { databases } from "@/backend/appwrite/server-client";

const MAX_TRANSACTION_ATTEMPTS = 3;
const MINIMUM_SECRET_BYTES = 32;

export const RATE_LIMITED_MESSAGE =
  "Too many sign-in attempts. Please wait and try again.";

export type AuthenticationFlow =
  | "collector_login"
  | "google_login"
  | "lender_login"
  | "password_reset"
  | "registration";

type RateLimitPolicy = {
  limit: number;
  windowSeconds: number;
  blockSeconds: number;
};

type ConsumeAuthenticationAttemptInput = {
  flow: AuthenticationFlow;
  headers: Headers;
  identity?: string;
  now?: Date;
};

type ConsumeRateLimitInput = RateLimitPolicy & {
  scope: string;
  subject: string;
  now: Date;
};

const FLOW_POLICIES: Record<
  AuthenticationFlow,
  { ip: RateLimitPolicy; identity?: RateLimitPolicy }
> = {
  lender_login: {
    ip: policy(30, 15 * 60),
    identity: policy(8, 15 * 60),
  },
  collector_login: {
    ip: policy(30, 15 * 60),
    identity: policy(8, 15 * 60),
  },
  google_login: {
    ip: policy(30, 60 * 60),
  },
  password_reset: {
    ip: policy(5, 60 * 60),
    identity: policy(5, 60 * 60),
  },
  registration: {
    ip: policy(5, 60 * 60),
  },
};

export async function consumeAuthenticationAttempt(
  input: ConsumeAuthenticationAttemptInput,
) {
  const now = input.now ?? new Date();
  const policies = FLOW_POLICIES[input.flow];
  const ipResult = await consumeRateLimit({
    scope: `${input.flow}_ip`,
    subject: clientAddress(input.headers),
    now,
    ...policies.ip,
  });

  if (!ipResult.allowed || !policies.identity || !input.identity) {
    return ipResult;
  }

  return consumeRateLimit({
    scope: `${input.flow}_identity`,
    subject: normalizeIdentity(input.identity),
    now,
    ...policies.identity,
  });
}

export async function clearAuthenticationIdentityLimit(
  flow: "collector_login" | "lender_login",
  identity: string,
) {
  const documentId = rateLimitDocumentId(
    `${flow}_identity`,
    normalizeIdentity(identity),
  );

  try {
    await databases.deleteDocument({
      databaseId: appwriteServerConfig.databaseId,
      collectionId: appwriteServerConfig.collections.authRateLimits,
      documentId,
    });
  } catch (error) {
    if (errorCode(error) !== 404) {
      // Successful authentication must not fail because counter cleanup failed.
    }
  }
}

export function hashSecuritySubject(value: string) {
  return createHmac("sha256", securityMonitoringSecret())
    .update(value)
    .digest("hex");
}

export function clientAddress(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    headers.get("x-vercel-forwarded-for")?.trim() ||
    forwarded ||
    headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

async function consumeRateLimit(input: ConsumeRateLimitInput) {
  const subjectHash = hashSecuritySubject(`${input.scope}:${input.subject}`);
  const documentId = `rl_${subjectHash.slice(0, 32)}`;

  for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
    const transaction = await databases.createTransaction({ ttl: 60 });
    const transactionId = transaction.$id;

    try {
      const existing = await getRateLimitDocument(documentId, transactionId);
      const evaluation = evaluateAttempt(existing, input);

      if (evaluation.alreadyBlocked) {
        await rollbackTransaction(transactionId);
        return {
          allowed: false,
          retryAfterSeconds: evaluation.retryAfterSeconds,
        };
      }

      const data = {
        scope: input.scope,
        subject_hash: subjectHash,
        attempt_count: evaluation.attemptCount,
        window_started_at: evaluation.windowStartedAt.toISOString(),
        updated_at: input.now.toISOString(),
        ...(evaluation.blockedUntil
          ? { blocked_until: evaluation.blockedUntil.toISOString() }
          : {}),
      };

      if (existing) {
        await databases.updateDocument({
          databaseId: appwriteServerConfig.databaseId,
          collectionId: appwriteServerConfig.collections.authRateLimits,
          documentId,
          data,
          transactionId,
        });
      } else {
        await databases.createDocument({
          databaseId: appwriteServerConfig.databaseId,
          collectionId: appwriteServerConfig.collections.authRateLimits,
          documentId,
          data,
          transactionId,
        });
      }

      await databases.updateTransaction({ transactionId, commit: true });
      return {
        allowed: evaluation.attemptCount <= input.limit,
        retryAfterSeconds: evaluation.blockedUntil
          ? input.blockSeconds
          : 0,
      };
    } catch (error) {
      await rollbackTransaction(transactionId);

      if (errorCode(error) === 409 && attempt < MAX_TRANSACTION_ATTEMPTS) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Authentication rate limit transaction failed.");
}

async function getRateLimitDocument(
  documentId: string,
  transactionId: string,
) {
  try {
    return await databases.getDocument({
      databaseId: appwriteServerConfig.databaseId,
      collectionId: appwriteServerConfig.collections.authRateLimits,
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

function evaluateAttempt(
  existing: Record<string, unknown> | null,
  input: ConsumeRateLimitInput,
) {
  const currentTime = input.now.getTime();
  const blockedUntil = parseDate(existing?.blocked_until);

  if (blockedUntil && blockedUntil.getTime() > currentTime) {
    return {
      alreadyBlocked: true,
      attemptCount: Number(existing?.attempt_count ?? input.limit + 1),
      windowStartedAt: parseDate(existing?.window_started_at) ?? input.now,
      blockedUntil,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((blockedUntil.getTime() - currentTime) / 1000),
      ),
    };
  }

  const storedWindowStart = parseDate(existing?.window_started_at);
  const windowExpired =
    !storedWindowStart ||
    currentTime - storedWindowStart.getTime() >= input.windowSeconds * 1000;
  const windowStartedAt = windowExpired ? input.now : storedWindowStart;
  const attemptCount = windowExpired
    ? 1
    : Number(existing?.attempt_count ?? 0) + 1;
  const newBlockedUntil =
    attemptCount > input.limit
      ? new Date(currentTime + input.blockSeconds * 1000)
      : null;

  return {
    alreadyBlocked: false,
    attemptCount,
    windowStartedAt,
    blockedUntil: newBlockedUntil,
    retryAfterSeconds: newBlockedUntil ? input.blockSeconds : 0,
  };
}

function rateLimitDocumentId(scope: string, subject: string) {
  const digest = hashSecuritySubject(`${scope}:${subject}`);
  return `rl_${digest.slice(0, 32)}`;
}

function normalizeIdentity(value: string) {
  return value.trim().toLowerCase();
}

function securityMonitoringSecret() {
  const secret = process.env.SECURITY_MONITORING_SECRET ?? "";

  if (Buffer.byteLength(secret, "utf8") < MINIMUM_SECRET_BYTES) {
    throw new Error(
      "SECURITY_MONITORING_SECRET must contain at least 32 random bytes.",
    );
  }

  return secret;
}

function policy(limit: number, windowSeconds: number): RateLimitPolicy {
  return { limit, windowSeconds, blockSeconds: windowSeconds };
}

function parseDate(value: unknown) {
  if (!value) {
    return null;
  }

  const parsed = new Date(String(value));
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

async function rollbackTransaction(transactionId: string) {
  try {
    await databases.updateTransaction({ transactionId, rollback: true });
  } catch {
    // A committed, expired, or already rolled-back transaction needs no cleanup.
  }
}

function errorCode(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return null;
  }

  return Number(error.code);
}
