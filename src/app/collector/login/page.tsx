import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { collectorLoginAction } from "@/features/collectors/server/collector-actions";
import { requireActiveCollectorPrincipal } from "@/server/services/collector-auth-service";
import { PendingSubmitButton } from "@/components/ui/pending-submit-button";
import { PasswordField } from "@/features/auth/components/password-field";
import {
  AuthPageHeader,
  AuthStatus,
  LenderAccessLink,
  PublicAuthShell,
} from "@/features/auth/components/public-auth-shell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Collector sign in | MortgagePro",
  description: "Sign in to the MortgagePro collector workspace.",
};

export default async function CollectorLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; status?: string }>;
}) {
  const { message, status } = await searchParams;
  const session = await requireActiveCollectorPrincipal();

  if (session) {
    redirect("/collector/scan");
  }

  return (
    <PublicAuthShell secondaryAction={<LenderAccessLink />}>
      <AuthPageHeader
        description="Use the username and password provided by your lender."
        eyebrow="Collector access"
        title="Sign in to collect"
      />

        <form action={collectorLoginAction} className="mt-7 space-y-4">
          <AuthStatus message={message} status={status} />
          <label className="block text-sm font-medium text-[#344158]">
            Username
            <input
              className="mt-2 h-12 w-full rounded-xl border border-[#ccd7e4] px-4 text-base text-[#172033] outline-none transition placeholder:text-[#9aa6b6] focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10"
              autoCapitalize="none"
              autoComplete="username"
              autoCorrect="off"
              spellCheck={false}
              name="username"
              placeholder="Enter your username"
              required
            />
          </label>
          <PasswordField
            autoComplete="current-password"
            label="Password"
            name="password"
            placeholder="Enter your password"
          />
          <PendingSubmitButton
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2563eb] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1d4ed8] active:scale-[0.99] disabled:cursor-wait disabled:opacity-70"
            pendingLabel="Signing in…"
          >
            Continue to scanner
          </PendingSubmitButton>
        </form>
        <p className="mt-5 text-center text-xs leading-5 text-[#5f6b7d]">
          Contact your lender if you do not know your username or password.
        </p>
    </PublicAuthShell>
  );
}
