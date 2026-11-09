import { describe, expect, it } from "vitest";
import {
  analyzeSmsMessage,
  colomboMonthKey,
  normalizeSmsSenderId,
  normalizeSmsTemplateName,
  previousSmsMonthKeys,
  renderPaymentSmsTemplate,
  smsCharacterCount,
  smsUnitsPerRecipient,
  validateSmsSenderId,
  validateSmsTemplate,
  validatePaymentSmsTemplate,
} from "../policy";

describe("SMS policy", () => {
  it.each(["Abc", "Mortgage1", "ABC12345678"])(
    "accepts sender ID %s",
    (value) => {
      expect(validateSmsSenderId(value)).toBeNull();
    },
  );

  it.each(["", "ab", "123abc", "with space", "sender-id", "abcdefghijkl"])(
    "rejects invalid sender ID %s",
    (value) => {
      expect(validateSmsSenderId(value)).toBeTypeOf("string");
    },
  );

  it("normalizes uniqueness keys without changing the submitted display value", () => {
    expect(normalizeSmsSenderId(" LoanPro ")).toBe("loanpro");
    expect(normalizeSmsTemplateName(" Payment   Reminder ")).toBe(
      "payment reminder",
    );
  });

  it("counts Unicode code points and calculates the chosen application units", () => {
    expect(smsCharacterCount("A😀B")).toBe(3);
    expect(smsUnitsPerRecipient("a".repeat(160))).toBe(1);
    expect(smsUnitsPerRecipient("a".repeat(161))).toBe(2);
    expect(smsUnitsPerRecipient("a".repeat(306))).toBe(2);
    expect(smsUnitsPerRecipient("a".repeat(307))).toBe(3);
    expect(smsUnitsPerRecipient("a".repeat(321))).toBe(3);
    expect(smsUnitsPerRecipient("a".repeat(480))).toBe(4);
    expect(smsUnitsPerRecipient("a".repeat(481))).toBe(0);
  });

  it("applies Text.lk Unicode and GSM-7 extension segmentation", () => {
    expect(analyzeSmsMessage("අ".repeat(70))).toMatchObject({
      encoding: "Unicode",
      units: 1,
    });
    expect(analyzeSmsMessage("අ".repeat(71))).toMatchObject({
      encoding: "Unicode",
      units: 2,
    });
    expect(analyzeSmsMessage("අ".repeat(134))).toMatchObject({ units: 2 });
    expect(analyzeSmsMessage("අ".repeat(135))).toMatchObject({ units: 3 });
    expect(analyzeSmsMessage("^".repeat(80))).toMatchObject({
      encoding: "GSM-7",
      encodedLength: 160,
      units: 1,
    });
    expect(analyzeSmsMessage("^".repeat(81))).toMatchObject({ units: 2 });
    expect(analyzeSmsMessage("😀".repeat(35))).toMatchObject({
      characterCount: 35,
      encodedLength: 70,
      units: 1,
    });
    expect(analyzeSmsMessage("😀".repeat(36))).toMatchObject({ units: 2 });
    expect(
      analyzeSmsMessage(
        "අද දින ඔබගෙන් රු. {{amount}} ක ගෙවීම ලැබුණි.\nsiyarata Investment",
      ),
    ).toMatchObject({
      characterCount: 64,
      encodedLength: 64,
      encoding: "Unicode",
      units: 1,
    });
  });

  it("validates template fields", () => {
    expect(validateSmsTemplate("Reminder", "Pay today")).toBeNull();
    expect(validateSmsTemplate("", "Pay today")).toContain("name");
    expect(validateSmsTemplate("Reminder", "")).toContain("message");
    expect(validateSmsTemplate("Reminder", "a".repeat(481))).toContain("480");
  });

  it("validates and renders automatic payment placeholders", () => {
    const template =
      "Hi {{borrowerName}}, {{amount}} received. Balance {{remainingBalance}} - {{companyName}}";

    expect(validatePaymentSmsTemplate(template)).toBeNull();
    expect(validatePaymentSmsTemplate("Hello {{unknownValue}}")).toContain(
      "Unknown",
    );
    expect(validatePaymentSmsTemplate("Hello {{borrowerName" )).toContain(
      "invalid placeholder",
    );
    expect(
      renderPaymentSmsTemplate(template, {
        amount: "LKR 1,000.00",
        borrowerName: "Jordan",
        companyName: "River Capital",
        paymentDate: "Aug 7, 2026, 10:30 AM",
        remainingBalance: "LKR 4,000.00",
      }),
    ).toBe(
      "Hi Jordan, LKR 1,000.00 received. Balance LKR 4,000.00 - River Capital",
    );
  });

  it("uses Asia/Colombo months and returns a 12-month sequence", () => {
    expect(colomboMonthKey(new Date("2026-01-31T19:00:00.000Z"))).toBe(
      "2026-02",
    );
    expect(previousSmsMonthKeys("2026-02", 3)).toEqual([
      "2026-02",
      "2026-01",
      "2025-12",
    ]);
  });
});
