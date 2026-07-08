"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useFormStatus } from "react-dom";

type LoginFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  message?: string;
  status?: string;
};

export function LoginForm({ action, message, status }: LoginFormProps) {
  return (
    <form action={action} className="mt-8 space-y-5">
      <AuthStatus message={message} status={status} />
      <label className="block">
        <span className="text-sm font-medium text-[#2d3745]">Email</span>
        <input
          className="mt-2 h-12 w-full rounded-md border border-[#cfd8e3] px-4 text-[#15191f] outline-none transition focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10"
          name="email"
          placeholder="owner@company.com"
          required
          type="email"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-[#2d3745]">Password</span>
        <input
          className="mt-2 h-12 w-full rounded-md border border-[#cfd8e3] px-4 text-[#15191f] outline-none transition focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10"
          name="password"
          placeholder="Enter password"
          required
          type="password"
        />
      </label>

      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-[#657386]">
          <input className="h-4 w-4 rounded border-[#cfd8e3]" type="checkbox" />
          Remember me
        </label>
        <Link
          className="text-sm font-semibold text-[#2563eb] hover:underline"
          href="/auth/password-reset"
        >
          Forgot password?
        </Link>
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
      {pending ? "Signing in" : "Sign in"}
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
