import type { CreateCollectorDto } from "./dto";

export class CollectorService {
  prepareCreate(dto: CreateCollectorDto) {
    return {
      lender_id: dto.lenderId,
      name: dto.name,
      contact_info: dto.contactInfo,
      status: dto.status,
      created_at: new Date().toISOString(),
    };
  }
}
