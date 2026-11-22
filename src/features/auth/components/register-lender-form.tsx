"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { PhoneInput } from "@/components/forms/phone-input";
import { PasswordField } from "@/features/auth/components/password-field";
import { AuthStatus } from "@/features/auth/components/public-auth-shell";

type RegisterLenderFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  message?: string;
  status?: string;
};

export function RegisterLenderForm({
  action,
  message,
  status,
}: RegisterLenderFormProps) {
  const [clientError, setClientError] = useState("");
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);

  return (
    <form
      action={action}
      className="mt-7 space-y-6"
      onSubmit={(event) => {
        const password = passwordRef.current?.value ?? "";
        const confirmPassword = confirmPasswordRef.current?.value ?? "";

        if (password.length < 8) {
          event.preventDefault();
          setClientError("Password must be at least 8 characters.");
          passwordRef.current?.focus();
          return;
        }

        if (password !== confirmPassword) {
          event.preventDefault();
          setClientError("Password and confirmation do not match.");
          passwordRef.current!.value = "";
          confirmPasswordRef.current!.value = "";
          passwordRef.current?.focus();
          return;
        }

        setClientError("");
      }}
    >
      <AuthStatus
        message={clientError || message}
        status={clientError ? "error" : status}
      />
      <div className="rounded-2xl border border-[#e2e8f0] bg-[#fbfcfe] p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-[#172033]">
          Business information
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field
            autoComplete="organization"
            label="Company name"
            name="companyName"
            placeholder="Northstar Lending"
          />
          <label className="block text-sm font-medium text-[#344158]">
            Contact phone
            <PhoneInput
              autoComplete="tel"
              className="mt-2 h-12 w-full rounded-xl border border-[#ccd7e4] bg-white px-4 text-base text-[#172033] outline-none transition focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10"
              name="phone"
              placeholder="+15550100"
              required
            />
          </label>
          <label className="sm:col-span-2 text-sm font-medium text-[#344158]">
            Business address
            <textarea
              autoComplete="street-address"
              className="mt-2 min-h-20 w-full rounded-xl border border-[#ccd7e4] bg-white px-4 py-3 text-base text-[#172033] outline-none transition placeholder:text-[#9aa6b6] focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10"
              name="address"
              placeholder="Street, city, region"
            />
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-[#e2e8f0] bg-[#fbfcfe] p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-[#172033]">
          Account access
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field
            autoComplete="email"
            className="sm:col-span-2"
            label="Business email"
            name="email"
            placeholder="owner@company.com"
            type="email"
          />
          <PasswordField
            autoComplete="new-password"
            label="Password"
            minLength={8}
            name="password"
            placeholder="Create password"
            ref={passwordRef}
          />
          <PasswordField
            autoComplete="new-password"
            label="Confirm password"
            minLength={8}
            name="confirmPassword"
            placeholder="Confirm password"
            ref={confirmPasswordRef}
          />
        </div>
      </div>

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2563eb] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1d4ed8] active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-[#93c5fd]"
      disabled={pending}
      type="submit"
    >
      {pending ? (
        <>
          <LoaderCircle aria-hidden="true" className="animate-spin" size={17} />
          Creating account…
        </>
      ) : (
        <>
          Submit request
          <ArrowRight aria-hidden="true" size={17} />
        </>
      )}
    </button>
  );
}

function Field({
  autoComplete,
  className = "",
  label,
  name,
  placeholder,
  type = "text",
}: {
  autoComplete?: string;
  className?: string;
  label: string;
  name: string;
  placeholder: string;
  type?: "email" | "text";
}) {
  return (
    <label className={`${className} block text-sm font-medium text-[#344158]`}>
      {label}
      <input
        autoComplete={autoComplete}
        className="mt-2 h-12 w-full rounded-xl border border-[#ccd7e4] bg-white px-4 text-base text-[#172033] outline-none transition placeholder:text-[#9aa6b6] focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10"
        name={name}
        placeholder={placeholder}
        required
        type={type}
      />
    </label>
  );
}
