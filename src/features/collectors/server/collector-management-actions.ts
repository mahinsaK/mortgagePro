"use server";

import { revalidatePath } from "next/cache";
import { appwriteServerConfig } from "@/server/appwrite/config";
import { databases, Query } from "@/server/appwrite/server-client";
import { validateNewCollectorUsername } from "@/features/collectors/domain/username";
import { hashCollectorPassword, normalizeSessionVersion } from "@/server/services/collector-auth-service";
import { createTenantDocument, deleteTenantDocument, requireTenantDocument, updateTenantDocument } from "@/server/services/tenant-data-service";
import { getRequiredLender, readOptional, readPhone, readRequired, readStatus, toErrorMessage } from "@/server/actions/lending-action-helpers";

export type CreateCollectorActionState = {
  status: "idle" | "error" | "success";
  message: string;
  submittedUsername?: string;
  fieldErrors?: {
    username?: string;
  };
};

export type UpdateCollectorActionState = {
  status: "idle" | "error" | "success";
  message: string;
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
  let phone: string;

  try {
    phone = readPhone(formData);
  } catch (error) {
    return collectorFormError(toErrorMessage(error), username);
  }

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
        phone,
        area: readOptional(formData, "area"),
      }),
      password_hash: hashCollectorPassword(password),
      session_version: 1,
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

export async function updateCollectorAction(
  formData: FormData,
): Promise<UpdateCollectorActionState> {
  const lender = await getRequiredLender();
  const collectorId = readRequired(formData, "collector_id");
  const password = readOptional(formData, "password");
  const status = readStatus(formData);
  const currentCollector = await requireTenantDocument(
    "collectors",
    lender.id,
    collectorId,
    ["$id", "session_version", "status"],
  );
  const currentSessionVersion = normalizeSessionVersion(
    currentCollector.session_version,
  );
  let phone: string;

  try {
    phone = readPhone(formData);
  } catch (error) {
    return {
      status: "error",
      message: toErrorMessage(error),
    };
  }

  const data: Record<string, unknown> = {
    name: readRequired(formData, "name"),
    contact_info: JSON.stringify({
      phone,
      area: readOptional(formData, "area"),
    }),
    status,
  };

  if (password) {
    if (password.length < 8) {
      return {
        status: "error",
        message: "Collector password must be at least 8 characters.",
      };
    }

    data.password_hash = hashCollectorPassword(password);
  }

  if (password || String(currentCollector.status ?? "") !== status) {
    data.session_version = currentSessionVersion + 1;
  }

  await updateTenantDocument("collectors", lender.id, collectorId, data);

  revalidatePath("/collectors");
  revalidatePath("/payments");

  return {
    status: "success",
    message: "Collector updated successfully.",
  };
}

export async function updateCollectorFormAction(
  _previousState: UpdateCollectorActionState,
  formData: FormData,
): Promise<UpdateCollectorActionState> {
  return updateCollectorAction(formData);
}

export async function deleteCollectorAction(formData: FormData) {
  const lender = await getRequiredLender();
  const collectorId = readRequired(formData, "collector_id");
  await deleteTenantDocument("collectors", lender.id, collectorId);

  revalidatePath("/collectors");
  revalidatePath("/payments");
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
