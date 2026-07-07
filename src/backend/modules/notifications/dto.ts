import { optionalString, requiredString } from "../shared";

export type CreateNotificationDto = {
  lenderId: string;
  title: string;
  body: string;
  channel: "email" | "sms" | "in_app";
};

export function toCreateNotificationDto(
  input: Record<string, unknown>,
): CreateNotificationDto {
  const channel = optionalString(input.channel);

  return {
    lenderId: requiredString(input.lenderId, "lenderId"),
    title: requiredString(input.title, "title"),
    body: requiredString(input.body, "body"),
    channel:
      channel === "email" || channel === "sms" || channel === "in_app"
        ? channel
        : "in_app",
  };
}
