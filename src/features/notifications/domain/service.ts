import type {
  LocalNotificationItem,
  NotificationContextDto,
} from "./dto";
import { addDaysToDateOnly } from "./dto";

export type NotificationLoanSource = {
  endDate: string;
  remainingAmount: number;
  status: string;
};

export type NotificationBorrowerSource = {
  contact: string;
  status: string;
};

export type NotificationSource = {
  loans: NotificationLoanSource[];
  activeLoanCount: number;
  latestPaymentCreatedAt?: string;
  borrowers: NotificationBorrowerSource[];
};

export class NotificationService {
  generate(
    context: NotificationContextDto,
    source: NotificationSource,
    generatedAt = new Date().toISOString(),
  ): LocalNotificationItem[] {
    const endingSoonDate = addDaysToDateOnly(context.localDate, 7);
    const eligibleLoans = source.loans.filter(
      (loan) =>
        ["active", "overdue"].includes(loan.status) &&
        Number.isFinite(loan.remainingAmount) &&
        loan.remainingAmount > 0,
    );
    const overdueCount = eligibleLoans.filter(
      (loan) => dateOnly(loan.endDate) < context.localDate,
    ).length;
    const endingTodayCount = eligibleLoans.filter(
      (loan) => dateOnly(loan.endDate) === context.localDate,
    ).length;
    const endingSoonCount = eligibleLoans.filter((loan) => {
      const endDate = dateOnly(loan.endDate);
      return endDate > context.localDate && endDate <= endingSoonDate;
    }).length;
    const missingPhoneCount = source.borrowers.filter(
      (borrower) =>
        borrower.status === "active" && !isUsablePhoneNumber(borrower.contact),
    ).length;
    const notifications: LocalNotificationItem[] = [];

    if (overdueCount > 0) {
      notifications.push({
        id: `loans_overdue:${context.localDate}`,
        kind: "loans_overdue",
        severity: "urgent",
        title: pluralize(overdueCount, "Overdue loan", "Overdue loans"),
        body: `${overdueCount} ${loanWord(overdueCount)} past the end date still ${balanceVerb(overdueCount)} a remaining balance.`,
        href: `/loans?attention=overdue&asOf=${context.localDate}`,
        generatedAt,
      });
    }

    if (endingTodayCount > 0) {
      notifications.push({
        id: `loans_ending_today:${context.localDate}`,
        kind: "loans_ending_today",
        severity: "urgent",
        title: pluralize(
          endingTodayCount,
          "Loan ending today",
          "Loans ending today",
        ),
        body: `${endingTodayCount} ${endingTodayCount === 1 ? "loan ends" : "loans end"} today with money still remaining.`,
        href: `/loans?attention=ending-today&asOf=${context.localDate}`,
        generatedAt,
      });
    }

    if (endingSoonCount > 0) {
      notifications.push({
        id: `loans_ending_soon:${context.localDate}`,
        kind: "loans_ending_soon",
        severity: "warning",
        title: pluralize(
          endingSoonCount,
          "Loan ending soon",
          "Loans ending soon",
        ),
        body: `${endingSoonCount} ${endingSoonCount === 1 ? "loan ends" : "loans end"} within the next 7 days with money remaining.`,
        href: `/loans?attention=ending-soon&asOf=${context.localDate}`,
        generatedAt,
      });
    }

    if (
      source.activeLoanCount > 0 &&
      !isTimestampInLocalDay(
        source.latestPaymentCreatedAt,
        context.localDate,
        context.timezoneOffsetMinutes,
      )
    ) {
      notifications.push({
        id: `no_collections_today:${context.localDate}`,
        kind: "no_collections_today",
        severity: "info",
        title: "No collections recorded today",
        body: "Active loans exist, but no payment has been recorded during your local day.",
        href: `/payments/daily?date=${context.localDate}`,
        generatedAt,
      });
    }

    if (missingPhoneCount > 0) {
      notifications.push({
        id: `borrowers_missing_phone:${missingPhoneCount}`,
        kind: "borrowers_missing_phone",
        severity: "warning",
        title: pluralize(
          missingPhoneCount,
          "Borrower needs a phone number",
          "Borrowers need phone numbers",
        ),
        body: `${missingPhoneCount} active ${borrowerWord(missingPhoneCount)} missing a usable phone number for contact or SMS.`,
        href: "/borrowers?attention=missing-phone",
        generatedAt,
      });
    }

    return notifications.sort(
      (left, right) => severityOrder(left.severity) - severityOrder(right.severity),
    );
  }
}

export function isUsablePhoneNumber(value: string) {
  const phoneNumber = String(value ?? "").trim();

  if (!phoneNumber || !/^\+?[\d\s().-]+$/.test(phoneNumber)) {
    return false;
  }

  const digits = phoneNumber.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

function isTimestampInLocalDay(
  value: string | undefined,
  localDate: string,
  timezoneOffsetMinutes: number,
) {
  if (!value) {
    return false;
  }

  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return false;
  }

  const localMidnightAsUtc = new Date(`${localDate}T00:00:00.000Z`).getTime();
  const start = localMidnightAsUtc + timezoneOffsetMinutes * 60_000;
  const end = start + 24 * 60 * 60 * 1_000;
  return timestamp >= start && timestamp < end;
}

function dateOnly(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function severityOrder(severity: LocalNotificationItem["severity"]) {
  return severity === "urgent" ? 0 : severity === "warning" ? 1 : 2;
}

function pluralize(count: number, singular: string, plural: string) {
  return count === 1 ? singular : plural;
}

function loanWord(count: number) {
  return count === 1 ? "loan is" : "loans are";
}

function balanceVerb(count: number) {
  return count === 1 ? "has" : "have";
}

function borrowerWord(count: number) {
  return count === 1 ? "borrower is" : "borrowers are";
}
