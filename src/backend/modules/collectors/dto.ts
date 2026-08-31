import { contactInfo, optionalString, requiredString, status } from "../shared";
import { normalizeOptionalPhoneNumber } from "@/shared/phone-number";

export type CreateCollectorDto = {
  lenderId: string;
  name: string;
  contactInfo: string;
  status: "active" | "inactive";
};

export function toCreateCollectorDto(
  input: Record<string, unknown>,
): CreateCollectorDto {
  return {
    lenderId: requiredString(input.lenderId, "lenderId"),
    name: requiredString(input.name, "name"),
    contactInfo: contactInfo({
      phone: normalizeOptionalPhoneNumber(input.phone),
      area: optionalString(input.area),
    }),
    status: status(input.status),
  };
}
