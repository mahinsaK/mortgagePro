import { AppwriteException } from "node-appwrite";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  clearAuthSession: vi.fn(),
  getAuthSessionSecret: vi.fn(),
  setAuthSessionSecret: vi.fn(),
  updateSession: vi.fn(),
  resolvePrimaryLender: vi.fn(),
}));

vi.mock("@/backend/appwrite/server-client", () => ({
  createAccountClient: vi.fn(() => ({ updateSession: mocks.updateSession })),
}));
vi.mock("@/backend/services/auth-session-service", () => ({
  clearAuthSession: mocks.clearAuthSession,
  getAuthSessionSecret: mocks.getAuthSessionSecret,
  setAuthSessionSecret: mocks.setAuthSessionSecret,
}));
vi.mock("@/backend/services/lender-service", () => ({
  resolvePrimaryLender: mocks.resolvePrimaryLender,
}));

import { POST } from "./route";

describe("lender session refresh route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthSessionSecret.mockResolvedValue("current-secret");
    mocks.resolvePrimaryLender.mockResolvedValue({
      status: "authenticated",
      lender: { id: "lender_A" },
    });
    mocks.updateSession.mockResolvedValue({
      secret: "",
      expire: "2030-04-02T03:04:05.000Z",
    });
  });

  it("extends the current Appwrite session and its protected cookie", async () => {
    const response = await POST();

    expect(response.status).toBe(200);
    expect(mocks.updateSession).toHaveBeenCalledWith({ sessionId: "current" });
    expect(mocks.setAuthSessionSecret).toHaveBeenCalledWith(
      "current-secret",
      "2030-04-02T03:04:05.000Z",
    );
  });

  it("does not call Appwrite without a lender cookie", async () => {
    mocks.resolvePrimaryLender.mockResolvedValue({ status: "anonymous" });
    mocks.getAuthSessionSecret.mockResolvedValue("");

    const response = await POST();

    expect(response.status).toBe(401);
    expect(mocks.updateSession).not.toHaveBeenCalled();
  });

  it("does not renew an inactive lender", async () => {
    mocks.resolvePrimaryLender.mockResolvedValue({ status: "inactive" });

    const response = await POST();

    expect(response.status).toBe(401);
    expect(mocks.updateSession).not.toHaveBeenCalled();
    expect(mocks.clearAuthSession).toHaveBeenCalledTimes(1);
  });

  it("clears a definitively invalid session", async () => {
    mocks.updateSession.mockRejectedValue(
      new AppwriteException("Invalid session", 401, "user_unauthorized"),
    );

    const response = await POST();

    expect(response.status).toBe(401);
    expect(mocks.clearAuthSession).toHaveBeenCalledTimes(1);
  });

  it("preserves the cookie during a temporary Appwrite failure", async () => {
    mocks.updateSession.mockRejectedValue(new Error("network timeout"));

    const response = await POST();

    expect(response.status).toBe(503);
    expect(mocks.clearAuthSession).not.toHaveBeenCalled();
  });
});
