export const currencyOptions = [
  { code: "USD", label: "USD - US Dollar", locale: "en-US" },
  { code: "LKR", label: "LKR - Sri Lankan Rupee", locale: "si-LK" },
  { code: "EUR", label: "EUR - Euro", locale: "en-IE" },
  { code: "GBP", label: "GBP - British Pound", locale: "en-GB" },
  { code: "INR", label: "INR - Indian Rupee", locale: "en-IN" },
  { code: "AUD", label: "AUD - Australian Dollar", locale: "en-AU" },
  { code: "CAD", label: "CAD - Canadian Dollar", locale: "en-CA" },
] as const;

const fallbackCurrency = "USD";
const supportedCurrencyCodes = new Set<string>(
  currencyOptions.map((option) => option.code),
);

export function normalizeCurrency(value: string | null | undefined) {
  const currency = String(value ?? "").trim().toUpperCase();

  return supportedCurrencyCodes.has(currency) ? currency : fallbackCurrency;
}

export function formatMoney(value: number, currency: string | null | undefined) {
  const normalizedCurrency = normalizeCurrency(currency);
  const locale =
    currencyOptions.find((option) => option.code === normalizedCurrency)?.locale ??
    "en-US";

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: normalizedCurrency,
  }).format(value);
}
