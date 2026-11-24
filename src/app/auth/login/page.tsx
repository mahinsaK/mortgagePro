import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { loginAction } from "@/features/auth/server/auth-actions";
import { resolvePrimaryLender } from "@/server/services/lender-service";
import { LoginForm } from "@/features/auth/components/login-form";
import {
  AuthPageHeader,
  CollectorAccessLink,
  LoginOverviewPanel,
  PublicAuthShell,
} from "@/features/auth/components/public-auth-shell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Lender sign in | MortgagePro",
  description: "Sign in to your MortgagePro lender workspace.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; status?: string }>;
}) {
  const { message, status } = await searchParams;
  const auth = await resolvePrimaryLender();

  if (auth.status === "authenticated") {
    redirect("/dashboard/lender");
  }

  if (auth.status === "invalid" || auth.status === "inactive") {
    redirect("/auth/session/clear");
  }

  if (auth.status === "unavailable") {
    redirect("/auth/unavailable");
  }

  return (
    <PublicAuthShell
      aside={<LoginOverviewPanel />}
      secondaryAction={<CollectorAccessLink />}
    >
      <AuthPageHeader
        description="Access your dashboard and continue managing today's lending work."
        eyebrow="Lender portal"
        prominent
        title="Welcome back"
      />

      <LoginForm action={loginAction} message={message} status={status} />

      <p className="mt-5 text-center text-sm text-[var(--mp-muted)]">
        Need a lender account?{" "}
        <Link
          className="inline-flex min-h-11 items-center py-2 font-semibold text-[var(--mp-primary)] underline-offset-4 hover:underline"
          href="/auth/register"
        >
          Request access
        </Link>
      </p>
    </PublicAuthShell>
  );
}
