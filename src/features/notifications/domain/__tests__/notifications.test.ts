import { describe, expect, it } from "vitest";
import { NotificationController } from "../controller";
import { toNotificationContextDto } from "../dto";
import { isUsablePhoneNumber } from "../service";

const generatedAt = "2026-08-04T03:00:00.000Z";

describe("local lender notifications", () => {
  it("generates and orders every actionable rule at its date boundary", () => {
    const result = new NotificationController().generate(
      { localDate: "2026-08-04", timezoneOffsetMinutes: "-330" },
      {
        activeLoanCount: 4,
        latestPaymentCreatedAt: "2026-08-03T17:30:00.000Z",
        loans: [
          loan("2026-08-03", 100),
          loan("2026-08-04", 100),
          loan("2026-08-11", 100),
          loan("2026-08-12", 100),
          loan("2026-08-03", 0),
          loan("2026-08-03", 100, "completed"),
        ],
        borrowers: [
          borrower("+94 77 123 4567"),
          borrower("Mahinsa"),
          borrower("call +94 77 123 4567"),
          borrower("", "inactive"),
        ],
      },
      generatedAt,
    );

    expect(result.ok).toBe(true);
    expect(result.data?.map((item) => item.kind)).toEqual([
      "loans_overdue",
      "loans_ending_today",
      "loans_ending_soon",
      "borrowers_missing_phone",
      "no_collections_today",
    ]);
    expect(result.data?.map((item) => item.severity)).toEqual([
      "urgent",
      "urgent",
      "warning",
      "warning",
      "info",
    ]);
    expect(result.data?.[2].href).toBe(
      "/loans?attention=ending-soon&asOf=2026-08-04",
    );
    expect(result.data?.every((item) => item.generatedAt === generatedAt)).toBe(
      true,
    );
  });

  it("uses the browser timezone boundary for today's latest payment", () => {
    const result = new NotificationController().generate(
      { localDate: "2026-08-04", timezoneOffsetMinutes: "-330" },
      {
        activeLoanCount: 1,
        latestPaymentCreatedAt: "2026-08-03T19:00:00.000Z",
        loans: [],
        borrowers: [],
      },
      generatedAt,
    );

    expect(result.data).toEqual([]);
  });

  it("does not advise about collections when no active loans exist", () => {
    const result = new NotificationController().generate(
      { localDate: "2026-08-04", timezoneOffsetMinutes: "0" },
      {
        activeLoanCount: 0,
        loans: [],
        borrowers: [],
      },
      generatedAt,
    );

    expect(result.data).toEqual([]);
  });

  it("gives time-sensitive rules new daily identities", () => {
    const controller = new NotificationController();
    const source = {
      activeLoanCount: 0,
      loans: [loan("2026-08-01", 100)],
      borrowers: [],
    };
    const first = controller.generate(
      { localDate: "2026-08-04", timezoneOffsetMinutes: "0" },
      source,
      generatedAt,
    );
    const next = controller.generate(
      { localDate: "2026-08-05", timezoneOffsetMinutes: "0" },
      source,
      generatedAt,
    );

    expect(first.data?.[0].id).toBe("loans_overdue:2026-08-04");
    expect(next.data?.[0].id).toBe("loans_overdue:2026-08-05");
  });

  it.each([
    ["+94 77 123 4567", true],
    ["077-123-4567", true],
    ["(011) 234 5678", true],
    ["customer 0771234567", false],
    ["123", false],
    ["+1234567890123456", false],
  ])("classifies phone %s as usable=%s", (phone, usable) => {
    expect(isUsablePhoneNumber(phone)).toBe(usable);
  });

  it.each([
    [{ localDate: "2026-02-30", timezoneOffsetMinutes: "0" }, "localDate"],
    [{ localDate: "04-08-2026", timezoneOffsetMinutes: "0" }, "localDate"],
    [
      { localDate: "2026-08-04", timezoneOffsetMinutes: "1.5" },
      "timezoneOffsetMinutes",
    ],
    [
      { localDate: "2026-08-04", timezoneOffsetMinutes: "900" },
      "timezoneOffsetMinutes",
    ],
  ])("rejects malformed local context %#", (input, field) => {
    expect(() => toNotificationContextDto(input)).toThrow(field);
  });
});

function loan(endDate: string, remainingAmount: number, status = "active") {
  return {
    endDate: `${endDate}T00:00:00.000Z`,
    remainingAmount,
    status,
  };
}

function borrower(contact: string, status = "active") {
  return { contact, status };
}
