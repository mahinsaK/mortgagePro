import { normalizeCurrency } from "../../lib/currency";
import { contactInfo, optionalString, requiredString, status } from "../shared";

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
      phone: optionalString(input.phone),
      address: optionalString(input.address),
    }),
    status: status(input.status),
    currency: normalizeCurrency(optionalString(input.currency)),
  };
}
