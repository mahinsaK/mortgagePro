import { describe, expect, it } from "vitest";
import {
  normalizeOptionalPhoneNumber,
  normalizeRequiredPhoneNumber,
  sanitizePhoneNumberDraft,
} from "../phone-number";

describe("phone-number helpers", () => {
  it("keeps only digits and one optional leading plus while typing", () => {
    expect(sanitizePhoneNumberDraft("+94ab 77-123-4567")).toBe(
      "+94771234567",
    );
    expect(sanitizePhoneNumberDraft("077abc1234567")).toBe("0771234567");
  });

  it("normalizes supported existing phone formatting", () => {
    expect(normalizeOptionalPhoneNumber("+94 77 123-4567")).toBe(
      "+94771234567",
    );
    expect(normalizeOptionalPhoneNumber("(077) 123 4567")).toBe(
      "0771234567",
    );
    expect(normalizeOptionalPhoneNumber("")).toBe("");
  });

  it("rejects letters and invalid digit lengths on the server", () => {
    expect(() => normalizeOptionalPhoneNumber("call0771234567")).toThrow(
      "can contain only digits",
    );
    expect(() => normalizeRequiredPhoneNumber("12345")).toThrow(
      "7 to 15 digits",
    );
    expect(() => normalizeRequiredPhoneNumber("")).toThrow("is required");
  });
});
