"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { appwriteServerConfig } from "@/backend/appwrite/config";
import { databases } from "@/backend/appwrite/server-client";
import { generateLoanQrCode } from "@/backend/services/qr-code-service";
import { getPrimaryLender } from "@/backend/services/lender-service";
import { createLoanSearchText } from "@/backend/services/search-text-service";

export async function createBorrowerAction(formData: FormData) {
  const lender = await getRequiredLender();
  const borrowerId = createDocumentId("borrower");
  const now = new Date().toISOString();

  await databases.createDocument({
    databaseId: appwriteServerConfig.databaseId,
    collectionId: appwriteServerConfig.collections.borrowers,
    documentId: borrowerId,
    data: {
      lender_id: lender.id,
      name: readRequired(formData, "name"),
      business_name: readOptional(formData, "business_name"),
      contact_info: JSON.stringify({
        phone: readOptional(formData, "phone"),
        address: readOptional(formData, "address"),
      }),
      status: "active",
      created_at: now,
    },
  });

  revalidatePath("/borrowers");
  redirect(`/borrowers/${borrowerId}`);
}

export async function createLoanForBorrowerAction(formData: FormData) {
  const lender = await getRequiredLender();
  const borrowerId = readRequired(formData, "borrower_id");
  const borrower = await databases.getDocument({
    databaseId: appwriteServerConfig.databaseId,
    collectionId: appwriteServerConfig.collections.borrowers,
    documentId: borrowerId,
  });

  if (borrower.lender_id !== lender.id) {
    throw new Error("This borrower does not belong to the active lender.");
  }

  const loanId = createDocumentId("loan");
  const qrCode = await generateLoanQrCode(loanId);
  const now = new Date().toISOString();

  await databases.createDocument({
    databaseId: appwriteServerConfig.databaseId,
    collectionId: appwriteServerConfig.collections.loans,
    documentId: loanId,
    data: {
      lender_id: lender.id,
      borrower_id: borrowerId,
      amount: readNumber(formData, "amount"),
      interest_rate: readNumber(formData, "interest_rate"),
      daily_payment: readNumber(formData, "daily_payment"),
      start_date: readDate(formData, "start_date"),
      end_date: readDate(formData, "end_date"),
      status: "active",
      qr_code: qrCode,
      search_text: createLoanSearchText({
        borrowerName: String(borrower.name ?? ""),
        borrowerContact: String(borrower.contact_info ?? ""),
      }),
      created_at: now,
    },
  });

  revalidatePath(`/borrowers/${borrowerId}`);
  revalidatePath("/loans");
  revalidatePath("/dashboard/lender");
}

export async function createCollectorAction(formData: FormData) {
  const lender = await getRequiredLender();
  const collectorId = createDocumentId("collector");
  const now = new Date().toISOString();

  await databases.createDocument({
    databaseId: appwriteServerConfig.databaseId,
    collectionId: appwriteServerConfig.collections.collectors,
    documentId: collectorId,
    data: {
      lender_id: lender.id,
      name: readRequired(formData, "name"),
      contact_info: JSON.stringify({
        phone: readOptional(formData, "phone"),
        area: readOptional(formData, "area"),
      }),
      status: readStatus(formData),
      created_at: now,
    },
  });

  revalidatePath("/collectors");
}

export async function updateLenderProfileAction(formData: FormData) {
  const lender = await getRequiredLender();

  await databases.updateDocument({
    databaseId: appwriteServerConfig.databaseId,
    collectionId: appwriteServerConfig.collections.lenders,
    documentId: lender.id,
    data: {
      company_name: readRequired(formData, "company_name"),
      email: readRequired(formData, "email"),
      contact_info: JSON.stringify({
        phone: readOptional(formData, "phone"),
        address: readOptional(formData, "address"),
      }),
      status: readStatus(formData),
    },
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard/lender");
}

async function getRequiredLender() {
  const lender = await getPrimaryLender();

  if (!lender) {
    throw new Error("No lender exists in Appwrite yet.");
  }

  return lender;
}

function createDocumentId(prefix: string) {
  const randomPart = crypto.randomUUID().replaceAll("-", "").slice(0, 22);
  return `${prefix}_${randomPart}`;
}

function readRequired(formData: FormData, key: string) {
  const value = readOptional(formData, key);

  if (!value) {
    throw new Error(`${key} is required.`);
  }

  return value;
}

function readOptional(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function readNumber(formData: FormData, key: string) {
  const value = Number(readRequired(formData, key));

  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${key} must be a valid number.`);
  }

  return value;
}

function readDate(formData: FormData, key: string) {
  const value = readRequired(formData, key);
  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${key} must be a valid date.`);
  }

  return date.toISOString();
}

function readStatus(formData: FormData) {
  const value = readOptional(formData, "status");
  return value === "inactive" ? "inactive" : "active";
}
