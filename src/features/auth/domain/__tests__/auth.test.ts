import { describe, expect, it } from "vitest";
import { AuthController } from "../controller";

describe("AuthController", () => {
  it("normalizes login email", () => {
    const result = new AuthController().login({
      email: " OWNER@EXAMPLE.COM ",
      password: "secret",
    });

    expect(result).toEqual({
      ok: true,
      data: { email: "owner@example.com", password: "secret" },
    });
  });

  it("rejects registration without a company name", () => {
    const result = new AuthController().registerLender({
      email: "owner@example.com",
      password: "secret",
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe("companyName is required.");
  });
});
