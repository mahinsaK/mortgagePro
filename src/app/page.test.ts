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
vi.mock("@/backend/services/collector-auth-service", () => ({
  requireActiveCollectorPrincipal: mocks.requireActiveCollectorPrincipal,
}));
vi.mock("@/backend/services/lender-service", () => ({
  resolvePrimaryLender: mocks.resolvePrimaryLender,
}));

import Home from "./page";

describe("home login routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.deviceType = undefined;
    mocks.requireActiveCollectorPrincipal.mockResolvedValue(null);
    mocks.resolvePrimaryLender.mockResolvedValue({ status: "anonymous" });
    mocks.redirect.mockImplementation((path: string) => {
      throw new Error(`redirect:${path}`);
    });
  });

  it("sends an anonymous phone to collector login", async () => {
    mocks.deviceType = "mobile";

    await expect(Home()).rejects.toThrow("redirect:/collector/login");
  });

  it("sends an anonymous tablet to collector login", async () => {
    mocks.deviceType = "tablet";

    await expect(Home()).rejects.toThrow("redirect:/collector/login");
  });

  it("sends an anonymous desktop browser to lender login", async () => {
    await expect(Home()).rejects.toThrow("redirect:/auth/login");
    expect(mocks.requireActiveCollectorPrincipal).not.toHaveBeenCalled();
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
});
