"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Query } from "@/server/appwrite/server-client";
import { createBorrowerSearchText, createLoanSearchText } from "@/server/services/search-text-service";
import { createTenantDocument, deleteTenantDocument, listTenantDocuments, requireTenantDocument, updateTenantDocument } from "@/server/services/tenant-data-service";
import { createDocumentId, getRequiredLender, readOptional, readPhone, readRequired, readStatus } from "@/server/actions/lending-action-helpers";

export async function createBorrowerAction(formData: FormData) {
  const lender = await getRequiredLender();
  const borrowerId = createDocumentId("borrower");
  const now = new Date().toISOString();
  const name = readRequired(formData, "name");
  const contact = readPhone(formData);
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
  const contact = readPhone(formData);
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
