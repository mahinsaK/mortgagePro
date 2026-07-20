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
    <div className="mt-8">
      <AuthStatus message={message} status={status} />

      <Link
        className="mt-5 flex h-12 w-full items-center justify-center gap-3 rounded-md border border-[#cfd8e3] bg-white px-4 text-sm font-semibold text-[#2d3745] transition hover:border-[#aebac8] hover:bg-[#f8fafc] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2563eb]/10"
        href="/auth/google"
      >
        <GoogleIcon />
        Continue with Google
      </Link>

      <div className="my-6 flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-[#d9e0e8]" />
        <span className="text-xs font-medium uppercase tracking-[0.12em] text-[#7b8797]">
          or continue with email
        </span>
        <span className="h-px flex-1 bg-[#d9e0e8]" />
      </div>

      <form action={action} className="space-y-5">
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
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" height="18" viewBox="0 0 18 18" width="18">
      <path
        d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.797 2.716v2.259h2.909c1.702-1.567 2.684-3.874 2.684-6.615Z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.91-2.259c-.805.54-1.835.859-3.046.859-2.344 0-4.328-1.585-5.037-3.714H.956v2.332A9 9 0 0 0 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.963 10.706A5.41 5.41 0 0 1 3.682 9c0-.592.102-1.168.281-1.706V4.962H.956A9 9 0 0 0 0 9c0 1.452.347 2.826.956 4.038l3.007-2.332Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.507.454 3.441 1.346l2.582-2.582C13.463.892 11.426 0 9 0A9 9 0 0 0 .956 4.962l3.007 2.332C4.672 5.165 6.656 3.58 9 3.58Z"
        fill="#EA4335"
      />
    </svg>
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
