import { fail, ok } from "../shared";
import {
  toNotificationContextDto,
  type LocalNotificationItem,
} from "./dto";
import {
  NotificationService,
  type NotificationSource,
} from "./service";

export class NotificationController {
  constructor(
    private readonly notificationService = new NotificationService(),
  ) {}

  generate(
    input: Record<string, unknown>,
    source: NotificationSource,
    generatedAt?: string,
  ) {
    try {
      return ok<LocalNotificationItem[]>(
        this.notificationService.generate(
          toNotificationContextDto(input),
          source,
          generatedAt,
        ),
      );
    } catch (error) {
      return fail<LocalNotificationItem[]>(
        error instanceof Error
          ? error.message
          : "Notification generation failed.",
      );
    }
  }
}
