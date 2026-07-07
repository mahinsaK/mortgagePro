import { describe, expect, it } from "vitest";
import { LenderController } from "../controller";

describe("LenderController", () => {
  it("prepares an Appwrite-shaped lender profile update", () => {
    const result = new LenderController().updateProfile({
      companyName: "Northstar Lending",
      email: " TEAM@NORTHSTAR.COM ",
      phone: "555",
      address: "Main Street",
      status: "active",
    });

    expect(result.ok).toBe(true);
    expect(result.data).toMatchObject({
      company_name: "Northstar Lending",
      email: "team@northstar.com",
      status: "active",
    });
  });
});
