import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPrimaryLender: vi.fn(),
  listDocuments: vi.fn(),
}));

vi.mock("@/backend/appwrite/config", () => ({
  appwriteServerConfig: {
    databaseId: "database",
    collections: { collectors: "collectors" },
  },
}));

vi.mock("@/backend/appwrite/server-client", async () => {
  const { Query } = await import("node-appwrite");
  return { databases: { listDocuments: mocks.listDocuments }, Query };
});

vi.mock("@/backend/services/lender-service", () => ({
  getPrimaryLender: mocks.getPrimaryLender,
}));

import { GET } from "./route";

describe("collector username availability route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPrimaryLender.mockResolvedValue({ id: "lender_A" });
  });

  it("requires an authenticated lender", async () => {
    mocks.getPrimaryLender.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost/api/collectors/username?value=jordanlee4821"),
    );

    expect(response.status).toBe(401);
    expect(mocks.listDocuments).not.toHaveBeenCalled();
  });

  it("rejects invalid new usernames before querying Appwrite", async () => {
    const response = await GET(
      new Request("http://localhost/api/collectors/username?value=Jordan-Lee"),
    );

    expect(response.status).toBe(400);
    expect(mocks.listDocuments).not.toHaveBeenCalled();
  });

  it.each([
    [0, true],
    [1, false],
  ])("reports global availability when Appwrite total is %i", async (total, available) => {
    mocks.listDocuments.mockResolvedValue({ documents: [], total });

    const response = await GET(
      new Request("http://localhost/api/collectors/username?value=jordanlee4821"),
    );

    await expect(response.json()).resolves.toEqual({
      available,
      username: "jordanlee4821",
    });
    const queries = mocks.listDocuments.mock.calls[0][0].queries.join(" ");
    expect(queries).toContain('"attribute":"$id"');
    expect(queries).toContain('"values":["jordanlee4821"]');
    expect(queries).not.toContain('"attribute":"lender_id"');
  });
});
