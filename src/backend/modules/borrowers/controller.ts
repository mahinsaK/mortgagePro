import { fail, ok } from "../shared";
import { toCreateBorrowerDto } from "./dto";
import { BorrowerService } from "./service";

export class BorrowerController {
  constructor(private readonly borrowerService = new BorrowerService()) {}

  create(input: Record<string, unknown>) {
    try {
      return ok(this.borrowerService.prepareCreate(toCreateBorrowerDto(input)));
    } catch (error) {
      return fail(
        error instanceof Error ? error.message : "Borrower creation failed.",
      );
    }
  }
}
