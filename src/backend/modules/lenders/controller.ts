import { fail, ok } from "../shared";
import { toUpdateLenderProfileDto } from "./dto";
import { LenderService } from "./service";

export class LenderController {
  constructor(private readonly lenderService = new LenderService()) {}

  updateProfile(input: Record<string, unknown>) {
    try {
      return ok(
        this.lenderService.prepareProfileUpdate(
          toUpdateLenderProfileDto(input),
        ),
      );
    } catch (error) {
      return fail(
        error instanceof Error ? error.message : "Profile update failed.",
      );
    }
  }
}
