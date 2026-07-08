import type { SendSmsDto } from "./dto";

export type SmsSendResult = {
  lenderId: string;
  provider: string;
  providerMessageId: string;
  to: string;
  message: string;
  purpose: SendSmsDto["purpose"];
  status: "queued" | "sent";
  queuedAt: string;
};

export type SmsProviderInput = {
  to: string;
  message: string;
  purpose: SendSmsDto["purpose"];
  lenderId: string;
};

export type SmsProviderResult = {
  provider: string;
  providerMessageId: string;
  status: "queued" | "sent";
};

export type SmsProvider = {
  send(input: SmsProviderInput): Promise<SmsProviderResult>;
};

export class SmsService {
  constructor(private readonly smsProvider: SmsProvider = new TemporarySmsProvider()) {}

  async send(dto: SendSmsDto): Promise<SmsSendResult> {
    const providerResult = await this.smsProvider.send({
      lenderId: dto.lenderId,
      message: dto.message,
      purpose: dto.purpose,
      to: dto.phoneNumber,
    });

    return {
      lenderId: dto.lenderId,
      provider: providerResult.provider,
      providerMessageId: providerResult.providerMessageId,
      to: dto.phoneNumber,
      message: dto.message,
      purpose: dto.purpose,
      status: providerResult.status,
      queuedAt: new Date().toISOString(),
    };
  }

  createLoanWelcomeMessage(input: {
    borrowerName: string;
    companyName: string;
  }) {
    return `Hi ${input.borrowerName}, your loan with ${input.companyName} has been created. Thank you for choosing us.`;
  }

  createLoanCompletedMessage(input: {
    borrowerName: string;
    companyName: string;
  }) {
    return `Hi ${input.borrowerName}, thank you. Your loan with ${input.companyName} has been completed.`;
  }
}

class TemporarySmsProvider implements SmsProvider {
  async send(): Promise<SmsProviderResult> {
    return {
      provider: "temporary",
      providerMessageId: `temporary_sms_${crypto.randomUUID().replaceAll("-", "").slice(0, 18)}`,
      status: "queued",
    };
  }
}
