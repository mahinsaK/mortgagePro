"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPrimaryLender } from "@/backend/services/lender-service";
import {
  createSmsTemplate,
  deleteApprovedSmsSender,
  deleteSmsTemplate,
  requestSmsSenderId,
  SmsManagementError,
  updateAutomaticPaymentSmsSettings,
  updateSmsTemplate,
} from "@/backend/services/sms-management-service";
import { getAllBorrowerSmsRecipients } from "@/backend/services/sms-recipient-service";
import {
  sendTenantSmsBatch,
  SmsSendingError,
} from "@/backend/services/sms-sending-service";

export type SmsManagementActionState = {
  status: "idle" | "error" | "success";
  message: string;
  operation?:
    | "sender"
    | "sender_delete"
    | "automatic_payment"
    | "template_create"
    | "template_update";
};

export async function requestSmsSenderAction(
  _previousState: SmsManagementActionState,
  formData: FormData,
): Promise<SmsManagementActionState> {
  return runManagementAction("sender", async (lenderId) => {
    await requestSmsSenderId(lenderId, readField(formData, "sender_id"));
  }, "Sender ID request submitted for review.");
}

export async function deleteSmsSenderAction(
  _previousState: SmsManagementActionState,
  formData: FormData,
): Promise<SmsManagementActionState> {
  return runManagementAction("sender_delete", async (lenderId) => {
    await deleteApprovedSmsSender(
      lenderId,
      readField(formData, "sender_request_id"),
    );
  }, "Sender ID deleted. You can now request another one.");
}

export async function createSmsTemplateAction(
  _previousState: SmsManagementActionState,
  formData: FormData,
): Promise<SmsManagementActionState> {
  return runManagementAction("template_create", async (lenderId) => {
    await createSmsTemplate(
      lenderId,
      readField(formData, "name"),
      readField(formData, "message"),
    );
  }, "Message template saved.");
}

export async function updateAutomaticPaymentSmsAction(
  _previousState: SmsManagementActionState,
  formData: FormData,
): Promise<SmsManagementActionState> {
  return runManagementAction(
    "automatic_payment",
    async (lenderId) => {
      await updateAutomaticPaymentSmsSettings(
        lenderId,
        formData.get("enabled") === "on",
        readField(formData, "template_id"),
      );
    },
    "Automatic payment settings saved.",
  );
}

export async function updateSmsTemplateAction(
  _previousState: SmsManagementActionState,
  formData: FormData,
): Promise<SmsManagementActionState> {
  return runManagementAction("template_update", async (lenderId) => {
    await updateSmsTemplate(
      lenderId,
      readField(formData, "template_id"),
      readField(formData, "name"),
      readField(formData, "message"),
    );
  }, "Message template updated.");
}

export async function deleteSmsTemplateAction(formData: FormData) {
  const lender = await getPrimaryLender();

  if (!lender) {
    return;
  }

  await deleteSmsTemplate(lender.id, readField(formData, "template_id"));
  revalidatePath("/sms");
}

export async function sendManualSmsAction(formData: FormData) {
  const result = await sendSmsToNumbers({
    message: readField(formData, "message"),
    phoneNumbers: [readField(formData, "phone_number")],
    requestId: readField(formData, "request_id"),
  });

  redirectWithSendResult(result);
}

export async function sendSelectedSmsAction(formData: FormData) {
  const result = await sendSmsToNumbers({
    message: readField(formData, "message"),
    phoneNumbers: readSelectedRecipients(formData).map(
      (recipient) => recipient.phoneNumber,
    ),
    requestId: readField(formData, "request_id"),
  });

  redirectWithSendResult(result);
}

export async function sendAllBorrowersSmsAction(formData: FormData) {
  const recipients = await getAllBorrowerSmsRecipients();
  const result = await sendSmsToNumbers({
    message: readField(formData, "message"),
    phoneNumbers: recipients.map((recipient) => recipient.phoneNumber),
    requestId: readField(formData, "all_request_id"),
  });

  redirectWithSendResult(result);
}

async function sendSmsToNumbers({
  message,
  phoneNumbers,
  requestId,
}: {
  message: string;
  phoneNumbers: string[];
  requestId: string;
}) {
  const lender = await getPrimaryLender();

  if (!lender) {
    redirectWithError("No lender profile exists yet.");
  }

  try {
    return await sendTenantSmsBatch({
      lenderId: lender.id,
      message,
      phoneNumbers,
      purpose: "manual",
      requestId,
    });
  } catch (error) {
    if (error instanceof SmsSendingError) {
      redirectWithError(error.message);
    }

    redirectWithError("SMS could not be sent. Please try again.");
  }
}

function redirectWithSendResult(result: {
  failedRecipients: number;
  sentRecipients: number;
}): never {
  if (result.sentRecipients === 0) {
    redirectWithError("SMS could not be sent.");
  }

  const params = new URLSearchParams({
    count: String(result.sentRecipients),
    status: result.failedRecipients > 0 ? "partial" : "sent",
  });

  redirect(`/sms?${params.toString()}`);
}

function readField(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function readSelectedRecipients(formData: FormData) {
  const value = readField(formData, "recipients");

  try {
    const parsed = JSON.parse(value) as unknown;

    if (Array.isArray(parsed)) {
      return parsed.map((item) => {
        const record = item as Record<string, unknown>;

        return {
          phoneNumber: String(record.phoneNumber ?? ""),
        };
      });
    }
  } catch {
    return [];
  }

  return [];
}

function redirectWithError(message: string): never {
  const params = new URLSearchParams({
    status: "error",
    message,
  });

  redirect(`/sms?${params.toString()}`);
}

async function runManagementAction(
  operation: NonNullable<SmsManagementActionState["operation"]>,
  action: (lenderId: string) => Promise<void>,
  successMessage: string,
): Promise<SmsManagementActionState> {
  const lender = await getPrimaryLender();

  if (!lender) {
    return { status: "error", message: "Lender account not found.", operation };
  }

  try {
    await action(lender.id);
    revalidatePath("/sms");
    return { status: "success", message: successMessage, operation };
  } catch (error) {
    if (error instanceof SmsManagementError) {
      return { status: "error", message: error.message, operation };
    }

    return {
      status: "error",
      message: "The SMS setting could not be saved. Please try again.",
      operation,
    };
  }
}
