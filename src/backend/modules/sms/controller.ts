import { fail, ok } from "../shared";
import { toSendSmsDto } from "./dto";
import { SmsService } from "./service";

export class SmsController {
  constructor(private readonly smsService = new SmsService()) {}

  async send(input: Record<string, unknown>) {
    try {
      return ok(await this.smsService.send(toSendSmsDto(input)));
    } catch (error) {
      return fail(error instanceof Error ? error.message : "SMS send failed.");
    }
  }

  createLoanWelcomeMessage(input: {
    borrowerName: string;
    companyName: string;
  }) {
    return this.smsService.createLoanWelcomeMessage(input);
  }

  createLoanCompletedMessage(input: {
    borrowerName: string;
    companyName: string;
  }) {
    return this.smsService.createLoanCompletedMessage(input);
  }
}
