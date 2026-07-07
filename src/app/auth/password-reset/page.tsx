import Link from "next/link";
import { MailCheck } from "lucide-react";

export default function PasswordResetPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#eef2f6] px-5 py-10">
      <section className="w-full max-w-md rounded-lg border border-[#d9e0e8] bg-white p-6 shadow-sm sm:p-8">
        <Link
          className="text-sm font-semibold text-[#2563eb] hover:underline"
          href="/auth/login"
        >
          Back to login
        </Link>

        <div className="mt-6 flex h-12 w-12 items-center justify-center rounded-md bg-[#e0ecff] text-[#2563eb]">
          <MailCheck aria-hidden="true" size={24} />
        </div>
        <p className="mt-5 text-sm font-medium text-[#657386]">
          Password recovery
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-[#15191f]">
          Reset your password
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#657386]">
          Enter the email used for your lender account. The Appwrite reset email
          will connect to this screen when authentication is wired.
        </p>

        <form className="mt-8 space-y-5">
          <label className="block">
            <span className="text-sm font-medium text-[#2d3745]">Email</span>
            <input
              className="mt-2 h-12 w-full rounded-md border border-[#cfd8e3] px-4 text-[#15191f] outline-none transition focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10"
              name="email"
              placeholder="owner@company.com"
              type="email"
            />
          </label>

          <button
            className="flex h-12 w-full items-center justify-center rounded-md bg-[#2563eb] px-4 text-sm font-semibold text-white transition hover:bg-[#1d4ed8]"
            type="button"
          >
            Send reset link
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#657386]">
          Remembered your password?{" "}
          <Link
            className="font-semibold text-[#2563eb] hover:underline"
            href="/auth/login"
          >
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
