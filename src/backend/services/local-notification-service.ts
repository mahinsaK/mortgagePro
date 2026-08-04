import "server-only";

import { createHash } from "node:crypto";
import { Query } from "@/backend/appwrite/server-client";
import { NotificationController } from "@/backend/modules/notifications/controller";
import {
  addDaysToDateOnly,
  toNotificationContextDto,
  type LocalNotificationResponse,
} from "@/backend/modules/notifications/dto";
import { getPrimaryLender } from "@/backend/services/lender-service";
import { listTenantDocuments } from "@/backend/services/tenant-data-service";

const MAX_LOCAL_NOTIFICATION_RECORDS = 5000;

export async function getLocalLenderNotifications(
  input: Record<string, unknown>,
): Promise<LocalNotificationResponse | null> {
  const context = toNotificationContextDto(input);
  const lender = await getPrimaryLender();

  if (!lender) {
    return null;
  }

  const endingSoonDate = addDaysToDateOnly(context.localDate, 7);
  const endingSoonBoundary = `${endingSoonDate}T23:59:59.999Z`;
  const [loans, activeLoans, latestPayments, borrowers] = await Promise.all([
    listTenantDocuments("loans", lender.id, [
      Query.equal("status", ["active", "overdue"]),
      Query.lessThanEqual("end_date", endingSoonBoundary),
      Query.limit(MAX_LOCAL_NOTIFICATION_RECORDS),
      Query.select([
        "$id",
        "amount",
        "total_paid",
        "end_date",
        "remaining_amount",
        "status",
      ]),
    ]),
    listTenantDocuments("loans", lender.id, [
      Query.equal("status", "active"),
      Query.limit(1),
      Query.select(["$id"]),
    ]),
    listTenantDocuments("payments", lender.id, [
      Query.orderDesc("$createdAt"),
      Query.limit(1),
      Query.select(["$id", "$createdAt"]),
    ]),
    listTenantDocuments("borrowers", lender.id, [
      Query.equal("status", "active"),
      Query.limit(MAX_LOCAL_NOTIFICATION_RECORDS),
      Query.select(["$id", "contact", "status"]),
    ]),
  ]);
  const generatedAt = new Date().toISOString();
  const result = new NotificationController().generate(
    context,
    {
      activeLoanCount: activeLoans.total,
      latestPaymentCreatedAt: String(
        latestPayments.documents[0]?.$createdAt ?? "",
      ),
      loans: loans.documents.map((loan) => ({
        endDate: String(loan.end_date ?? ""),
        remainingAmount: Number(
          loan.remaining_amount ??
            Math.max(
              Number(loan.amount ?? 0) - Number(loan.total_paid ?? 0),
              0,
            ),
        ),
        status: String(loan.status ?? "active"),
      })),
      borrowers: borrowers.documents.map((borrower) => ({
        contact: String(borrower.contact ?? ""),
        status: String(borrower.status ?? "active"),
      })),
    },
    generatedAt,
  );

  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Notification generation failed.");
  }

  return {
    items: result.data,
    ownerKey: createNotificationOwnerKey(lender.id),
    generatedAt,
  };
}

export function createNotificationOwnerKey(lenderId: string) {
  return createHash("sha256").update(lenderId).digest("hex").slice(0, 24);
}
