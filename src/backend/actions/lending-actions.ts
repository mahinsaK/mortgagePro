"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { appwriteServerConfig } from "@/backend/appwrite/config";
import { databases, Query, users } from "@/backend/appwrite/server-client";
import { normalizeCurrency } from "@/backend/lib/currency";
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

export async function updateBorrowerAction(formData: FormData) {
  const lender = await getRequiredLender();
  const borrowerId = readRequired(formData, "borrower_id");
  await getOwnedDocument(appwriteServerConfig.collections.borrowers, lender.id, borrowerId, [
    "$id",
  ]);
  const contactInfo = JSON.stringify({
    phone: readOptional(formData, "phone"),
    address: readOptional(formData, "address"),
  });
  const name = readRequired(formData, "name");

  await databases.updateDocument({
    databaseId: appwriteServerConfig.databaseId,
    collectionId: appwriteServerConfig.collections.borrowers,
    documentId: borrowerId,
    data: {
      name,
      business_name: readOptional(formData, "business_name"),
      contact_info: contactInfo,
      status: readStatus(formData),
    },
  });
  await refreshBorrowerLoanSearchText(lender.id, borrowerId, name, contactInfo);

  revalidatePath("/borrowers");
  revalidatePath(`/borrowers/${borrowerId}`);
  revalidatePath("/loans");
  revalidatePath("/dashboard/lender");
}

export async function deleteBorrowerAction(formData: FormData) {
  const lender = await getRequiredLender();
  const borrowerId = readRequired(formData, "borrower_id");
  await getOwnedDocument(appwriteServerConfig.collections.borrowers, lender.id, borrowerId, [
    "$id",
  ]);
  const loans = await databases.listDocuments({
    databaseId: appwriteServerConfig.databaseId,
    collectionId: appwriteServerConfig.collections.loans,
    queries: [
      Query.equal("lender_id", lender.id),
      Query.equal("borrower_id", borrowerId),
      Query.limit(5000),
      Query.select(["$id"]),
    ],
  });
  const loanIds = loans.documents.map((loan) => loan.$id);

  if (loanIds.length > 0) {
    const payments = await databases.listDocuments({
      databaseId: appwriteServerConfig.databaseId,
      collectionId: appwriteServerConfig.collections.payments,
      queries: [
        Query.equal("lender_id", lender.id),
        Query.equal("loan_id", loanIds),
        Query.limit(5000),
        Query.select(["$id"]),
      ],
    });

    await Promise.all(
      payments.documents.map((payment) =>
        databases.deleteDocument({
          databaseId: appwriteServerConfig.databaseId,
          collectionId: appwriteServerConfig.collections.payments,
          documentId: payment.$id,
        }),
      ),
    );
    await Promise.all(
      loanIds.map((loanId) =>
        databases.deleteDocument({
          databaseId: appwriteServerConfig.databaseId,
          collectionId: appwriteServerConfig.collections.loans,
          documentId: loanId,
        }),
      ),
    );
  }

  await databases.deleteDocument({
    databaseId: appwriteServerConfig.databaseId,
    collectionId: appwriteServerConfig.collections.borrowers,
    documentId: borrowerId,
  });

  revalidatePath("/borrowers");
  revalidatePath("/loans");
  revalidatePath("/payments");
  revalidatePath("/dashboard/lender");
  redirect("/borrowers");
}

