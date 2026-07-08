import type { CreateBorrowerDto } from "./dto";

export class BorrowerService {
  prepareCreate(dto: CreateBorrowerDto) {
    return {
      lender_id: dto.lenderId,
      name: dto.name,
      business_name: dto.businessName,
      contact: dto.contact,
      address: dto.address,
      status: dto.status,
      created_at: new Date().toISOString(),
    };
  }
}
