const MIN_USERNAME_LENGTH = 5;
const MAX_USERNAME_LENGTH = 36;
const GENERATED_SUFFIX_LENGTH = 4;
const NEW_USERNAME_PATTERN = /^[a-z][a-z0-9]{4,35}$/;

export function normalizeCollectorUsernameDraft(value: string) {
  return value.toLowerCase().replaceAll(/[^a-z0-9]/g, "").slice(0, MAX_USERNAME_LENGTH);
}

export function validateNewCollectorUsername(value: string) {
  if (!value) {
    return "Username is required.";
  }

  if (value.length < MIN_USERNAME_LENGTH || value.length > MAX_USERNAME_LENGTH) {
    return `Username must be ${MIN_USERNAME_LENGTH}-${MAX_USERNAME_LENGTH} characters.`;
  }

  if (!NEW_USERNAME_PATTERN.test(value)) {
    return "Username must start with a lowercase letter and contain only lowercase letters and numbers.";
  }

  return null;
}

export function generateCollectorUsername(name: string, suffix = randomFourDigitSuffix()) {
  const normalizedName = name
    .normalize("NFKD")
    .replaceAll(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]/g, "");
  const usableBase = /^[a-z]/.test(normalizedName) ? normalizedName : "collector";
  const normalizedSuffix = String(suffix)
    .replaceAll(/\D/g, "")
    .padStart(GENERATED_SUFFIX_LENGTH, "0")
    .slice(-GENERATED_SUFFIX_LENGTH);
  const maxBaseLength = MAX_USERNAME_LENGTH - GENERATED_SUFFIX_LENGTH;

  return `${usableBase.slice(0, maxBaseLength)}${normalizedSuffix}`;
}

function randomFourDigitSuffix() {
  const values = new Uint16Array(1);
  crypto.getRandomValues(values);
  return String(values[0] % 10_000).padStart(GENERATED_SUFFIX_LENGTH, "0");
}
