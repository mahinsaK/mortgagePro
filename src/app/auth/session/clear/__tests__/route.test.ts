import { describe, expect, it } from "vitest";
import { GET } from "../route";

describe("stale lender session cleanup", () => {
  it("expires the lender cookie and redirects to the fixed login page", async () => {
    const response = await GET(
      new Request("https://mortgagepro.example/auth/session/clear"),
    );

    expect(response.status).toBe(303);
    const location = new URL(response.headers.get("location") ?? "");
    expect(location.origin).toBe("https://mortgagepro.example");
    expect(location.pathname).toBe("/auth/login");
    expect(location.searchParams.get("status")).toBe("error");
    expect(location.searchParams.get("message")).toBe(
      "Your session expired. Please sign in again.",
    );

    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("mortgagepro_session=");
    expect(cookie).toContain("Max-Age=0");
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=lax");
  });
});
