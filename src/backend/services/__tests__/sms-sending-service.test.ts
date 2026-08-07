import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SmsProvider } from "@/backend/modules/sms/service";

const mocks = vi.hoisted(() => ({
  createDocument: vi.fn(),
  createTransaction: vi.fn(),
  getDocument: vi.fn(),
  listDocuments: vi.fn(),
  updateDocument: vi.fn(),
  updateTransaction: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/backend/appwrite/config", () => ({
  appwriteServerConfig: {
    databaseId: "database",
    collections: {
      smsAccounts: "sms_accounts",
      smsMonthlyUsage: "sms_monthly_usage",
      smsSenderRequests: "sms_sender_requests",
      smsSendLogs: "sms_send_logs",
    },
  },
}));
vi.mock("@/backend/appwrite/server-client", async () => {
  const { Query } = await import("node-appwrite");
  return {
    databases: {
      createDocument: mocks.createDocument,
      createTransaction: mocks.createTransaction,
      getDocument: mocks.getDocument,
      listDocuments: mocks.listDocuments,
      updateDocument: mocks.updateDocument,
      updateTransaction: mocks.updateTransaction,
    },
    Query,
  };
});

import {
  sendTenantSmsBatch,
  SmsSendingError,
} from "../sms-sending-service";

const input = {
  lenderId: "lender_A",
  message: "Payment reminder",
  phoneNumbers: ["+94 77 111 1111", "+94 77 222 2222"],
  purpose: "manual" as const,
  requestId: "12345678-1234-1234-1234-123456789012",
};