export async function createLoanForBorrowerAction(formData: FormData) {
  const lender = await getRequiredLender();
  const borrowerId = readRequired(formData, "borrower_id");
  const borrowers = await databases.listDocuments({
    databaseId: appwriteServerConfig.databaseId,
    collectionId: appwriteServerConfig.collections.borrowers,
    queries: [
      Query.equal("lender_id", lender.id),
      Query.equal("$id", borrowerId),
      Query.limit(1),
      Query.select(["$id", "name", "contact_info"]),
    ],
  });
  const borrower = borrowers.documents[0];

  if (!borrower) {
    throw new Error("This borrower does not belong to the active lender.");
  }

  const loanId = createDocumentId("loan");
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
      qr_code: loanId,
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

export async function updateLoanAction(formData: FormData) {
  const lender = await getRequiredLender();
  const loanId = readRequired(formData, "loan_id");
  const loan = await getOwnedDocument(appwriteServerConfig.collections.loans, lender.id, loanId, [
    "$id",
    "borrower_id",
  ]);
  const borrowerId = String(loan.borrower_id ?? "");

  await databases.updateDocument({
    databaseId: appwriteServerConfig.databaseId,
    collectionId: appwriteServerConfig.collections.loans,
    documentId: loanId,
    data: {
      amount: readNumber(formData, "amount"),
      interest_rate: readNumber(formData, "interest_rate"),
      daily_payment: readNumber(formData, "daily_payment"),
      start_date: readDate(formData, "start_date"),
      end_date: readDate(formData, "end_date"),
      status: readLoanStatus(formData),
    },
  });

  revalidatePath(`/borrowers/${borrowerId}`);
  revalidatePath("/loans");
  revalidatePath("/dashboard/lender");
}

export async function deleteLoanAction(formData: FormData) {
  const lender = await getRequiredLender();
  const loanId = readRequired(formData, "loan_id");
  const loan = await getOwnedDocument(appwriteServerConfig.collections.loans, lender.id, loanId, [
    "$id",
    "borrower_id",
  ]);
  const borrowerId = String(loan.borrower_id ?? "");
  const payments = await databases.listDocuments({
    databaseId: appwriteServerConfig.databaseId,
    collectionId: appwriteServerConfig.collections.payments,
    queries: [
      Query.equal("lender_id", lender.id),
      Query.equal("loan_id", loanId),
      Query.limit(5000),
      Query.select(["$id"]),
    ],
  });

  await Promise.all(
    payments.documents.map((payment) =>
      databases.deleteDocument({
        databaseId: appwriteServerConfig.databaseId,
        collectionId: appwriteServerConfig.collections.payments,
        documentId: payment.$id,
      }),
    ),
  );
  await databases.deleteDocument({
    databaseId: appwriteServerConfig.databaseId,
    collectionId: appwriteServerConfig.collections.loans,
    documentId: loanId,
  });

  revalidatePath(`/borrowers/${borrowerId}`);
  revalidatePath("/loans");
  revalidatePath("/payments");
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

export async function updateCollectorAction(formData: FormData) {
  const lender = await getRequiredLender();
  const collectorId = readRequired(formData, "collector_id");
  await getOwnedDocument(appwriteServerConfig.collections.collectors, lender.id, collectorId, [
    "$id",
  ]);

  await databases.updateDocument({
    databaseId: appwriteServerConfig.databaseId,
    collectionId: appwriteServerConfig.collections.collectors,
    documentId: collectorId,
    data: {
      name: readRequired(formData, "name"),
      contact_info: JSON.stringify({
        phone: readOptional(formData, "phone"),
        area: readOptional(formData, "area"),
      }),
      status: readStatus(formData),
    },
  });

  revalidatePath("/collectors");
  revalidatePath("/payments");
}

export async function deleteCollectorAction(formData: FormData) {
  const lender = await getRequiredLender();
  const collectorId = readRequired(formData, "collector_id");
  await getOwnedDocument(appwriteServerConfig.collections.collectors, lender.id, collectorId, [
    "$id",
  ]);

  await databases.deleteDocument({
    databaseId: appwriteServerConfig.databaseId,
    collectionId: appwriteServerConfig.collections.collectors,
    documentId: collectorId,
  });

  revalidatePath("/collectors");
  revalidatePath("/payments");
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
      currency: normalizeCurrency(readOptional(formData, "currency")),
    },
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard/lender");
}

export async function updateLenderPasswordAction(formData: FormData) {
  const lender = await getRequiredLender();
  const password = readRequired(formData, "password");
  const confirmPassword = readRequired(formData, "confirm_password");

  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  if (password !== confirmPassword) {
    throw new Error("Password and confirmation do not match.");
  }

  if (!lender.appwriteUserId) {
    throw new Error("This lender profile is not linked to an Appwrite Auth user.");
  }

  await users.updatePassword({
    userId: lender.appwriteUserId,
    password,
  });

  revalidatePath("/settings");
}

async function getRequiredLender() {
  const lender = await getPrimaryLender();

  if (!lender) {
    throw new Error("No lender exists in Appwrite yet.");
  }

  return lender;
}

async function getOwnedDocument(
  collectionId: string,
  lenderId: string,
  documentId: string,
  select: string[],
) {
  const documents = await databases.listDocuments({
    databaseId: appwriteServerConfig.databaseId,
    collectionId,
    queries: [
      Query.equal("lender_id", lenderId),
      Query.equal("$id", documentId),
      Query.limit(1),
      Query.select(select),
    ],
  });
  const document = documents.documents[0];

  if (!document) {
    throw new Error("This record does not belong to the active lender.");
  }

  return document;
}

async function refreshBorrowerLoanSearchText(
  lenderId: string,
  borrowerId: string,
  borrowerName: string,
  borrowerContact: string,
) {
  const loans = await databases.listDocuments({
    databaseId: appwriteServerConfig.databaseId,
    collectionId: appwriteServerConfig.collections.loans,
    queries: [
      Query.equal("lender_id", lenderId),
      Query.equal("borrower_id", borrowerId),
      Query.limit(5000),
      Query.select(["$id", "search_text"]),
    ],
  });
  const searchText = createLoanSearchText({
    borrowerName,
    borrowerContact,
  });

  await Promise.all(
    loans.documents
      .filter((loan) => loan.search_text !== searchText)
      .map((loan) =>
        databases.updateDocument({
          databaseId: appwriteServerConfig.databaseId,
          collectionId: appwriteServerConfig.collections.loans,
          documentId: loan.$id,
          data: { search_text: searchText },
        }),
      ),
  );
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

function readLoanStatus(formData: FormData) {
  const value = readOptional(formData, "status");

  if (
    value === "completed" ||
    value === "overdue" ||
    value === "cancelled"
  ) {
    return value;
  }

  return "active";
}
