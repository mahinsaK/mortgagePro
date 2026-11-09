"use server";

import { revalidatePath } from "next/cache";
import { Query } from "@/server/appwrite/server-client";
import { PaymentService } from "@/features/payments/domain/service";
import { createLoanSearchText } from "@/server/services/search-text-service";
import { createTenantDocument, deleteTenantDocument, listTenantDocuments, requireTenantDocument, updateTenantDocument } from "@/server/services/tenant-data-service";
import { createDocumentId, getRequiredLender, readDate, readLoanStatus, readNumber, readRequired } from "@/server/actions/lending-action-helpers";

export type CreateLoanActionState = {
  status: "idle" | "error" | "success";
  message: string;
};

export async function createLoanForBorrowerAction(
  formData: FormData,
): Promise<CreateLoanActionState> {
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
  const startDate = readDate(formData, "start_date");
  const endDate = readDate(formData, "end_date");

  if (new Date(endDate).getTime() <= new Date(startDate).getTime()) {
    throw new Error("end_date must be after start_date.");
  }

  await createTenantDocument("loans", lender.id, loanId, {
    borrower_id: borrowerId,
    amount,
    interest_rate: readNumber(formData, "interest_rate"),
    daily_payment: readNumber(formData, "daily_payment"),
    total_paid: 0,
    remaining_amount: amount,
    start_date: startDate,
    end_date: endDate,
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

  return {
    status: "success",
    message: "Loan created successfully.",
  };
}

export async function createLoanForBorrowerFormAction(
  _previousState: CreateLoanActionState,
  formData: FormData,
): Promise<CreateLoanActionState> {
  try {
    return await createLoanForBorrowerAction(formData);
  } catch {
    return {
      status: "error",
      message: "Loan could not be created. Check the details and try again.",
    };
  }
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
