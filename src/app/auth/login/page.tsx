import Link from "next/link";
import { KeyRound, QrCode, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { loginAction } from "@/backend/actions/auth-actions";
import { resolvePrimaryLender } from "@/backend/services/lender-service";
import { LoginForm } from "@/frontend/components/auth/login-form";

export const dynamic = "force-dynamic";

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
    <main className="flex min-h-screen items-center justify-center bg-[#eef2f6] px-4 py-6 md:px-5 md:py-10">
      <section className="grid w-full max-w-md overflow-hidden rounded-xl border border-[#d9e0e8] bg-white shadow-sm md:max-w-5xl md:grid-cols-[1fr_430px] md:rounded-lg">
        <div className="hidden min-h-[560px] flex-col justify-between bg-[#102235] p-10 text-white md:flex">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#93c5fd]">
              MortgagePro
            </p>
            <h1 className="mt-8 max-w-xl text-4xl font-semibold leading-tight md:text-5xl">
              Run lending operations with one focused workspace.
            </h1>
            <p className="mt-5 max-w-md text-sm leading-6 text-[#c8d4e2]">
              Track borrowers, collectors, loans, QR collections, and daily
              payments from a dashboard built for lender teams.
            </p>
          </div>

          <div className="grid gap-4 text-sm text-[#c8d4e2] sm:grid-cols-2">
            <div className="rounded-md border border-white/10 bg-white/5 p-4">
              <ShieldCheck className="mb-3 text-[#93c5fd]" size={22} />
              <p className="font-semibold text-white">Lender-owned data</p>
              <p className="mt-1">Borrowers and collectors stay scoped.</p>
            </div>
            <div className="rounded-md border border-white/10 bg-white/5 p-4">
              <KeyRound className="mb-3 text-[#93c5fd]" size={22} />
              <p className="font-semibold text-white">Appwrite ready</p>
              <p className="mt-1">Auth can plug into this flow cleanly.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center p-5 sm:p-8">
          <div>
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium text-[#657386]">
                Lender portal
              </p>
              <Link
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#dfe5ec] px-2.5 text-xs font-semibold text-[#2d3745] transition hover:bg-[#f8fafc] md:hidden"
                href="/collector/login"
              >
                <QrCode aria-hidden="true" size={14} />
                Collector login
              </Link>
            </div>
            <h2 className="mt-2 text-3xl font-semibold text-[#15191f]">
              Sign in
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#657386]">
              Access your lender dashboard and manage today&apos;s lending work.
            </p>
          </div>

          <LoginForm action={loginAction} message={message} status={status} />

          <p className="mt-6 text-center text-sm text-[#657386]">
            Don&apos;t have an account?{" "}
            <Link
              className="font-semibold text-[#2563eb] hover:underline"
              href="/auth/register"
            >
              Register as a lender
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
