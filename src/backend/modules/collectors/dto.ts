import { contactInfo, optionalString, requiredString, status } from "../shared";

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
      phone: optionalString(input.phone),
      area: optionalString(input.area),
    }),
    status: status(input.status),
  };
}
