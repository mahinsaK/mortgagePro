import type { CreateNotificationDto } from "./dto";

export class NotificationService {
  prepareCreate(dto: CreateNotificationDto) {
    return {
      lender_id: dto.lenderId,
      title: dto.title,
      body: dto.body,
      channel: dto.channel,
      status: "draft",
      created_at: new Date().toISOString(),
    };
  }
}
