import { fail, ok } from "../shared";
import { toCreateNotificationDto } from "./dto";
import { NotificationService } from "./service";

export class NotificationController {
  constructor(
    private readonly notificationService = new NotificationService(),
  ) {}

  create(input: Record<string, unknown>) {
    try {
      return ok(
        this.notificationService.prepareCreate(toCreateNotificationDto(input)),
      );
    } catch (error) {
      return fail(
        error instanceof Error ? error.message : "Notification creation failed.",
      );
    }
  }
}
