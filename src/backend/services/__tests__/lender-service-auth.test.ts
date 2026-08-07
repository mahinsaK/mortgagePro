import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  appwriteConfig: {
    apiKey: "runtime-key",
    databaseId: "database",
    collections: { lenders: "lenders" },
  },
  getDocument: vi.fn(),
  listDocuments: vi.fn(),
  resolveAppwriteSession: vi.fn(),
}));

vi.mock("@/backend/appwrite/config", () => ({
  appwriteServerConfig: mocks.appwriteConfig,
}));

vi.mock("@/backend/appwrite/server-client", async () => {
  const { Query } = await import("node-appwrite");
  return {
    databases: {
      getDocument: mocks.getDocument,
      listDocuments: mocks.listDocuments,
    },
    Query,
  };
});

vi.mock("@/backend/services/auth-session-service", async () => {
  const actual = await vi.importActual<
    typeof import("@/backend/services/auth-session-service")
  >("@/backend/services/auth-session-service");
  return {
    ...actual,
    resolveAppwriteSession: mocks.resolveAppwriteSession,
  };
});

import {
  getLenderCurrencyById,
  resolvePrimaryLender,
} from "../lender-service";

describe("lender authentication resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.appwriteConfig.apiKey = "runtime-key";
  });

  it("returns anonymous without requiring Appwrite configuration", async () => {
    mocks.appwriteConfig.apiKey = "";
    mocks.resolveAppwriteSession.mockResolvedValue({ status: "anonymous" });

    await expect(resolvePrimaryLender()).resolves.toEqual({
      status: "anonymous",
    });
    expect(mocks.listDocuments).not.toHaveBeenCalled();
  });

  it("requires Appwrite configuration only for an authenticated session", async () => {
    mocks.appwriteConfig.apiKey = "";
    mocks.resolveAppwriteSession.mockResolvedValue({
      status: "authenticated",
      user: { $id: "user_A" },
    });

    await expect(resolvePrimaryLender()).resolves.toEqual({
      status: "unavailable",
    });
    expect(mocks.listDocuments).not.toHaveBeenCalled();
  });

  it("maps a valid session to its active lender", async () => {
    mocks.resolveAppwriteSession.mockResolvedValue({
      status: "authenticated",
      user: { $id: "user_A" },
    });
    mocks.listDocuments.mockResolvedValue({
      documents: [
        {
          $id: "lender_A",
          appwrite_user_id: "user_A",
          company_name: "Lender A",
          email: "owner@example.test",
          status: "active",
          currency: "USD",
        },
      ],
    });

    await expect(resolvePrimaryLender()).resolves.toMatchObject({
      status: "authenticated",
      lender: { id: "lender_A", appwriteUserId: "user_A" },
    });
  });

  it("returns inactive when the user has no active lender profile", async () => {
    mocks.resolveAppwriteSession.mockResolvedValue({
      status: "authenticated",
      user: { $id: "user_A" },
    });
    mocks.listDocuments.mockResolvedValue({
      documents: [{ $id: "lender_A", status: "inactive" }],
    });

    await expect(resolvePrimaryLender()).resolves.toEqual({
      status: "inactive",
    });
  });

  it("preserves invalid and unavailable session states", async () => {
    mocks.resolveAppwriteSession.mockResolvedValueOnce({ status: "invalid" });
    await expect(resolvePrimaryLender()).resolves.toEqual({ status: "invalid" });

    mocks.resolveAppwriteSession.mockResolvedValueOnce({
      status: "unavailable",
    });
    await expect(resolvePrimaryLender()).resolves.toEqual({
      status: "unavailable",
    });
  });

  it("returns unavailable when the lender lookup fails", async () => {
    mocks.resolveAppwriteSession.mockResolvedValue({
      status: "authenticated",
      user: { $id: "user_A" },
    });
    mocks.listDocuments.mockRejectedValue(new Error("Appwrite unavailable"));

    await expect(resolvePrimaryLender()).resolves.toEqual({
      status: "unavailable",
    });
  });

  it("loads the collector display currency directly from its lender", async () => {
    mocks.getDocument.mockResolvedValue({ currency: "lkr" });

    await expect(getLenderCurrencyById("lender_A")).resolves.toBe("LKR");
    expect(mocks.getDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        collectionId: "lenders",
        documentId: "lender_A",
      }),
    );
  });
});
