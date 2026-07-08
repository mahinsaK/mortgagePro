import { optionalString, requiredString, status } from "../shared";

export type CreateBorrowerDto = {
  lenderId: string;
  name: string;
  businessName: string;
  contact: string;
  address: string;
  status: "active" | "inactive";
};

export function toCreateBorrowerDto(
  input: Record<string, unknown>,
): CreateBorrowerDto {
  return {
    lenderId: requiredString(input.lenderId, "lenderId"),
    name: requiredString(input.name, "name"),
    businessName: optionalString(input.businessName),
    contact: optionalString(input.phone),
    address: optionalString(input.address),
    status: status(input.status),
  };
}
