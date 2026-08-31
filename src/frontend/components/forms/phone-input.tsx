"use client";

import type { ComponentPropsWithoutRef, InputEvent } from "react";
import { sanitizePhoneNumberDraft } from "@/shared/phone-number";

type PhoneInputProps = Omit<
  ComponentPropsWithoutRef<"input">,
  "inputMode" | "maxLength" | "pattern" | "type"
>;

export function PhoneInput({
  autoComplete = "tel",
  defaultValue,
  onInput,
  value,
  ...props
}: PhoneInputProps) {
  function handleInput(event: InputEvent<HTMLInputElement>) {
    event.currentTarget.value = sanitizePhoneNumberDraft(
      event.currentTarget.value,
    );
    onInput?.(event);
  }

  return (
    <input
      {...props}
      autoComplete={autoComplete}
      defaultValue={normalizeDisplayValue(defaultValue)}
      inputMode="tel"
      maxLength={16}
      onInput={handleInput}
      pattern="\+?[0-9]{7,15}"
      title="Enter 7 to 15 digits with an optional leading +"
      type="tel"
      value={normalizeDisplayValue(value)}
    />
  );
}

function normalizeDisplayValue(value: PhoneInputProps["value"]) {
  if (typeof value === "string" || typeof value === "number") {
    return sanitizePhoneNumberDraft(String(value));
  }

  return value;
}
