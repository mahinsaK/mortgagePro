import { describe, expect, it } from "vitest";
import { CollectorController } from "../controller";

describe("CollectorController", () => {
  it("supports inactive collectors", () => {
    const result = new CollectorController().create({
      lenderId: "lender_1",
      name: "Jordan Lee",
      status: "inactive",
    });

    expect(result.ok).toBe(true);
    expect(result.data?.status).toBe("inactive");
  });
});
