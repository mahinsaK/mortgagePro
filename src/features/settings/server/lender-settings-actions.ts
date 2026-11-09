"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { appwriteServerConfig } from "@/server/appwrite/config";
import { databases, users } from "@/server/appwrite/server-client";
import { normalizeCurrency } from "@/server/lib/currency";
import { clearAuthSession } from "@/server/services/auth-session-service";
import { getRequiredLender, readOptional, readPhone, readRequired } from "@/server/actions/lending-action-helpers";

export type UpdateLenderPasswordActionState = {
  status: "idle" | "error" | "success";
  message: string;
};

export async function updateLenderProfileAction(formData: FormData) {
  const lender = await getRequiredLender();

  await databases.updateDocument({
    databaseId: appwriteServerConfig.databaseId,
    collectionId: appwriteServerConfig.collections.lenders,
    documentId: lender.id,
    data: {
      company_name: readRequired(formData, "company_name"),
      contact_info: JSON.stringify({
        phone: readPhone(formData),
        address: readOptional(formData, "address"),
      }),
      currency: normalizeCurrency(readOptional(formData, "currency")),
    },
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard/lender");
}

export async function updateLenderPasswordAction(
  formData: FormData,
): Promise<UpdateLenderPasswordActionState> {
  const lender = await getRequiredLender();
  const password = readRequired(formData, "password");
  const confirmPassword = readRequired(formData, "confirm_password");

  if (password.length < 8) {
    return {
      status: "error",
      message: "Password must be at least 8 characters.",
    };
  }

  if (password !== confirmPassword) {
    return {
      status: "error",
      message: "Password and confirmation do not match.",
    };
  }

  if (!lender.appwriteUserId) {
    return {
      status: "error",
      message: "This lender account cannot update its password.",
    };
  }

  try {
    await users.updatePassword({
      userId: lender.appwriteUserId,
      password,
    });
  } catch {
    return {
      status: "error",
      message: "Password could not be updated. Please try again.",
    };
  }

  try {
    await users.deleteSessions({ userId: lender.appwriteUserId });
  } catch {
    // Appwrite's password-change invalidation policy remains the primary guard.
  }

  await clearAuthSession();
  redirect(
    "/auth/login?status=success&message=Password+updated.+All+devices+were+signed+out.",
  );
}

export async function updateLenderPasswordFormAction(
  _previousState: UpdateLenderPasswordActionState,
  formData: FormData,
): Promise<UpdateLenderPasswordActionState> {
  return updateLenderPasswordAction(formData);
}
