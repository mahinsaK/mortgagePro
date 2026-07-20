import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  recordSecurityEvent: vi.fn(),
}));

vi.mock("@/backend/services/security-event-service", () => ({
  recordSecurityEvent: mocks.recordSecurityEvent,
}));

import { GET } from "../route";

describe("Google OAuth failure route", () => {
  it("clears OAuth state and records a sanitized failure", async () => {
    process.env.APP_BASE_URL = "https://mortgagepro.example";

    const response = await GET(
      new NextRequest("https://mortgagepro.example/auth/google/failure"),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("/auth/login?status=error");
    expect(response.cookies.get("mortgagepro_lender_oauth_state")?.value).toBe("");
    expect(mocks.recordSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "google_login_failure",
        outcome: "failure",
        reasonCode: "cancelled_or_provider_failure",
      }),
    );
  });
});
