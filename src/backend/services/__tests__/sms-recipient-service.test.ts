import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  getPrimaryLender: vi.fn(),
  listDocuments: vi.fn(),
}));

vi.mock("../lender-service", () => ({
  getPrimaryLender: mocks.getPrimaryLender,
}));

vi.mock("@/backend/appwrite/config", () => ({
  appwriteServerConfig: {
    databaseId: "database",
    collections: {
      borrowers: "borrowers",
    },
  },
}));

vi.mock("@/backend/appwrite/server-client", async () => {
  const { Query } = await import("node-appwrite");

  return {
    databases: { listDocuments: mocks.listDocuments },
    Query,
  };
});

vi.mock("@/backend/services/search-text-service", () => ({
  normalizeSearchText(value: string) {
    return value.toLowerCase().replaceAll(/[^a-z0-9]+/g, " ").trim();
  },
}));

import { searchBorrowerSmsRecipients } from "../sms-recipient-service";

describe("sms-recipient-service", () => {
  beforeEach(() => {
    mocks.getPrimaryLender.mockResolvedValue({ id: "lender_1" });
    mocks.listDocuments.mockReset();
  });

  it("searches borrower name, business name, and contact directly", async () => {
    mocks.listDocuments.mockResolvedValue({
      documents: [
        {
          $id: "borrower_1",
          name: "Avery Johnson",
          business_name: "Johnson Market",
          contact: "+1 555 0101",
        },
        {
          $id: "borrower_2",
          name: "No Phone",
          business_name: "",
          contact: "",
        },
      ],
    });

    const recipients = await searchBorrowerSmsRecipients("Avery");
    const queries = mocks.listDocuments.mock.calls[0][0].queries as string[];

    expect(queries.join(" ")).toContain('"attribute":"name"');
    expect(queries.join(" ")).toContain('"attribute":"business_name"');
    expect(queries.join(" ")).toContain('"attribute":"contact"');
    expect(recipients).toEqual([
      {
        id: "borrower_1",
        name: "Avery Johnson",
        businessName: "Johnson Market",
        phoneNumber: "+1 555 0101",
      },
    ]);
  });
});
