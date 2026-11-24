import { isValidElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  deviceType: undefined as string | undefined,
  redirect: vi.fn(),
  requireActiveCollectorPrincipal: vi.fn(),
  resolvePrimaryLender: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({ "user-agent": "test-agent" })),
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/server", () => ({
  userAgentFromString: vi.fn(() => ({
    device: { type: mocks.deviceType },
  })),
}));
vi.mock("@/server/services/collector-auth-service", () => ({
  requireActiveCollectorPrincipal: mocks.requireActiveCollectorPrincipal,
}));
vi.mock("@/server/services/lender-service", () => ({
  resolvePrimaryLender: mocks.resolvePrimaryLender,
}));

import { LandingPage } from "@/features/marketing/components/landing-page";
import Home from "./page";

describe("home landing and session routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.deviceType = undefined;
    mocks.requireActiveCollectorPrincipal.mockResolvedValue(null);
    mocks.resolvePrimaryLender.mockResolvedValue({ status: "anonymous" });
    mocks.redirect.mockImplementation((path: string) => {
      throw new Error(`redirect:${path}`);
    });
  });

  it("renders the landing page for an anonymous desktop browser", async () => {
    const view = await Home();

    expect(isValidElement(view)).toBe(true);
    expect(view.type).toBe(LandingPage);
    expect(mocks.requireActiveCollectorPrincipal).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("renders the landing page for an anonymous mobile visitor", async () => {
    mocks.deviceType = "mobile";

    const view = await Home();

    expect(isValidElement(view)).toBe(true);
    expect(view.type).toBe(LandingPage);
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("renders the landing page for an anonymous tablet visitor", async () => {
    mocks.deviceType = "tablet";

    const view = await Home();

    expect(isValidElement(view)).toBe(true);
    expect(view.type).toBe(LandingPage);
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("opens the scanner for an existing collector session on mobile", async () => {
    mocks.deviceType = "mobile";
    mocks.requireActiveCollectorPrincipal.mockResolvedValue({
      collectorId: "collector_one",
    });

    await expect(Home()).rejects.toThrow("redirect:/collector/scan");
    expect(mocks.resolvePrimaryLender).not.toHaveBeenCalled();
  });

  it("opens the lender dashboard for an existing lender session on mobile", async () => {
    mocks.deviceType = "mobile";
    mocks.resolvePrimaryLender.mockResolvedValue({
      status: "authenticated",
      lender: { id: "lender_one" },
    });

    await expect(Home()).rejects.toThrow("redirect:/dashboard/lender");
  });

  it("clears invalid lender sessions at the root route", async () => {
    mocks.resolvePrimaryLender.mockResolvedValue({ status: "invalid" });

    await expect(Home()).rejects.toThrow("redirect:/auth/session/clear");
  });
});
