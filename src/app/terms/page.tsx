import Link from "next/link";
import type { Metadata } from "next";
import {
  AuthPageHeader,
  LenderAccessLink,
  PublicAuthShell,
} from "@/features/auth/components/public-auth-shell";

export const metadata: Metadata = {
  title: "Terms of use | MortgagePro",
  description: "Terms for requesting and operating a MortgagePro workspace.",
};

export default function TermsPage() {
  return (
    <PublicAuthShell secondaryAction={<LenderAccessLink />} wide>
      <AuthPageHeader
        description="Operational terms for using the MortgagePro lender and collector portal."
        eyebrow="Terms"
        title="Terms of use"
      />

      <div className="mt-6 space-y-5 text-sm leading-6 text-[var(--mp-muted)]">
        <section>
          <h2 className="title-3 text-[var(--foreground)]">
            Account review and eligibility
          </h2>
          <p className="mt-2">
            New lender registrations remain inactive until reviewed and
            approved. Lenders are responsible for provisioning, rotating, and
            revoking access for their assigned field collectors.
          </p>
        </section>

        <section>
          <h2 className="title-3 text-[var(--foreground)]">
            Pilot evaluation status
          </h2>
          <p className="mt-2">
            MortgagePro is provided as a controlled pilot lending portal.
            Lenders are responsible for maintaining statutory accounting copies
            and verifying local lending compliance requirements in their
            jurisdiction.
          </p>
        </section>

        <section>
          <h2 className="title-3 text-[var(--foreground)]">
            Responsible messaging
          </h2>
          <p className="mt-2">
            SMS notifications sent through TextLK must comply with applicable
            borrower consent and telecommunications regulations.
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
