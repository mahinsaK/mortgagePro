"use server";

import { redirect } from "next/navigation";
import { SmsController } from "@/backend/modules/sms/controller";
import { getPrimaryLender } from "@/backend/services/lender-service";

export async function sendManualSmsAction(formData: FormData) {
  const lender = await getPrimaryLender();

  if (!lender) {
    redirectWithError("No lender profile exists yet.");
  }

  const result = await new SmsController().send({
    lenderId: lender.id,
    phoneNumber: readField(formData, "phone_number"),
    message: readField(formData, "message"),
    purpose: "manual",
  });

  if (!result.ok) {
    redirectWithError(result.error ?? "SMS send failed.");
  }

  const params = new URLSearchParams({
    status: "sent",
    phone: result.data?.to ?? "",
  });

  redirect(`/sms?${params.toString()}`);
}

function readField(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function redirectWithError(message: string): never {
  const params = new URLSearchParams({
    status: "error",
    message,
  });

  redirect(`/sms?${params.toString()}`);
}
