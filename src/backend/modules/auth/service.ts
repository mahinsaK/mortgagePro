import type { LoginDto, PasswordResetDto, RegisterLenderDto } from "./dto";

export class AuthService {
  prepareLogin(dto: LoginDto) {
    return {
      email: dto.email,
      password: dto.password,
    };
  }

  prepareLenderRegistration(dto: RegisterLenderDto) {
    return {
      email: dto.email,
      password: dto.password,
      companyName: dto.companyName,
    };
  }

  preparePasswordReset(dto: PasswordResetDto) {
    return {
      email: dto.email,
    };
  }
}