describe("sendTenantSmsBatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    let transactionNumber = 0;
    let logReads = 0;
    let usageReads = 0;

    mocks.createTransaction.mockImplementation(() => {
      transactionNumber += 1;
      return Promise.resolve({ $id: "transaction_" + transactionNumber });
    });
    mocks.getDocument.mockImplementation(
      ({ collectionId }: { collectionId: string }) => {
        if (collectionId === "sms_accounts") {
          return Promise.resolve({
            $id: "lender_A",
            lender_id: "lender_A",
            monthly_quota: 100,
            status: "active",
          });
        }
        if (collectionId === "sms_send_logs") {
          logReads += 1;
          if (logReads === 1) return Promise.reject({ code: 404 });
          return Promise.resolve({
            $id: "batch_A",
            lender_id: "lender_A",
            requested_recipients: 2,
            reserved_units: 2,
            sent_recipients: 0,
            failed_recipients: 0,
            status: "processing",
            used_units: 0,
          });
        }
        if (collectionId === "sms_monthly_usage") {
          usageReads += 1;
          if (usageReads === 1) return Promise.reject({ code: 404 });
          return Promise.resolve({
            $id: "usage_A",
            lender_id: "lender_A",
            sent_recipients: 0,
            failed_recipients: 0,
            sent_units: 0,
            reserved_units: 2,
            batch_count: 0,
          });
        }
        return Promise.reject({ code: 404 });
      },
    );
    mocks.listDocuments.mockResolvedValue({
      documents: [{ $id: "sender", sender_id: "MortgagePro" }],
    });
    mocks.createDocument.mockResolvedValue({});
    mocks.updateDocument.mockResolvedValue({});
    mocks.updateTransaction.mockResolvedValue({});
  });

  it("reserves quota, sends with the lender sender, and stores sanitized summaries", async () => {
    const provider = successfulProvider();
    const result = await sendTenantSmsBatch(input, provider);

    expect(result).toMatchObject({
      duplicate: false,
      requestedRecipients: 2,
      sentRecipients: 2,
      failedRecipients: 0,
      status: "sent",
      usedUnits: 2,
    });
    expect(provider.send).toHaveBeenCalledTimes(2);
    expect(provider.send).toHaveBeenCalledWith(
      expect.objectContaining({ senderId: "MortgagePro" }),
    );

    const logCreate = mocks.createDocument.mock.calls.find(
      ([call]) => call.collectionId === "sms_send_logs",
    )?.[0];
    expect(logCreate.data).not.toHaveProperty("message");
    expect(logCreate.data).not.toHaveProperty("phone_number");
    expect(logCreate.data).not.toHaveProperty("recipients");
    expect(logCreate.data).toMatchObject({
      requested_recipients: 2,
      reserved_units: 2,
      status: "processing",
    });
  });

  it("rejects the whole batch before provider delivery when quota is insufficient", async () => {
    mocks.getDocument.mockImplementation(
      ({ collectionId }: { collectionId: string }) => {
        if (collectionId === "sms_accounts") {
          return Promise.resolve({
            lender_id: "lender_A",
            monthly_quota: 1,
            status: "active",
          });
        }
        return Promise.reject({ code: 404 });
      },
    );
    const provider = successfulProvider();

    await expect(sendTenantSmsBatch(input, provider)).rejects.toMatchObject({
      code: "quota_exceeded",
    });
    expect(provider.send).not.toHaveBeenCalled();
    expect(mocks.createDocument).not.toHaveBeenCalled();
  });

  it("releases failed-recipient units and records a partial result", async () => {
    const provider: SmsProvider = {
      send: vi
        .fn()
        .mockResolvedValueOnce({
          provider: "test",
          providerMessageId: "one",
          status: "sent",
        })
        .mockRejectedValueOnce(new Error("provider rejected recipient")),
    };

    const result = await sendTenantSmsBatch(input, provider);

    expect(result).toMatchObject({
      sentRecipients: 1,
      failedRecipients: 1,
      status: "partial",
      usedUnits: 1,
    });
    expect(mocks.updateDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        collectionId: "sms_monthly_usage",
        data: expect.objectContaining({
          reserved_units: 0,
          sent_units: 1,
        }),
      }),
    );
  });

  it("uses Text.lk's returned SMS count for finalized quota", async () => {
    const provider: SmsProvider = {
      send: vi.fn().mockResolvedValue({
        provider: "textlk",
        providerMessageId: "message",
        status: "sent",
        unitsUsed: 2,
      }),
    };

    const result = await sendTenantSmsBatch(input, provider);

    expect(result.usedUnits).toBe(4);
    expect(mocks.updateDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        collectionId: "sms_monthly_usage",
        data: expect.objectContaining({ sent_units: 4 }),
      }),
    );
  });

  it("retains the reservation and marks review required if finalization fails", async () => {
    let commitNumber = 0;
    mocks.updateTransaction.mockImplementation(
      ({ commit }: { commit?: boolean }) => {
        if (!commit) return Promise.resolve({});
        commitNumber += 1;
        return commitNumber === 1
          ? Promise.resolve({})
          : Promise.reject(new Error("finalization unavailable"));
      },
    );

    await expect(
      sendTenantSmsBatch(input, successfulProvider()),
    ).rejects.toMatchObject({ code: "review_required" });
    expect(mocks.updateDocument).toHaveBeenCalledWith({
      databaseId: "database",
      collectionId: "sms_send_logs",
      documentId: expect.any(String),
      data: { status: "review_required" },
    });
  });

  it("returns final duplicate batches without another provider call", async () => {
    mocks.getDocument.mockImplementation(
      ({ collectionId }: { collectionId: string }) => {
        if (collectionId === "sms_send_logs") {
          return Promise.resolve({
            $id: "batch_existing",
            requested_recipients: 2,
            sent_recipients: 2,
            failed_recipients: 0,
            used_units: 2,
            status: "sent",
          });
        }
        if (collectionId === "sms_accounts") {
          return Promise.resolve({
            lender_id: "lender_A",
            monthly_quota: 100,
            status: "active",
          });
        }
        return Promise.reject({ code: 404 });
      },
    );
    const provider = successfulProvider();

    await expect(sendTenantSmsBatch(input, provider)).resolves.toMatchObject({
      duplicate: true,
      sentRecipients: 2,
    });
    expect(provider.send).not.toHaveBeenCalled();
  });

  it("rejects malformed request IDs without opening a transaction", async () => {
    await expect(
      sendTenantSmsBatch({ ...input, requestId: "short" }, successfulProvider()),
    ).rejects.toBeInstanceOf(SmsSendingError);
    expect(mocks.createTransaction).not.toHaveBeenCalled();
  });
});

function successfulProvider(): SmsProvider & { send: ReturnType<typeof vi.fn> } {
  return {
    send: vi.fn().mockResolvedValue({
      provider: "test",
      providerMessageId: "message",
      status: "sent",
    }),
  };
}
