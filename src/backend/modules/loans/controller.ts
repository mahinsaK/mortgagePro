import { fail, ok, requiredString } from "../shared";
import { toCreateLoanDto } from "./dto";
import { LoanService } from "./service";

export class LoanController {
  constructor(private readonly loanService = new LoanService()) {}

  create(input: Record<string, unknown>) {
    try {
      const qrCode = requiredString(input.qrCode, "qrCode");
      return ok(this.loanService.prepareCreate(toCreateLoanDto(input), qrCode));
    } catch (error) {
      return fail(
        error instanceof Error ? error.message : "Loan creation failed.",
      );
    }
  }
}
