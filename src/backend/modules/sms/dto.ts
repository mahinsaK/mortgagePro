import { optionalString, requiredString } from "../shared";

export type SmsPurpose = "manual" | "loan_welcome" | "loan_completed";

export type SendSmsDto = {
  lenderId: string;
  phoneNumber: string;
  message: string;
  purpose: SmsPurpose;
  senderId: string;
};

const smsPurposes: SmsPurpose[] = ["manual", "loan_welcome", "loan_completed"];

export function toSendSmsDto(input: Record<string, unknown>): SendSmsDto {
  const message = requiredString(input.message, "message");

  if (message.length > 480) {
    throw new Error("message must be 480 characters or fewer.");
  }

  return {
    lenderId: requiredString(input.lenderId, "lenderId"),
    phoneNumber: normalizeSmsPhoneNumber(input.phoneNumber),
    message,
    purpose: smsPurpose(input.purpose),
    senderId: requiredString(input.senderId, "senderId"),
  };
}

export function normalizeSmsPhoneNumber(value: unknown) {
  const phoneNumber = requiredString(value, "phoneNumber");
  const digits = phoneNumber.replace(/\D/g, "");

  if (digits.length < 7 || digits.length > 15) {
    throw new Error("phoneNumber must contain 7 to 15 digits.");
  }

  return phoneNumber.trim().startsWith("+") ? `+${digits}` : digits;
}

function smsPurpose(value: unknown): SmsPurpose {
  const purpose = optionalString(value);

  return smsPurposes.includes(purpose as SmsPurpose)
    ? (purpose as SmsPurpose)
    : "manual";
}
