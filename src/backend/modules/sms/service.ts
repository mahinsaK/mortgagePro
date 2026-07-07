import type { SendSmsDto } from "./dto";

export type SmsSendResult = {
  lenderId: string;
  provider: "temporary";
  providerMessageId: string;
  to: string;
  message: string;
  purpose: SendSmsDto["purpose"];
  status: "queued";
  queuedAt: string;
};

export class SmsService {
  async send(dto: SendSmsDto): Promise<SmsSendResult> {
    return {
      lenderId: dto.lenderId,
      provider: "temporary",
      providerMessageId: createProviderMessageId(),
      to: dto.phoneNumber,
      message: dto.message,
      purpose: dto.purpose,
      status: "queued",
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

function createProviderMessageId() {
  return `temporary_sms_${crypto.randomUUID().replaceAll("-", "").slice(0, 18)}`;
}
