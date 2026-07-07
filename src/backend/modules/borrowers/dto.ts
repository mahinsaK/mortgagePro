import { contactInfo, optionalString, requiredString, status } from "../shared";

export type CreateBorrowerDto = {
  lenderId: string;
  name: string;
  businessName: string;
  contactInfo: string;
  status: "active" | "inactive";
};

export function toCreateBorrowerDto(
  input: Record<string, unknown>,
): CreateBorrowerDto {
  return {
    lenderId: requiredString(input.lenderId, "lenderId"),
    name: requiredString(input.name, "name"),
    businessName: optionalString(input.businessName),
    contactInfo: contactInfo({
      phone: optionalString(input.phone),
      address: optionalString(input.address),
    }),
    status: status(input.status),
  };
}
