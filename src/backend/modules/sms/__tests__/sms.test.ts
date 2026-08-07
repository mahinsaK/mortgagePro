import { describe, expect, it } from "vitest";
import { SmsController } from "../controller";
import { SmsService, type SmsProvider } from "../service";

describe("SmsController", () => {
  it("normalizes phone numbers and queues manual SMS messages", async () => {
    const result = await new SmsController().send({
      lenderId: "lender_1",
      phoneNumber: "+94 77 123 4567",
      message: "Payment reminder",
      purpose: "manual",
      senderId: "MortgagePro",
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

  it("can use an injected SMS provider", async () => {
    const provider: SmsProvider = {
      async send(input) {
        return {
          provider: "test-provider",
          providerMessageId: `test-${input.to}`,
          status: "sent",
        };
      },
    };
    const result = await new SmsController(new SmsService(provider)).send({
      lenderId: "lender_1",
      phoneNumber: "94771234567",
      message: "Hello",
      senderId: "MortgagePro",
    });

    expect(result.ok).toBe(true);
    expect(result.data).toMatchObject({
      provider: "test-provider",
      providerMessageId: "test-94771234567",
      status: "sent",
    });
  });
});
