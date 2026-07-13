import { CircleAlert, RefreshCw } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function AuthenticationUnavailablePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#eef2f6] px-5 py-10">
      <section className="w-full max-w-md rounded-lg border border-[#d9e0e8] bg-white p-8 text-center shadow-sm">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#fff7ed] text-[#c2410c]">
          <CircleAlert aria-hidden="true" size={24} />
        </span>
        <p className="mt-5 text-sm font-semibold uppercase tracking-[0.16em] text-[#657386]">
          MortgagePro
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-[#15191f]">
          Authentication is temporarily unavailable
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#657386]">
          Your login has not been removed. Please wait a moment and try again.
        </p>
        <Link
          className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#2563eb] px-4 text-sm font-semibold text-white transition hover:bg-[#1d4ed8]"
          href="/auth/login"
        >
          <RefreshCw aria-hidden="true" size={17} />
          Try again
        </Link>
      </section>
    </main>
  );
}
