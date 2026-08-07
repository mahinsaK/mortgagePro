"use client";

import { useRef, useState, type Ref } from "react";
import { useFormStatus } from "react-dom";
import { ArrowRight } from "lucide-react";
import { PhoneInput } from "@/frontend/components/forms/phone-input";

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
      className="space-y-6"
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
      <AuthStatus message={clientError || message} status={clientError ? "error" : status} />
      <div>
        <h2 className="text-sm font-semibold text-[#15191f]">
          Business information
        </h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <Field
            label="Company name"
            name="companyName"
            placeholder="Northstar Lending"
          />
          <label className="block text-sm font-medium text-[#2d3745]">
            Contact phone
            <PhoneInput
              className="mt-2 h-12 w-full rounded-md border border-[#cfd8e3] px-4 text-[#15191f] outline-none transition focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10"
              name="phone"
              placeholder="+15550100"
              required
            />
          </label>
          <label className="sm:col-span-2 text-sm font-medium text-[#2d3745]">
            Business address
            <textarea
              className="mt-2 min-h-24 w-full rounded-md border border-[#cfd8e3] px-4 py-3 text-[#15191f] outline-none transition focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10"
              name="address"
              placeholder="Street, city, region"
            />
          </label>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-[#15191f]">
          Account access
        </h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <Field
            className="sm:col-span-2"
            label="Business email"
            name="email"
            placeholder="owner@company.com"
            type="email"
          />
          <Field
            inputRef={passwordRef}
            label="Password"
            minLength={8}
            name="password"
            placeholder="Create password"
            type="password"
          />
          <Field
            inputRef={confirmPasswordRef}
            label="Confirm password"
            minLength={8}
            name="confirmPassword"
            placeholder="Confirm password"
            type="password"
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
      className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#2563eb] px-4 text-sm font-semibold text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:bg-[#93c5fd]"
      disabled={pending}
      type="submit"
    >
      {pending ? "Creating account" : "Register lender"}
      <ArrowRight aria-hidden="true" size={17} />
    </button>
  );
}

function AuthStatus({
  message,
  status,
}: {
  message?: string;
  status?: string;
}) {
  if (!message) {
    return null;
  }

  const isError = status === "error";

  return (
    <p
      className={`rounded-md border px-3 py-2 text-sm font-medium ${
        isError
          ? "border-[#fecaca] bg-[#fef2f2] text-[#b91c1c]"
          : "border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]"
      }`}
    >
      {message}
    </p>
  );
}

function Field({
  className = "",
  inputRef,
  label,
  minLength,
  name,
  placeholder,
  type = "text",
}: {
  className?: string;
  inputRef?: Ref<HTMLInputElement>;
  label: string;
  minLength?: number;
  name: string;
  placeholder: string;
  type?: "email" | "password" | "text";
}) {
  return (
    <label className={`${className} block text-sm font-medium text-[#2d3745]`}>
      {label}
      <input
        className="mt-2 h-12 w-full rounded-md border border-[#cfd8e3] px-4 text-[#15191f] outline-none transition focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10"
        minLength={minLength}
        name={name}
        placeholder={placeholder}
        ref={inputRef}
        required
        type={type}
      />
    </label>
  );
}
