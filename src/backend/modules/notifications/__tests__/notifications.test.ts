import { describe, expect, it } from "vitest";
import { NotificationController } from "../controller";

describe("NotificationController", () => {
  it("defaults unknown notification channels to in_app", () => {
    const result = new NotificationController().create({
      lenderId: "lender_1",
      title: "Payment reminder",
      body: "A payment is due today.",
      channel: "push",
    });

    expect(result.ok).toBe(true);
    expect(result.data?.channel).toBe("in_app");
  });
});
