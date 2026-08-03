import { requiredString } from "../shared";

export type LocalNotificationKind =
  | "loans_overdue"
  | "loans_ending_today"
  | "loans_ending_soon"
  | "no_collections_today"
  | "borrowers_missing_phone";

export type LocalNotificationSeverity = "urgent" | "warning" | "info";

export type LocalNotificationItem = {
  id: string;
  kind: LocalNotificationKind;
  severity: LocalNotificationSeverity;
  title: string;
  body: string;
  href: string;
  generatedAt: string;
};

export type LocalNotificationResponse = {
  items: LocalNotificationItem[];
  ownerKey: string;
  generatedAt: string;
};

export type NotificationContextDto = {
  localDate: string;
  timezoneOffsetMinutes: number;
};

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const INTEGER_PATTERN = /^-?\d+$/;

export function toNotificationContextDto(
  input: Record<string, unknown>,
): NotificationContextDto {
  const localDate = requiredString(input.localDate, "localDate");
  const rawOffset = requiredString(
    input.timezoneOffsetMinutes,
    "timezoneOffsetMinutes",
  );

  if (!isValidDateOnly(localDate)) {
    throw new Error("localDate must be a valid date in YYYY-MM-DD format.");
  }

  if (!INTEGER_PATTERN.test(rawOffset)) {
    throw new Error("timezoneOffsetMinutes must be a whole number.");
  }

  const timezoneOffsetMinutes = Number(rawOffset);

  if (timezoneOffsetMinutes < -840 || timezoneOffsetMinutes > 840) {
    throw new Error("timezoneOffsetMinutes is outside the supported range.");
  }

  return { localDate, timezoneOffsetMinutes };
}

export function isValidDateOnly(value: string) {
  if (!DATE_ONLY_PATTERN.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function addDaysToDateOnly(value: string, days: number) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
