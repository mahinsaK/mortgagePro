import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("TextlkSmsProvider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends JSON payloads with the expected TextLK fields", async () => {
    const { TextlkSmsProvider } = await import("../textlk-sms-provider");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "success",
          data: { uid: "sms_123" },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    const provider = new TextlkSmsProvider({
      apiToken: "token_123",
      apiUrl: "https://example.test/sms",
    });

    await expect(
      provider.send({
        lenderId: "lender_1",
        to: "+94771234567",
        message: "Hello there",
        purpose: "manual",
        senderId: "TextLKDemo",
      }),
    ).resolves.toMatchObject({
      provider: "textlk",
      providerMessageId: "sms_123",
      status: "sent",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.test/sms",
      expect.objectContaining({
        body: JSON.stringify({
          recipient: "+94771234567",
          sender_id: "TextLKDemo",
          type: "plain",
          message: "Hello there",
        }),
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        method: "POST",
      }),
    );
  });

  it("throws when TextLK returns an error status in the response body", async () => {
    const { TextlkSmsProvider } = await import("../textlk-sms-provider");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "error",
          message: "The recipient field is required.",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    const provider = new TextlkSmsProvider({
      apiToken: "token_123",
      apiUrl: "https://example.test/sms",
    });

    await expect(
      provider.send({
        lenderId: "lender_1",
        to: "+94771234567",
        message: "Hello there",
        purpose: "manual",
        senderId: "TextLKDemo",
      }),
    ).rejects.toThrow("The recipient field is required.");
  });
});
