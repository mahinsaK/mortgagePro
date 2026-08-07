const MIN_PHONE_DIGITS = 7;
const MAX_PHONE_DIGITS = 15;
const ALLOWED_PHONE_FORMAT = /^\+?[0-9\s().-]+$/;

export function sanitizePhoneNumberDraft(value: string) {
  const trimmed = value.trimStart();
  const prefix = trimmed.startsWith("+") ? "+" : "";
  const digits = trimmed.replace(/\D/g, "").slice(0, MAX_PHONE_DIGITS);

  return `${prefix}${digits}`;
}

export function normalizeOptionalPhoneNumber(
  value: unknown,
  fieldLabel = "Phone number",
) {
  const phoneNumber = String(value ?? "").trim();
  if (!phoneNumber) {
    return "";
  }

  return normalizePhoneNumber(phoneNumber, fieldLabel);
}

export function normalizeRequiredPhoneNumber(
  value: unknown,
  fieldLabel = "Phone number",
) {
  const phoneNumber = String(value ?? "").trim();
  if (!phoneNumber) {
    throw new Error(`${fieldLabel} is required.`);
  }

  return normalizePhoneNumber(phoneNumber, fieldLabel);
}

function normalizePhoneNumber(phoneNumber: string, fieldLabel: string) {
  if (!ALLOWED_PHONE_FORMAT.test(phoneNumber)) {
    throw new Error(
      `${fieldLabel} can contain only digits and an optional leading +.`,
    );
  }

  const digits = phoneNumber.replace(/\D/g, "");
  if (digits.length < MIN_PHONE_DIGITS || digits.length > MAX_PHONE_DIGITS) {
    throw new Error(`${fieldLabel} must contain 7 to 15 digits.`);
  }

  return phoneNumber.startsWith("+") ? `+${digits}` : digits;
}
