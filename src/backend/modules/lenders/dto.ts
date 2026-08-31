import { normalizeCurrency } from "../../lib/currency";
import { contactInfo, optionalString, requiredString, status } from "../shared";
import { normalizeOptionalPhoneNumber } from "@/shared/phone-number";

export type UpdateLenderProfileDto = {
  companyName: string;
  email: string;
  contactInfo: string;
  status: "active" | "inactive";
  currency: string;
};

export function toUpdateLenderProfileDto(
  input: Record<string, unknown>,
): UpdateLenderProfileDto {
  return {
    companyName: requiredString(input.companyName, "companyName"),
    email: requiredString(input.email, "email").toLowerCase(),
    contactInfo: contactInfo({
      phone: normalizeOptionalPhoneNumber(input.phone),
      address: optionalString(input.address),
    }),
    status: status(input.status),
    currency: normalizeCurrency(optionalString(input.currency)),
  };
}
