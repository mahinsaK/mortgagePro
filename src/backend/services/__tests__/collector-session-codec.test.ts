import { describe, expect, it } from "vitest";
import {
  decodeCollectorSession,
  encodeCollectorSession,
  type CollectorSessionClaims,
} from "../collector-session-codec";

const secret = "0123456789abcdef0123456789abcdef";
const now = Date.parse("2026-07-11T00:00:00.000Z");

function claims(overrides: Partial<CollectorSessionClaims> = {}) {
  return {
    collectorId: "collector_A",
    currency: "LKR",
    lenderId: "lender_A",
    name: "Jordan Lee",
    credentialFingerprint: "credential-fingerprint",
    sessionVersion: 1,
    issuedAt: now,
    expiresAt: now + 90 * 24 * 60 * 60 * 1000,
    ...overrides,
  };
}

describe("collector-session-codec", () => {
  it("round-trips a valid session", () => {
    const token = encodeCollectorSession(claims(), secret);

    expect(decodeCollectorSession(token, secret, now)).toEqual(claims());
  });

  it("keeps pre-version collector cookies compatible as generation one", () => {
    const legacyClaims = claims();
    delete (legacyClaims as Partial<CollectorSessionClaims>).sessionVersion;
    const token = encodeCollectorSession(
      legacyClaims as CollectorSessionClaims,
      secret,
    );

    expect(decodeCollectorSession(token, secret, now)).toMatchObject({
      collectorId: "collector_A",
      sessionVersion: 1,
    });
  });

  it("rejects a tampered session", () => {
    const token = encodeCollectorSession(claims(), secret);
    const [payload, signature] = token.split(".");
    const tamperedPayload = Buffer.from(
      JSON.stringify(claims({ lenderId: "lender_B" })),
    ).toString("base64url");

    expect(
      decodeCollectorSession(`${tamperedPayload}.${signature}`, secret, now),
    ).toBeNull();
    expect(payload).not.toBe(tamperedPayload);
  });

  it("rejects an expired session", () => {
    const token = encodeCollectorSession(claims(), secret);

    expect(
      decodeCollectorSession(token, secret, now + 90 * 24 * 60 * 60 * 1000),
    ).toBeNull();
  });

  it("requires a dedicated secret of at least 32 bytes", () => {
    expect(() => encodeCollectorSession(claims(), "too-short")).toThrow(
      "at least 32 bytes",
    );
  });
});
