import { requiredString } from "../shared";

export type LoginDto = {
  email: string;
  password: string;
};

export type RegisterLenderDto = LoginDto & {
  companyName: string;
};

export type PasswordResetDto = {
  email: string;
};

export function toLoginDto(input: Record<string, unknown>): LoginDto {
  return {
    email: requiredString(input.email, "email").toLowerCase(),
    password: requiredString(input.password, "password"),
  };
}

export function toRegisterLenderDto(
  input: Record<string, unknown>,
): RegisterLenderDto {
  return {
    ...toLoginDto(input),
    companyName: requiredString(input.companyName, "companyName"),
  };
}

export function toPasswordResetDto(
  input: Record<string, unknown>,
): PasswordResetDto {
  return {
    email: requiredString(input.email, "email").toLowerCase(),
  };
}
