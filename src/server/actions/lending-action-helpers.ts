import "server-only";

import { getPrimaryLender } from "@/server/services/lender-service";
import { normalizeOptionalPhoneNumber } from "@/shared/phone-number";

export async function getRequiredLender() {
  const lender = await getPrimaryLender();

  if (!lender) {
    throw new Error("No lender exists in Appwrite yet.");
  }

  return lender;
}

export function createDocumentId(prefix: string) {
  const randomPart = crypto.randomUUID().replaceAll("-", "").slice(0, 22);
  return `${prefix}_${randomPart}`;
}

export function readRequired(formData: FormData, key: string) {
  const value = readOptional(formData, key);

  if (!value) {
    throw new Error(`${key} is required.`);
  }

  return value;
}

export function readOptional(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export function readPhone(formData: FormData) {
  return normalizeOptionalPhoneNumber(readOptional(formData, "phone"));
}

export function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Phone number is invalid.";
}

export function readNumber(formData: FormData, key: string) {
  const value = Number(readRequired(formData, key));

  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${key} must be a valid number.`);
  }

  return value;
}

export function readDate(formData: FormData, key: string) {
  const value = readRequired(formData, key);
  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${key} must be a valid date.`);
  }

  return date.toISOString();
}

export function readStatus(formData: FormData) {
  const value = readOptional(formData, "status");
  return value === "inactive" ? "inactive" : "active";
}

export function readLoanStatus(formData: FormData) {
  const value = readOptional(formData, "status");

  if (value === "completed" || value === "overdue" || value === "cancelled") {
    return value;
  }

  return "active";
}
