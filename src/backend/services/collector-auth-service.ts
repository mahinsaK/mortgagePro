import "server-only";

import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import { appwriteServerConfig } from "@/backend/appwrite/config";

const COLLECTOR_SESSION_COOKIE = "mortgagepro_collector_session";
const HASH_KEY_LENGTH = 64;

export type CollectorSession = {
  collectorId: string;
  lenderId: string;
  name: string;
};

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

export async function setCollectorSession(session: CollectorSession) {
  const cookieStore = await cookies();
  cookieStore.set(COLLECTOR_SESSION_COOKIE, encodeSession(session), {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function getCollectorSession() {
  const cookieStore = await cookies();
  const value = cookieStore.get(COLLECTOR_SESSION_COOKIE)?.value ?? "";

  if (!value) {
    return null;
  }

  return decodeSession(value);
}

export async function clearCollectorSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COLLECTOR_SESSION_COOKIE);
}

function encodeSession(session: CollectorSession) {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  const signature = sign(payload);

  return `${payload}.${signature}`;
}

function decodeSession(value: string): CollectorSession | null {
  const [payload, signature] = value.split(".");

  if (!payload || !signature || sign(payload) !== signature) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
      collectorId?: string;
      lenderId?: string;
      name?: string;
    };

    if (!parsed.collectorId || !parsed.lenderId || !parsed.name) {
      return null;
    }

    return {
      collectorId: parsed.collectorId,
      lenderId: parsed.lenderId,
      name: parsed.name,
    };
  } catch {
    return null;
  }
}

function sign(payload: string) {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

function sessionSecret() {
  return (
    appwriteServerConfig.apiKey ||
    appwriteServerConfig.projectId ||
    "mortgagepro-development-collector-session"
  );
}
