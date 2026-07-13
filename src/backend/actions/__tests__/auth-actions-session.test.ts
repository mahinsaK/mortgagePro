import { AppwriteException } from "node-appwrite";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  accountDeleteSession: vi.fn(),
  adminCreateSession: vi.fn(),
  clearAuthSession: vi.fn(),
  getAuthSessionSecret: vi.fn(),
  listDocuments: vi.fn(),
  redirect: vi.fn(),
  setAuthSessionSecret: vi.fn(),
  userCreateSession: vi.fn(),
  userDeleteSession: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/backend/appwrite/config", () => ({
  appwriteServerConfig: {
    databaseId: "database",
    collections: { lenders: "lenders" },
  },
}));
vi.mock("@/backend/appwrite/server-client", async () => {
  const { ID, Query } = await import("node-appwrite");
  return {
    createAccountClient: vi.fn(() => ({
      deleteSession: mocks.accountDeleteSession,
    })),
    createAdminAccountClient: vi.fn(() => ({
      createEmailPasswordSession: mocks.adminCreateSession,
    })),
    databases: {
      createDocument: vi.fn(),
      listDocuments: mocks.listDocuments,
    },
    ID,
    Query,
    users: {
      create: vi.fn(),
      createSession: mocks.userCreateSession,
      deleteSession: mocks.userDeleteSession,
    },
  };
});
vi.mock("@/backend/services/auth-session-service", () => ({
  clearAuthSession: mocks.clearAuthSession,
  getAuthSessionSecret: mocks.getAuthSessionSecret,
  setAuthSessionSecret: mocks.setAuthSessionSecret,
}));

import { loginAction, logoutAction } from "../auth-actions";

const createdSession = {
  $id: "session_A",
  userId: "user_A",
  secret: "session-secret",
  expire: "2030-01-02T03:04:05.000Z",
};

function loginForm() {
  const formData = new FormData();
  formData.set("email", "owner@example.test");
  formData.set("password", "Password123!");
  return formData;
}

describe("lender session actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.redirect.mockImplementation((path: string) => {
      throw new Error(`redirect:${path}`);
    });
    mocks.adminCreateSession.mockResolvedValue(createdSession);
    mocks.listDocuments.mockResolvedValue({ documents: [{ $id: "lender_A" }] });
  });

  it("stores the single session returned by Appwrite login", async () => {
    await expect(loginAction(loginForm())).rejects.toThrow(
      "redirect:/dashboard/lender",
    );

    expect(mocks.adminCreateSession).toHaveBeenCalledTimes(1);
    expect(mocks.userCreateSession).not.toHaveBeenCalled();
    expect(mocks.setAuthSessionSecret).toHaveBeenCalledWith(
      "session-secret",
      "2030-01-02T03:04:05.000Z",
    );
    expect(mocks.userDeleteSession).not.toHaveBeenCalled();
  });

  it("revokes the new session when no active lender is linked", async () => {
    mocks.listDocuments.mockResolvedValue({ documents: [] });

    await expect(loginAction(loginForm())).rejects.toThrow(
      "redirect:/auth/login?status=error",
    );

    expect(mocks.setAuthSessionSecret).not.toHaveBeenCalled();
    expect(mocks.userDeleteSession).toHaveBeenCalledWith({
      userId: "user_A",
      sessionId: "session_A",
    });
  });

  it("revokes the new session when the browser cookie cannot be stored", async () => {
    mocks.setAuthSessionSecret.mockRejectedValue(new Error("cookie failure"));

    await expect(loginAction(loginForm())).rejects.toThrow(
      "redirect:/auth/unavailable",
    );
    expect(mocks.userDeleteSession).toHaveBeenCalledWith({
      userId: "user_A",
      sessionId: "session_A",
    });
  });

  it("does not create a cookie for rejected credentials", async () => {
    mocks.adminCreateSession.mockRejectedValue(
      new AppwriteException(
        "Invalid credentials",
        401,
        "user_invalid_credentials",
      ),
    );

    await expect(loginAction(loginForm())).rejects.toThrow(
      "redirect:/auth/login?status=error",
    );
    expect(mocks.setAuthSessionSecret).not.toHaveBeenCalled();
    expect(mocks.userDeleteSession).not.toHaveBeenCalled();
  });

  it("preserves the distinction between login rejection and an outage", async () => {
    mocks.adminCreateSession.mockRejectedValue(
      new AppwriteException("Unavailable", 503, "general_server_error"),
    );

    await expect(loginAction(loginForm())).rejects.toThrow(
      "redirect:/auth/unavailable",
    );
    expect(mocks.setAuthSessionSecret).not.toHaveBeenCalled();
  });

  it("always clears the browser cookie when logout revocation fails", async () => {
    mocks.getAuthSessionSecret.mockResolvedValue("expired-session");
    mocks.accountDeleteSession.mockRejectedValue(
      new AppwriteException("Invalid session", 401, "user_unauthorized"),
    );

    await expect(logoutAction()).rejects.toThrow("redirect:/auth/login");
    expect(mocks.clearAuthSession).toHaveBeenCalledTimes(1);
  });
});
