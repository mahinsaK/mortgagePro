"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { appwriteServerConfig } from "@/backend/appwrite/config";
import { databases, Query, users } from "@/backend/appwrite/server-client";
import { normalizeCurrency } from "@/backend/lib/currency";
import { validateNewCollectorUsername } from "@/backend/modules/collectors/username";
import { PaymentService } from "@/backend/modules/payments/service";
import { hashCollectorPassword } from "@/backend/services/collector-auth-service";
import { getPrimaryLender } from "@/backend/services/lender-service";
import {
  createBorrowerSearchText,
  createLoanSearchText,
} from "@/backend/services/search-text-service";
import {
  createTenantDocument,
  deleteTenantDocument,
  listTenantDocuments,
  requireTenantDocument,
  updateTenantDocument,
} from "@/backend/services/tenant-data-service";

export async function createBorrowerAction(formData: FormData) {
  const lender = await getRequiredLender();
  const borrowerId = createDocumentId("borrower");
  const now = new Date().toISOString();
  const name = readRequired(formData, "name");
  const contact = readOptional(formData, "phone");
  const address = readOptional(formData, "address");

  await createTenantDocument("borrowers", lender.id, borrowerId, {
    name,
    business_name: readOptional(formData, "business_name"),
    contact,
    address,
    search_text: createBorrowerSearchText({
      borrowerName: name,
      borrowerContact: contact,
      borrowerAddress: address,
    }),
    status: "active",
    created_at: now,
  });

  revalidatePath("/borrowers");
  redirect(`/borrowers/${borrowerId}`);
}

export async function updateBorrowerAction(formData: FormData) {
  const lender = await getRequiredLender();
  const borrowerId = readRequired(formData, "borrower_id");
  const contact = readOptional(formData, "phone");
  const address = readOptional(formData, "address");
  const name = readRequired(formData, "name");

  await updateTenantDocument("borrowers", lender.id, borrowerId, {
    name,
    business_name: readOptional(formData, "business_name"),
    contact,
    address,
    search_text: createBorrowerSearchText({
      borrowerName: name,
      borrowerContact: contact,
      borrowerAddress: address,
    }),
    status: readStatus(formData),
  });
  await refreshBorrowerLoanSearchText(lender.id, borrowerId, name, contact, address);

  revalidatePath("/borrowers");
  revalidatePath(`/borrowers/${borrowerId}`);
  revalidatePath("/loans");
  revalidatePath("/dashboard/lender");
}

export async function deleteBorrowerAction(formData: FormData) {
  const lender = await getRequiredLender();
  const borrowerId = readRequired(formData, "borrower_id");
  await requireTenantDocument("borrowers", lender.id, borrowerId);
  const loans = await listTenantDocuments("loans", lender.id, [
    Query.equal("borrower_id", borrowerId),
    Query.limit(5000),
    Query.select(["$id"]),
  ]);
  const loanIds = loans.documents.map((loan) => loan.$id);

  if (loanIds.length > 0) {
    const payments = await listTenantDocuments("payments", lender.id, [
      Query.equal("loan_id", loanIds),
      Query.limit(5000),
      Query.select(["$id"]),
    ]);

    await Promise.all(
      payments.documents.map((payment) =>
        deleteTenantDocument("payments", lender.id, payment.$id),
      ),
    );
    await Promise.all(
      loanIds.map((loanId) =>
        deleteTenantDocument("loans", lender.id, loanId),
      ),
    );
  }

  await deleteTenantDocument("borrowers", lender.id, borrowerId);

  revalidatePath("/borrowers");
  revalidatePath("/loans");
  revalidatePath("/payments");
  revalidatePath("/dashboard/lender");
  redirect("/borrowers");
}

export async function createLoanForBorrowerAction(formData: FormData) {
  const lender = await getRequiredLender();
  const borrowerId = readRequired(formData, "borrower_id");
  const borrower = await requireTenantDocument("borrowers", lender.id, borrowerId, [
    "$id",
    "name",
    "contact",
    "address",
  ]);

  const loanId = createDocumentId("loan");
  const now = new Date().toISOString();
  const amount = readNumber(formData, "amount");

  await createTenantDocument("loans", lender.id, loanId, {
    borrower_id: borrowerId,
    amount,
    interest_rate: readNumber(formData, "interest_rate"),
    daily_payment: readNumber(formData, "daily_payment"),
    total_paid: 0,
    remaining_amount: amount,
    start_date: readDate(formData, "start_date"),
    end_date: readDate(formData, "end_date"),
    status: "active",
    qr_code: loanId,
    search_text: createLoanSearchText({
      borrowerName: String(borrower.name ?? ""),
      borrowerContact: String(borrower.contact ?? ""),
      borrowerAddress: String(borrower.address ?? ""),
    }),
    created_at: now,
  });

  revalidatePath(`/borrowers/${borrowerId}`);
  revalidatePath("/loans");
  revalidatePath("/dashboard/lender");
}

export async function updateLoanAction(formData: FormData) {
  const lender = await getRequiredLender();
  const loanId = readRequired(formData, "loan_id");
  const loan = await requireTenantDocument("loans", lender.id, loanId, [
    "$id",
    "borrower_id",
    "total_paid",
  ]);
  const borrowerId = String(loan.borrower_id ?? "");
  const amount = readNumber(formData, "amount");
  const totalPaid = Number(loan.total_paid ?? 0);
  const requestedStatus = readLoanStatus(formData);
  const totals = new PaymentService().calculateLoanTotals({
    loanAmount: amount,
    currentTotalPaid: totalPaid,
    paymentAmount: 0,
    currentStatus: requestedStatus,
  });

  await updateTenantDocument("loans", lender.id, loanId, {
    amount,
    interest_rate: readNumber(formData, "interest_rate"),
    daily_payment: readNumber(formData, "daily_payment"),
    remaining_amount: totals.remainingAmount,
    start_date: readDate(formData, "start_date"),
    end_date: readDate(formData, "end_date"),
    status: totals.status,
  });

  revalidatePath(`/borrowers/${borrowerId}`);
  revalidatePath("/loans");
  revalidatePath("/dashboard/lender");
}

