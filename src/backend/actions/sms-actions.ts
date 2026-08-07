"use server";

import { redirect } from "next/navigation";
import { SmsController } from "@/backend/modules/sms/controller";
import { SmsService } from "@/backend/modules/sms/service";
import { getPrimaryLender } from "@/backend/services/lender-service";
import { getAllBorrowerSmsRecipients } from "@/backend/services/sms-recipient-service";
import { TextlkSmsProvider } from "@/backend/services/textlk-sms-provider";
import { isFeatureAvailable } from "@/shared/feature-availability";

const SMS_SEND_BATCH_SIZE = 20;

export async function sendManualSmsAction(formData: FormData) {
  requireSmsAvailability();
  const result = await sendSmsToNumbers({
    message: readField(formData, "message"),
    phoneNumbers: [readField(formData, "phone_number")],
  });

  redirectWithSendResult(result);
}

export async function sendSelectedSmsAction(formData: FormData) {
  requireSmsAvailability();
  const result = await sendSmsToNumbers({
    message: readField(formData, "message"),
    phoneNumbers: readSelectedRecipients(formData).map(
      (recipient) => recipient.phoneNumber,
    ),
  });

  redirectWithSendResult(result);
}

export async function sendAllBorrowersSmsAction(formData: FormData) {
  requireSmsAvailability();
  const recipients = await getAllBorrowerSmsRecipients();
  const result = await sendSmsToNumbers({
    message: readField(formData, "message"),
    phoneNumbers: recipients.map((recipient) => recipient.phoneNumber),
  });

  redirectWithSendResult(result);
}

async function sendSmsToNumbers({
  message,
  phoneNumbers,
}: {
  message: string;
  phoneNumbers: string[];
}) {
  const lender = await getPrimaryLender();

  if (!lender) {
    redirectWithError("No lender profile exists yet.");
  }

  const controller = new SmsController(new SmsService(new TextlkSmsProvider()));
  const uniqueNumbers = Array.from(
    new Set(phoneNumbers.map((phoneNumber) => phoneNumber.trim()).filter(Boolean)),
  );

  if (uniqueNumbers.length === 0) {
    redirectWithError("At least one phone number is required.");
  }

  const results: PromiseSettledResult<Awaited<ReturnType<SmsController["send"]>>>[] =
    [];

  for (let index = 0; index < uniqueNumbers.length; index += SMS_SEND_BATCH_SIZE) {
    const batch = uniqueNumbers.slice(index, index + SMS_SEND_BATCH_SIZE);
    const batchResults = await Promise.allSettled(
      batch.map((phoneNumber) =>
        controller.send({
          lenderId: lender.id,
          phoneNumber,
          message,
          purpose: "manual",
        }),
      ),
    );

    results.push(...batchResults);
  }
  const successes = results.filter(
    (result) => result.status === "fulfilled" && result.value.ok,
  );
  const failures = results.length - successes.length;

  return {
    failures,
    firstPhoneNumber:
      successes[0]?.status === "fulfilled" ? successes[0].value.data?.to ?? "" : "",
    requested: uniqueNumbers.length,
    successes: successes.length,
  };
}

function redirectWithSendResult(result: {
  failures: number;
  firstPhoneNumber: string;
  requested: number;
  successes: number;
}): never {
  if (result.successes === 0) {
    redirectWithError("SMS could not be sent.");
  }

  const params = new URLSearchParams({
    count: String(result.successes),
    phone: result.firstPhoneNumber,
    status: result.failures > 0 ? "partial" : "sent",
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

function requireSmsAvailability() {
  if (!isFeatureAvailable("sms")) {
    redirectWithError("SMS is currently under maintenance.");
  }
}
