import { describe, expect, it } from "vitest";
import { SmsController } from "../controller";

describe("SmsController", () => {
  it("normalizes phone numbers and queues manual SMS messages", async () => {
    const result = await new SmsController().send({
      lenderId: "lender_1",
      phoneNumber: "+94 77 123 4567",
      message: "Payment reminder",
      purpose: "manual",
    });

    expect(result.ok).toBe(true);
    expect(result.data).toMatchObject({
      lenderId: "lender_1",
      provider: "temporary",
      to: "+94771234567",
      message: "Payment reminder",
      purpose: "manual",
      status: "queued",
    });
  });

  it("rejects invalid phone numbers", async () => {
    const result = await new SmsController().send({
      lenderId: "lender_1",
      phoneNumber: "123",
      message: "Hello",
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("7 to 15 digits");
  });

  it("creates loan lifecycle message templates", () => {
    const controller = new SmsController();

    expect(
      controller.createLoanWelcomeMessage({
        borrowerName: "Avery",
        companyName: "Northstar",
      }),
    ).toContain("has been created");
    expect(
      controller.createLoanCompletedMessage({
        borrowerName: "Avery",
        companyName: "Northstar",
      }),
    ).toContain("has been completed");
  });
});
