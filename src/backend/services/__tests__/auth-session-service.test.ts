import { AppwriteException } from "node-appwrite";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  accountGet: vi.fn(),
  cookieDelete: vi.fn(),
  cookieGet: vi.fn(),
  cookieSet: vi.fn(),
  createAccountClient: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    delete: mocks.cookieDelete,
    get: mocks.cookieGet,
    set: mocks.cookieSet,
  })),
}));

vi.mock("@/backend/appwrite/server-client", () => ({
  createAccountClient: mocks.createAccountClient,
}));

import {
  AuthenticationServiceUnavailableError,
  clearAuthSession,
  getAuthSessionSecret,
  getCurrentAppwriteUser,
  resolveAppwriteSession,
  setAuthSessionSecret,
} from "../auth-session-service";

describe("lender Appwrite session lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cookieGet.mockReturnValue(undefined);
    mocks.createAccountClient.mockReturnValue({ get: mocks.accountGet });
  });

  it("returns anonymous when the browser has no session cookie", async () => {
    await expect(resolveAppwriteSession()).resolves.toEqual({
      status: "anonymous",
    });
    expect(mocks.createAccountClient).not.toHaveBeenCalled();
    expect(mocks.cookieDelete).not.toHaveBeenCalled();
  });

  it("returns the authenticated Appwrite user for a valid session", async () => {
    const user = { $id: "user_A", email: "owner@example.test" };
    mocks.cookieGet.mockReturnValue({ value: "valid-session" });
    mocks.accountGet.mockResolvedValue(user);

    await expect(resolveAppwriteSession()).resolves.toEqual({
      status: "authenticated",
      user,
    });
    expect(mocks.createAccountClient).toHaveBeenCalledWith("valid-session");
    expect(mocks.cookieDelete).not.toHaveBeenCalled();
  });

  it("classifies an Appwrite 401 as invalid without mutating cookies", async () => {
    mocks.cookieGet.mockReturnValue({ value: "expired-session" });
    mocks.accountGet.mockRejectedValue(
      new AppwriteException("Invalid session", 401, "user_unauthorized"),
    );

    await expect(resolveAppwriteSession()).resolves.toEqual({
      status: "invalid",
    });
    expect(mocks.cookieDelete).not.toHaveBeenCalled();
  });

  it.each([
    new AppwriteException("Service unavailable", 503, "general_server_error"),
    new Error("network timeout"),
  ])("preserves the cookie when Appwrite is unavailable", async (error) => {
    mocks.cookieGet.mockReturnValue({ value: "preserved-session" });
    mocks.accountGet.mockRejectedValue(error);

    await expect(resolveAppwriteSession()).resolves.toEqual({
      status: "unavailable",
    });
    expect(mocks.cookieDelete).not.toHaveBeenCalled();
  });

  it("sets the lender cookie with the Appwrite expiry and security flags", async () => {
    await setAuthSessionSecret("new-session", "2030-01-02T03:04:05.000Z");

    expect(mocks.cookieSet).toHaveBeenCalledWith(
      "mortgagepro_session",
      "new-session",
      expect.objectContaining({
        expires: new Date("2030-01-02T03:04:05.000Z"),
        httpOnly: true,
        path: "/",
        sameSite: "lax",
      }),
    );
  });

  it("sets a session cookie without an explicit expiry", async () => {
    await setAuthSessionSecret("new-session");

    expect(mocks.cookieSet).toHaveBeenCalledWith(
      "mortgagepro_session",
      "new-session",
      expect.objectContaining({ expires: undefined }),
    );
  });

  it("reads and clears the lender session cookie", async () => {
    mocks.cookieGet.mockReturnValue({ value: "stored-session" });

    await expect(getAuthSessionSecret()).resolves.toBe("stored-session");
    await clearAuthSession();

    expect(mocks.cookieDelete).toHaveBeenCalledWith("mortgagepro_session");
  });

  it("returns the current user only for an authenticated session", async () => {
    const user = { $id: "user_A", email: "owner@example.test" };
    mocks.cookieGet.mockReturnValue({ value: "valid-session" });
    mocks.accountGet.mockResolvedValue(user);

    await expect(getCurrentAppwriteUser()).resolves.toEqual(user);

    mocks.cookieGet.mockReturnValue(undefined);
    await expect(getCurrentAppwriteUser()).resolves.toBeNull();
  });

  it("throws a typed error when authentication is unavailable", async () => {
    mocks.cookieGet.mockReturnValue({ value: "preserved-session" });
    mocks.accountGet.mockRejectedValue(new Error("network timeout"));

    await expect(getCurrentAppwriteUser()).rejects.toBeInstanceOf(
      AuthenticationServiceUnavailableError,
    );
    expect(new AuthenticationServiceUnavailableError().name).toBe(
      "AuthenticationServiceUnavailableError",
    );
  });
});
