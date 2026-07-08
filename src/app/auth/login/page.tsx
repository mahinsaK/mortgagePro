import Link from "next/link";
import { KeyRound, QrCode, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { loginAction } from "@/backend/actions/auth-actions";
import { getPrimaryLender } from "@/backend/services/lender-service";
import { LoginForm } from "@/frontend/components/auth/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; status?: string }>;
}) {
  const { message, status } = await searchParams;
  const lender = await getPrimaryLender();

  if (lender) {
    redirect("/dashboard/lender");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#eef2f6] px-5 py-10">
      <Link
        className="flex h-12 w-full max-w-md items-center justify-center gap-2 rounded-md bg-[#15191f] px-4 text-sm font-semibold text-white shadow-sm md:hidden"
        href="/collector/login"
      >
        <QrCode aria-hidden="true" size={18} />
        Scan QR code
      </Link>
      <section className="grid w-full max-w-5xl overflow-hidden rounded-lg border border-[#d9e0e8] bg-white shadow-sm md:grid-cols-[1fr_430px]">
        <div className="flex min-h-[560px] flex-col justify-between bg-[#102235] p-8 text-white md:p-10">
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

        <div className="flex flex-col justify-center p-6 sm:p-8">
          <div>
            <p className="text-sm font-medium text-[#657386]">Lender portal</p>
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
