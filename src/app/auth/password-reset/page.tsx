import Link from "next/link";
import { MailCheck } from "lucide-react";
import {
  completePasswordResetAction,
  requestPasswordResetAction,
} from "@/backend/actions/auth-actions";
import { PendingSubmitButton } from "@/frontend/components/ui/pending-submit-button";

export default async function PasswordResetPage({
  searchParams,
}: {
  searchParams: Promise<{
    message?: string;
    secret?: string;
    status?: string;
    userId?: string;
  }>;
}) {
  const { message, secret, status, userId } = await searchParams;
  const isCompletingReset = Boolean(userId && secret);

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#eef2f6] px-3 py-[max(1rem,env(safe-area-inset-top))] sm:px-5 sm:py-10">
      <section className="w-full max-w-md rounded-lg border border-[#d9e0e8] bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-sm sm:p-8">
        <Link
          className="text-sm font-semibold text-[#2563eb] hover:underline"
          href="/auth/login"
        >
          Back to login
        </Link>

        <div className="mt-6 flex h-12 w-12 items-center justify-center rounded-md bg-[#e0ecff] text-[#2563eb]">
          <MailCheck aria-hidden="true" size={24} />
        </div>
        <p className="mt-5 text-sm font-medium text-[#657386]">
          Password recovery
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-[#15191f]">
          Reset your password
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#657386]">
          {isCompletingReset
            ? "Choose a new password for your lender account."
            : "Enter the email used for your lender account. We will send a reset link if the account exists."}
        </p>

        <form
          action={
            isCompletingReset
              ? completePasswordResetAction
              : requestPasswordResetAction
          }
          className="mt-8 space-y-5"
        >
          <AuthStatus message={message} status={status} />
          {isCompletingReset ? (
            <>
              <input name="userId" type="hidden" value={userId} />
              <input name="secret" type="hidden" value={secret} />
              <Field
                label="New password"
                minLength={8}
                name="password"
                placeholder="Create password"
                type="password"
              />
              <Field
                label="Confirm password"
                minLength={8}
                name="confirmPassword"
                placeholder="Confirm password"
                type="password"
              />
            </>
          ) : (
            <Field
              label="Email"
              name="email"
              placeholder="owner@company.com"
              type="email"
            />
          )}

          <PendingSubmitButton
            className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#2563eb] px-4 text-sm font-semibold text-white transition hover:bg-[#1d4ed8] disabled:cursor-wait disabled:opacity-70"
            pendingLabel={isCompletingReset ? "Updating…" : "Sending…"}
          >
            {isCompletingReset ? "Update password" : "Send reset link"}
          </PendingSubmitButton>
        </form>

        <p className="mt-6 text-center text-sm text-[#657386]">
          Remembered your password?{" "}
          <Link
            className="font-semibold text-[#2563eb] hover:underline"
            href="/auth/login"
          >
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}

function Field({
  label,
  minLength,
  name,
  placeholder,
  type,
}: {
  label: string;
  minLength?: number;
  name: string;
  placeholder: string;
  type: "email" | "password";
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-[#2d3745]">{label}</span>
      <input
        autoComplete={type === "email" ? "email" : "new-password"}
        className="mt-2 h-12 w-full rounded-md border border-[#cfd8e3] px-4 text-[#15191f] outline-none transition focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10"
        minLength={minLength}
        name={name}
        placeholder={placeholder}
        required
        type={type}
      />
    </label>
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
      aria-live="polite"
      className={`rounded-md border px-3 py-2 text-sm font-medium ${
        isError
          ? "border-[#fecaca] bg-[#fef2f2] text-[#b91c1c]"
          : "border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]"
      }`}
      role={isError ? "alert" : "status"}
    >
      {message}
    </p>
  );
}
