import Link from "next/link";
import {
  AuthPageHeader,
  PublicAuthShell,
} from "@/features/auth/components/public-auth-shell";

export default function NotFound() {
  return (
    <PublicAuthShell>
      <AuthPageHeader
        description="The page you requested could not be found. Return to the homepage or sign in to your workspace."
        eyebrow="404 Not found"
        title="Page not found"
      />

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link
          className="button-sm inline-flex min-h-12 flex-1 items-center justify-center rounded-xl bg-[var(--mp-primary)] px-4 py-2 text-white transition hover:bg-[var(--mp-primary-strong)]"
          href="/"
        >
          Return home
        </Link>
        <Link
          className="button-sm inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-[var(--mp-surface)] px-4 py-2 text-[var(--foreground)] transition hover:bg-[var(--mp-surface-muted)]"
          href="/auth/login"
        >
          Lender sign in
        </Link>
      </div>
    </PublicAuthShell>
  );
}
