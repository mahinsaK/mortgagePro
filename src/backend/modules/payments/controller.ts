import { fail, ok } from "../shared";
import { toRecordPaymentDto } from "./dto";
import { PaymentService } from "./service";

export class PaymentController {
  constructor(private readonly paymentService = new PaymentService()) {}

  record(input: Record<string, unknown>) {
    try {
      return ok(this.paymentService.prepareRecord(toRecordPaymentDto(input)));
    } catch (error) {
      return fail(
        error instanceof Error ? error.message : "Payment recording failed.",
      );
    }
  }
}
