import Link from "next/link";
import { ArrowRight, KeyRound, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { loginAction } from "@/backend/actions/auth-actions";
import { getPrimaryLender } from "@/backend/services/lender-service";

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
    <main className="flex min-h-screen items-center justify-center bg-[#eef2f6] px-5 py-10">
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

          <form action={loginAction} className="mt-8 space-y-5">
            <AuthStatus message={message} status={status} />
            <label className="block">
              <span className="text-sm font-medium text-[#2d3745]">Email</span>
              <input
                className="mt-2 h-12 w-full rounded-md border border-[#cfd8e3] px-4 text-[#15191f] outline-none transition focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10"
                name="email"
                placeholder="owner@company.com"
                required
                type="email"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-[#2d3745]">
                Password
              </span>
              <input
                className="mt-2 h-12 w-full rounded-md border border-[#cfd8e3] px-4 text-[#15191f] outline-none transition focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10"
                name="password"
                placeholder="Enter password"
                required
                type="password"
              />
            </label>

            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm text-[#657386]">
                <input
                  className="h-4 w-4 rounded border-[#cfd8e3]"
                  type="checkbox"
                />
                Remember me
              </label>
              <Link
                className="text-sm font-semibold text-[#2563eb] hover:underline"
                href="/auth/password-reset"
              >
                Forgot password?
              </Link>
            </div>

            <button
              className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#2563eb] px-4 text-sm font-semibold text-white transition hover:bg-[#1d4ed8]"
              type="submit"
            >
              Sign in
              <ArrowRight aria-hidden="true" size={17} />
            </button>
          </form>

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

function AuthStatus({
  message,
  status,
}: {
  message?: string;
  status?: string;
}) {
  if (!message) {
    return null;
  }

  const isError = status === "error";

  return (
    <p
      className={`rounded-md border px-3 py-2 text-sm font-medium ${
        isError
          ? "border-[#fecaca] bg-[#fef2f2] text-[#b91c1c]"
          : "border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]"
      }`}
    >
      {message}
    </p>
  );
}
