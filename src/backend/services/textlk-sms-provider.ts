import "server-only";

import type {
  SmsProvider,
  SmsProviderInput,
  SmsProviderResult,
} from "@/backend/modules/sms/service";

const defaultTextlkApiUrl = "https://app.text.lk/api/v3/sms/send";

export class TextlkSmsProvider implements SmsProvider {
  constructor(
    private readonly config = {
      apiToken: process.env.TEXTLK_API_TOKEN ?? "",
      apiUrl: process.env.TEXTLK_API_URL || defaultTextlkApiUrl,
      senderId: process.env.TEXTLK_SENDER_ID ?? "",
    },
  ) {}

  async send(input: SmsProviderInput): Promise<SmsProviderResult> {
    if (!this.config.apiToken) {
      throw new Error("TEXTLK_API_TOKEN is not configured.");
    }

    if (!this.config.senderId) {
      throw new Error("TEXTLK_SENDER_ID is not configured.");
    }

    const response = await fetch(this.config.apiUrl, {
      body: toRequestBody({
        message: input.message,
        recipient: input.to,
        senderId: this.config.senderId,
      }),
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${this.config.apiToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    });
    const responseBody = await parseResponse(response);

    if (!response.ok) {
      throw new Error(getProviderError(responseBody, response.status));
    }

    return {
      provider: "textlk",
      providerMessageId: getProviderMessageId(responseBody),
      status: "sent",
    };
  }
}

function toRequestBody(input: {
  recipient: string;
  senderId: string;
  message: string;
}) {
  const body = new URLSearchParams();

  body.set("recipient", input.recipient);
  body.set("sender_id", input.senderId);
  body.set("type", "plain");
  body.set("message", input.message);

  return body;
}

async function parseResponse(response: Response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { message: text };
  }
}

function getProviderMessageId(responseBody: Record<string, unknown>) {
  const data = isRecord(responseBody.data) ? responseBody.data : {};
  const id =
    data.uid ??
    data.id ??
    responseBody.uid ??
    responseBody.id ??
    responseBody.message_id;

  return String(id ?? `textlk_${crypto.randomUUID().replaceAll("-", "").slice(0, 18)}`);
}

function getProviderError(responseBody: Record<string, unknown>, status: number) {
  const data = isRecord(responseBody.data) ? responseBody.data : {};
  const error = responseBody.message ?? responseBody.error ?? data.message ?? data.error;

  return `Text.lk SMS failed (${status}): ${String(error ?? "Unknown error")}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
