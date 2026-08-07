export const MAX_SMS_TEMPLATES = 20;
export const MAX_SMS_MESSAGE_CHARACTERS = 480;

export const STARTER_SMS_TEMPLATES = [
  {
    name: "Loan welcome",
    message:
      "Welcome. Your loan has been created successfully. Thank you for choosing us.",
  },
  {
    name: "Payment reminder",
    message: "Hello, this is a reminder about your scheduled loan payment.",
  },
  {
    name: "Loan completed",
    message:
      "Thank you. Your loan has been completed successfully. We appreciate your business.",
  },
] as const;

export function normalizeSmsSenderId(value: string) {
  return value.trim().toLowerCase();
}

export function validateSmsSenderId(value: string) {
  const senderId = value.trim();

  if (!senderId) {
    return "Sender ID is required.";
  }

  if (senderId.length < 3 || senderId.length > 11) {
    return "Sender ID must be 3 to 11 characters.";
  }

  if (!/^[A-Za-z][A-Za-z0-9]*$/.test(senderId)) {
    return "Sender ID must start with a letter and contain only letters and numbers.";
  }

  return null;
}

export function normalizeSmsTemplateName(value: string) {
  return value.trim().replaceAll(/\s+/g, " ").toLowerCase();
}

export function validateSmsTemplate(name: string, message: string) {
  const normalizedName = name.trim().replaceAll(/\s+/g, " ");
  const normalizedMessage = message.trim();

  if (!normalizedName) {
    return "Template name is required.";
  }

  if (normalizedName.length > 80) {
    return "Template name must be 80 characters or fewer.";
  }

  if (!normalizedMessage) {
    return "Template message is required.";
  }

  if (smsCharacterCount(normalizedMessage) > MAX_SMS_MESSAGE_CHARACTERS) {
    return "Template message must be 480 characters or fewer.";
  }

  return null;
}

export function smsCharacterCount(message: string) {
  return Array.from(message).length;
}

export function smsUnitsPerRecipient(message: string) {
  const characters = smsCharacterCount(message.trim());

  if (characters === 0 || characters > MAX_SMS_MESSAGE_CHARACTERS) {
    return 0;
  }

  return Math.ceil(characters / 160);
}

export function colomboMonthKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    month: "2-digit",
    timeZone: "Asia/Colombo",
    year: "numeric",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;

  if (!year || !month) {
    throw new Error("Could not determine the Asia/Colombo calendar month.");
  }

  return `${year}-${month}`;
}

export function previousSmsMonthKeys(currentMonth: string, count = 12) {
  const match = /^(\d{4})-(\d{2})$/.exec(currentMonth);

  if (!match || count < 1) {
    throw new Error("A valid month and positive count are required.");
  }

  let year = Number(match[1]);
  let month = Number(match[2]);
  const values: string[] = [];

  for (let index = 0; index < count; index += 1) {
    values.push(`${year}-${String(month).padStart(2, "0")}`);
    month -= 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
  }

  return values;
}
