import type { CreateBorrowerDto } from "./dto";

export class BorrowerService {
  prepareCreate(dto: CreateBorrowerDto) {
    return {
      lender_id: dto.lenderId,
      name: dto.name,
      business_name: dto.businessName,
      contact_info: dto.contactInfo,
      status: dto.status,
      created_at: new Date().toISOString(),
    };
  }
}
