import Link from "next/link";
import type { Metadata } from "next";
import {
  AuthPageHeader,
  LenderAccessLink,
  PublicAuthShell,
} from "@/features/auth/components/public-auth-shell";

export const metadata: Metadata = {
  title: "Privacy policy | MortgagePro",
  description:
    "How MortgagePro stores and protects lender, borrower, collector, and SMS notification data.",
};

export default function PrivacyPage() {
  return (
    <PublicAuthShell secondaryAction={<LenderAccessLink />} wide>
      <AuthPageHeader
        description="Summary of how workspace data is handled inside MortgagePro."
        eyebrow="Privacy"
        title="Privacy policy"
      />

      <div className="mt-6 space-y-5 text-sm leading-6 text-[var(--mp-muted)]">
        <section>
          <h2 className="title-3 text-[var(--foreground)]">
            Workspace and tenant separation
          </h2>
          <p className="mt-2">
            MortgagePro stores lender profiles, borrower records, loans,
            repayments, collector credentials, and SMS logs in server side
            Appwrite collections scoped strictly to each authenticated lender
            workspace.
          </p>
        </section>

        <section>
          <h2 className="title-3 text-[var(--foreground)]">
            Authentication and session cookies
          </h2>
          <p className="mt-2">
            Lender sessions use HTTP only session cookies and optional Google
            sign in for already approved accounts. Collector passwords are
            stored as salted scrypt hashes and validated on the server.
          </p>
        </section>

        <section>
          <h2 className="title-3 text-[var(--foreground)]">
            SMS notifications
          </h2>
          <p className="mt-2">
            When a lender sends borrower SMS notifications, recipient numbers
            and message text are transmitted to the configured TextLK gateway.
            Send logs store sanitized batch summaries rather than raw secret
            credentials.
          </p>
        </section>
      </div>

      <div className="mt-8 border-t border-[var(--mp-border)] pt-5">
        <Link
          className="button-sm inline-flex min-h-11 items-center text-[var(--mp-primary)] underline-offset-4 hover:underline"
          href="/"
        >
          Back to MortgagePro home
        </Link>
      </div>
    </PublicAuthShell>
  );
}