export async function deleteLoanAction(formData: FormData) {
  const lender = await getRequiredLender();
  const loanId = readRequired(formData, "loan_id");
  const loan = await requireTenantDocument("loans", lender.id, loanId, [
    "$id",
    "borrower_id",
  ]);
  const borrowerId = String(loan.borrower_id ?? "");
  const payments = await listTenantDocuments("payments", lender.id, [
    Query.equal("loan_id", loanId),
    Query.limit(5000),
    Query.select(["$id"]),
  ]);

  await Promise.all(
    payments.documents.map((payment) =>
      deleteTenantDocument("payments", lender.id, payment.$id),
    ),
  );
  await deleteTenantDocument("loans", lender.id, loanId);

  revalidatePath(`/borrowers/${borrowerId}`);
  revalidatePath("/loans");
  revalidatePath("/payments");
  revalidatePath("/dashboard/lender");
}

export type CreateCollectorActionState = {
  status: "idle" | "error" | "success";
  message: string;
  submittedUsername?: string;
  fieldErrors?: {
    username?: string;
  };
};

export async function createCollectorAction(
  _previousState: CreateCollectorActionState,
  formData: FormData,
): Promise<CreateCollectorActionState> {
  const lender = await getRequiredLender();
  const username = readOptional(formData, "username");
  const usernameError = validateNewCollectorUsername(username);
  const name = readOptional(formData, "name");
  const now = new Date().toISOString();
  const password = readOptional(formData, "password");

  if (usernameError) {
    return collectorFormError(usernameError, username, usernameError);
  }

  if (!name) {
    return collectorFormError("Collector name is required.", username);
  }

  if (!password) {
    return collectorFormError("Collector password is required.", username);
  }

  if (password.length < 8) {
    return collectorFormError(
      "Collector password must be at least 8 characters.",
      username,
    );
  }

  const existingCollectors = await databases.listDocuments({
    databaseId: appwriteServerConfig.databaseId,
    collectionId: appwriteServerConfig.collections.collectors,
    queries: [
      Query.equal("$id", username),
      Query.limit(1),
      Query.select(["$id"]),
    ],
  });

  if (existingCollectors.total > 0) {
    return collectorFormError(
      "That username already exists. Choose another or generate a new one.",
      username,
      "Username already exists.",
    );
  }

  try {
    await createTenantDocument("collectors", lender.id, username, {
      name,
      contact_info: JSON.stringify({
        phone: readOptional(formData, "phone"),
        area: readOptional(formData, "area"),
      }),
      password_hash: hashCollectorPassword(password),
      status: readStatus(formData),
      created_at: now,
    });
  } catch (error) {
    if (isConflict(error)) {
      return collectorFormError(
        "That username was just taken. Choose another or generate a new one.",
        username,
        "Username already exists.",
      );
    }

    throw error;
  }

  revalidatePath("/collectors");

  return {
    status: "success",
    message: "Collector added successfully.",
    submittedUsername: username,
  };
}

export async function updateCollectorAction(formData: FormData) {
  const lender = await getRequiredLender();
  const collectorId = readRequired(formData, "collector_id");
  const password = readOptional(formData, "password");
  const status = readStatus(formData);
  const data: Record<string, unknown> = {
    name: readRequired(formData, "name"),
    contact_info: JSON.stringify({
      phone: readOptional(formData, "phone"),
      area: readOptional(formData, "area"),
    }),
    status,
  };

  if (password) {
    if (password.length < 8) {
      throw new Error("Collector password must be at least 8 characters.");
    }

    data.password_hash = hashCollectorPassword(password);
  }

  await updateTenantDocument("collectors", lender.id, collectorId, data);

  revalidatePath("/collectors");
  revalidatePath("/payments");
}

export async function deleteCollectorAction(formData: FormData) {
  const lender = await getRequiredLender();
  const collectorId = readRequired(formData, "collector_id");
  await deleteTenantDocument("collectors", lender.id, collectorId);

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

async function refreshBorrowerLoanSearchText(
  lenderId: string,
  borrowerId: string,
  borrowerName: string,
  borrowerContact: string,
  borrowerAddress: string,
) {
  const loans = await listTenantDocuments("loans", lenderId, [
    Query.equal("borrower_id", borrowerId),
    Query.limit(5000),
    Query.select(["$id", "search_text"]),
  ]);
  const searchText = createLoanSearchText({
    borrowerName,
    borrowerContact,
    borrowerAddress,
  });

  await Promise.all(
    loans.documents
      .filter((loan) => loan.search_text !== searchText)
      .map((loan) =>
        updateTenantDocument("loans", lenderId, loan.$id, {
          search_text: searchText,
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

function collectorFormError(
  message: string,
  submittedUsername: string,
  usernameError?: string,
): CreateCollectorActionState {
  return {
    status: "error",
    message,
    submittedUsername,
    fieldErrors: usernameError ? { username: usernameError } : undefined,
  };
}

function isConflict(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    Number(error.code) === 409
  );
}
