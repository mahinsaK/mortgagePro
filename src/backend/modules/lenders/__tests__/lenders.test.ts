import { describe, expect, it } from "vitest";
import { LenderController } from "../controller";

describe("LenderController", () => {
  it("prepares an Appwrite-shaped lender profile update", () => {
    const result = new LenderController().updateProfile({
      companyName: "Northstar Lending",
      email: " TEAM@NORTHSTAR.COM ",
      phone: "+94 77 123 4567",
      address: "Main Street",
      status: "active",
      currency: "lkr",
    });

    expect(result.ok).toBe(true);
    expect(result.data).toMatchObject({
      company_name: "Northstar Lending",
      email: "team@northstar.com",
      status: "active",
      currency: "LKR",
    });
  });

  it("rejects lender phone numbers containing letters", () => {
    const result = new LenderController().updateProfile({
      companyName: "Northstar Lending",
      email: "team@northstar.com",
      phone: "phone0771234567",
      status: "active",
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("only digits");
  });
});
