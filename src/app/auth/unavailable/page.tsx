import { CircleAlert, RefreshCw } from "lucide-react";
import Link from "next/link";
import { PublicAuthShell } from "@/features/auth/components/public-auth-shell";

export const dynamic = "force-dynamic";

export default function AuthenticationUnavailablePage() {
  return (
    <PublicAuthShell>
      <div className="text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#fff7ed] text-[#c2410c]">
          <CircleAlert aria-hidden="true" size={24} />
        </span>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-[#9a5b21]">
          Temporary interruption
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.025em] text-[#172033]">
          Sign in is temporarily unavailable
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#68758a]">
          Your account is safe. Please wait a moment and try again.
        </p>
        <Link
          className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2563eb] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1d4ed8] active:scale-[0.99]"
          href="/auth/login"
        >
          <RefreshCw aria-hidden="true" size={17} />
          Try again
        </Link>
      </div>
    </PublicAuthShell>
  );
}
