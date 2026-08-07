import { optionalString, requiredString } from "../shared";
import { normalizeRequiredPhoneNumber } from "@/shared/phone-number";

export type SmsPurpose = "manual" | "loan_welcome" | "loan_completed";

export type SendSmsDto = {
  lenderId: string;
  phoneNumber: string;
  message: string;
  purpose: SmsPurpose;
};

const smsPurposes: SmsPurpose[] = ["manual", "loan_welcome", "loan_completed"];

export function toSendSmsDto(input: Record<string, unknown>): SendSmsDto {
  const message = requiredString(input.message, "message");

  if (message.length > 480) {
    throw new Error("message must be 480 characters or fewer.");
  }

  return {
    lenderId: requiredString(input.lenderId, "lenderId"),
    phoneNumber: normalizeRequiredPhoneNumber(input.phoneNumber, "phoneNumber"),
    message,
    purpose: smsPurpose(input.purpose),
  };
}

function smsPurpose(value: unknown): SmsPurpose {
  const purpose = optionalString(value);

  return smsPurposes.includes(purpose as SmsPurpose)
    ? (purpose as SmsPurpose)
    : "manual";
}
