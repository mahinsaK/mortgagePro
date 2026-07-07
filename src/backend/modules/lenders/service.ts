import type { UpdateLenderProfileDto } from "./dto";

export class LenderService {
  prepareProfileUpdate(dto: UpdateLenderProfileDto) {
    return {
      company_name: dto.companyName,
      email: dto.email,
      contact_info: dto.contactInfo,
      status: dto.status,
      currency: dto.currency,
    };
  }
}
