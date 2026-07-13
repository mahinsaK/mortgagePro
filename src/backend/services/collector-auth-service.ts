import "server-only";

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
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

export type CollectorPrincipal = CollectorSessionClaims;

type NewCollectorSession = Pick<
  CollectorSessionClaims,
  "collectorId" | "lenderId" | "name"
>;

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
  const claims: CollectorSessionClaims = {
    ...session,
    issuedAt,
    expiresAt,
  };
  const cookieStore = await cookies();

  cookieStore.set(
    COLLECTOR_SESSION_COOKIE,
    encodeCollectorSession(claims, sessionSecret()),
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
    ["$id", "lender_id", "name", "status"],
  );

  if (
    !collector ||
    collector.$id !== claims.collectorId ||
    String(collector.lender_id ?? "") !== claims.lenderId ||
    collector.status !== "active"
  ) {
    clearInvalidCollectorCookie(cookieStore);
    return null;
  }

  return {
    ...claims,
    name: String(collector.name ?? claims.name),
  };
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
