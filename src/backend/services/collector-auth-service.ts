import "server-only";

import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import {
  decodeCollectorSession,
  encodeCollectorSession,
  type CollectorSessionClaims,
} from "./collector-session-codec";
import { getTenantDocument } from "./tenant-data-service";

const COLLECTOR_SESSION_COOKIE = "mortgagepro_collector_session";
const COLLECTOR_SESSION_LIFETIME_MS = 12 * 60 * 60 * 1000;
const HASH_KEY_LENGTH = 64;

export type CollectorPrincipal = Omit<
  CollectorSessionClaims,
  "credentialFingerprint"
>;

type NewCollectorSession = Pick<
  CollectorSessionClaims,
  "collectorId" | "lenderId" | "name"
> & { passwordHash: string };

export function hashCollectorPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, HASH_KEY_LENGTH).toString("hex");

  return `${salt}:${hash}`;
}

export function verifyCollectorPassword(password: string, storedHash: string) {
  const [salt, hash] = storedHash.split(":");

  if (!salt || !hash) {
    return false;
  }

  const requestedHash = scryptSync(password, salt, HASH_KEY_LENGTH);
  const storedBuffer = Buffer.from(hash, "hex");

  if (storedBuffer.length !== requestedHash.length) {
    return false;
  }

  return timingSafeEqual(storedBuffer, requestedHash);
}

export async function setCollectorSession(session: NewCollectorSession) {
  const issuedAt = Date.now();
  const expiresAt = issuedAt + COLLECTOR_SESSION_LIFETIME_MS;
  const secret = sessionSecret();
  const claims: CollectorSessionClaims = {
    collectorId: session.collectorId,
    lenderId: session.lenderId,
    name: session.name,
    credentialFingerprint: createCollectorCredentialFingerprint(
      session.passwordHash,
      secret,
    ),
    issuedAt,
    expiresAt,
  };
  const cookieStore = await cookies();

  cookieStore.set(
    COLLECTOR_SESSION_COOKIE,
    encodeCollectorSession(claims, secret),
    {
      expires: new Date(expiresAt),
      httpOnly: true,
      maxAge: COLLECTOR_SESSION_LIFETIME_MS / 1000,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  );
}

export async function requireActiveCollectorPrincipal(): Promise<CollectorPrincipal | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(COLLECTOR_SESSION_COOKIE)?.value ?? "";

  if (!value) {
    return null;
  }

  const claims = decodeCollectorSession(value, sessionSecret());
  if (!claims) {
    clearInvalidCollectorCookie(cookieStore);
    return null;
  }

  const collector = await getTenantDocument(
    "collectors",
    claims.lenderId,
    claims.collectorId,
    ["$id", "lender_id", "name", "password_hash", "status"],
  );

  if (
    !collector ||
    collector.$id !== claims.collectorId ||
    String(collector.lender_id ?? "") !== claims.lenderId ||
    collector.status !== "active" ||
    !hasMatchingCollectorCredential(
      claims.credentialFingerprint,
      String(collector.password_hash ?? ""),
      sessionSecret(),
    )
  ) {
    clearInvalidCollectorCookie(cookieStore);
    return null;
  }

  return {
    collectorId: claims.collectorId,
    lenderId: claims.lenderId,
    name: String(collector.name ?? claims.name),
    issuedAt: claims.issuedAt,
    expiresAt: claims.expiresAt,
  };
}

export function createCollectorCredentialFingerprint(
  passwordHash: string,
  secret: string,
) {
  return createHmac("sha256", secret)
    .update("collector-credential:")
    .update(passwordHash)
    .digest("base64url");
}

export async function clearCollectorSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COLLECTOR_SESSION_COOKIE);
}

function clearInvalidCollectorCookie(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
) {
  try {
    cookieStore.delete(COLLECTOR_SESSION_COOKIE);
  } catch {
    // Server Components cannot mutate cookies. Actions and route handlers clear it.
  }
}

function sessionSecret() {
  return process.env.COLLECTOR_SESSION_SECRET ?? "";
}

function hasMatchingCollectorCredential(
  sessionFingerprint: string,
  passwordHash: string,
  secret: string,
) {
  const expected = Buffer.from(
    createCollectorCredentialFingerprint(passwordHash, secret),
    "base64url",
  );
  const received = Buffer.from(sessionFingerprint, "base64url");

  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
}
