import { createHmac, timingSafeEqual } from "node:crypto";

export type CollectorSessionClaims = {
  collectorId: string;
  lenderId: string;
  name: string;
  issuedAt: number;
  expiresAt: number;
};

export function encodeCollectorSession(
  claims: CollectorSessionClaims,
  secret: string,
) {
  validateCollectorSessionSecret(secret);
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = sign(payload, secret);

  return `${payload}.${signature}`;
}

export function decodeCollectorSession(
  value: string,
  secret: string,
  now = Date.now(),
): CollectorSessionClaims | null {
  validateCollectorSessionSecret(secret);
  const parts = value.split(".");

  if (parts.length !== 2) {
    return null;
  }

  const [payload, signature] = parts;
  if (!payload || !signature || !hasValidSignature(payload, signature, secret)) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as Partial<CollectorSessionClaims>;

    if (
      typeof parsed.collectorId !== "string" ||
      !parsed.collectorId ||
      typeof parsed.lenderId !== "string" ||
      !parsed.lenderId ||
      typeof parsed.name !== "string" ||
      !parsed.name ||
      typeof parsed.issuedAt !== "number" ||
      !Number.isFinite(parsed.issuedAt) ||
      typeof parsed.expiresAt !== "number" ||
      !Number.isFinite(parsed.expiresAt) ||
      parsed.issuedAt > now ||
      parsed.expiresAt <= now ||
      parsed.expiresAt <= parsed.issuedAt
    ) {
      return null;
    }

    return parsed as CollectorSessionClaims;
  } catch {
    return null;
  }
}

export function validateCollectorSessionSecret(secret: string) {
  if (Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error(
      "COLLECTOR_SESSION_SECRET must contain at least 32 bytes of secret data.",
    );
  }
}

function hasValidSignature(payload: string, signature: string, secret: string) {
  const expected = Buffer.from(sign(payload, secret), "base64url");
  const received = Buffer.from(signature, "base64url");

  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
}

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}
