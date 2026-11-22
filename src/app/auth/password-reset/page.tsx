import Link from "next/link";
import type { Metadata } from "next";
import {
  completePasswordResetAction,
  requestPasswordResetAction,
} from "@/features/auth/server/auth-actions";
import { PendingSubmitButton } from "@/components/ui/pending-submit-button";
import { PasswordField } from "@/features/auth/components/password-field";
import {
  AuthPageHeader,
  AuthStatus,
  PublicAuthShell,
} from "@/features/auth/components/public-auth-shell";

export const metadata: Metadata = {
  title: "Reset password | MortgagePro",
  description: "Recover access to your MortgagePro lender account.",
};

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
    <PublicAuthShell>
      <AuthPageHeader
        description={
          isCompletingReset
            ? "Choose a new password for your lender account."
            : "Enter your account email and we will send a reset link if an account is available."
        }
        eyebrow="Account recovery"
        title={isCompletingReset ? "Choose a new password" : "Reset your password"}
      />

        <form
          action={
            isCompletingReset
              ? completePasswordResetAction
              : requestPasswordResetAction
          }
          className="mt-7 space-y-4"
        >
          <AuthStatus message={message} status={status} />
          {isCompletingReset ? (
            <>
              <input name="userId" type="hidden" value={userId} />
              <input name="secret" type="hidden" value={secret} />
              <PasswordField
                autoComplete="new-password"
                label="New password"
                minLength={8}
                name="password"
                placeholder="Create password"
              />
              <PasswordField
                autoComplete="new-password"
                label="Confirm password"
                minLength={8}
                name="confirmPassword"
                placeholder="Confirm password"
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
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2563eb] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1d4ed8] active:scale-[0.99] disabled:cursor-wait disabled:opacity-70"
            pendingLabel={isCompletingReset ? "Updating…" : "Sending…"}
          >
            {isCompletingReset ? "Update password" : "Send reset link"}
          </PendingSubmitButton>
        </form>

        <p className="mt-5 text-center text-sm text-[#68758a]">
          Remembered your password?{" "}
          <Link
            className="font-semibold text-[#2563eb] underline-offset-4 hover:underline"
            href="/auth/login"
          >
            Sign in
          </Link>
        </p>
    </PublicAuthShell>
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
  type: "email";
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-[#2d3745]">{label}</span>
      <input
        autoComplete="email"
        className="mt-2 h-12 w-full rounded-xl border border-[#ccd7e4] px-4 text-base text-[#172033] outline-none transition placeholder:text-[#9aa6b6] focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10"
        minLength={minLength}
        name={name}
        placeholder={placeholder}
        required
        type={type}
      />
    </label>
  );
}
