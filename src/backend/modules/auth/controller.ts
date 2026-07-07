import { fail, ok } from "../shared";
import { toLoginDto, toPasswordResetDto, toRegisterLenderDto } from "./dto";
import { AuthService } from "./service";

export class AuthController {
  constructor(private readonly authService = new AuthService()) {}

  login(input: Record<string, unknown>) {
    try {
      return ok(this.authService.prepareLogin(toLoginDto(input)));
    } catch (error) {
      return fail(error instanceof Error ? error.message : "Login failed.");
    }
  }

  registerLender(input: Record<string, unknown>) {
    try {
      return ok(
        this.authService.prepareLenderRegistration(toRegisterLenderDto(input)),
      );
    } catch (error) {
      return fail(
        error instanceof Error ? error.message : "Registration failed.",
      );
    }
  }

  requestPasswordReset(input: Record<string, unknown>) {
    try {
      return ok(
        this.authService.preparePasswordReset(toPasswordResetDto(input)),
      );
    } catch (error) {
      return fail(
        error instanceof Error ? error.message : "Password reset failed.",
      );
    }
  }
}
