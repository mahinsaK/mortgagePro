import { describe, expect, it } from "vitest";
import { BorrowerController } from "../controller";

describe("BorrowerController", () => {
  it("prepares borrower creation payload", () => {
    const result = new BorrowerController().create({
      lenderId: "lender_1",
      name: "Avery Johnson",
      businessName: "Johnson Market",
      phone: "555",
      address: "Cedar Road",
    });

    expect(result.ok).toBe(true);
    expect(result.data).toMatchObject({
      lender_id: "lender_1",
      name: "Avery Johnson",
      status: "active",
    });
  });

  it("requires a borrower name", () => {
    const result = new BorrowerController().create({ lenderId: "lender_1" });

    expect(result.ok).toBe(false);
    expect(result.error).toBe("name is required.");
  });
});
