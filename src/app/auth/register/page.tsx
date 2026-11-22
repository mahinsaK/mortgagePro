import Link from "next/link";
import type { Metadata } from "next";
import { registerLenderAction } from "@/features/auth/server/auth-actions";
import { RegisterLenderForm } from "@/features/auth/components/register-lender-form";
import {
  AuthPageHeader,
  CollectorAccessLink,
  PublicAuthShell,
} from "@/features/auth/components/public-auth-shell";

export const metadata: Metadata = {
  title: "Request lender access | MortgagePro",
  description: "Request a MortgagePro lender account for your business.",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; status?: string }>;
}) {
  const { message, status } = await searchParams;

  return (
    <PublicAuthShell secondaryAction={<CollectorAccessLink />} wide>
      <div className="mx-auto max-w-2xl">
        <AuthPageHeader
          description="Tell us about your business. Your account will be available after it is reviewed and approved."
          eyebrow="Lender registration"
          title="Request lender access"
        />

        <RegisterLenderForm
          action={registerLenderAction}
          message={message}
          status={status}
        />

        <p className="mt-5 text-center text-sm text-[#68758a]">
          Already have an account?{" "}
          <Link
            className="font-semibold text-[#2563eb] underline-offset-4 hover:underline"
            href="/auth/login"
          >
            Sign in
          </Link>
        </p>
      </div>
    </PublicAuthShell>
  );
}
