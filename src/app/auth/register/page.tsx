import Link from "next/link";
import { ArrowRight, Building2 } from "lucide-react";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#eef2f6] px-5 py-10">
      <section className="w-full max-w-3xl rounded-lg border border-[#d9e0e8] bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-8">
          <Link
            className="text-sm font-semibold text-[#2563eb] hover:underline"
            href="/auth/login"
          >
            Back to login
          </Link>
          <div className="mt-6 flex h-12 w-12 items-center justify-center rounded-md bg-[#e0ecff] text-[#2563eb]">
            <Building2 aria-hidden="true" size={24} />
          </div>
          <p className="mt-5 text-sm font-medium text-[#657386]">
            Lender registration
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-[#15191f]">
            Create your lender account
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#657386]">
            Register your business first. Borrowers and collectors can be added
            after your lender dashboard is ready.
          </p>
        </div>

        <form className="space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-[#15191f]">
              Business information
            </h2>
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <Field
                label="Company name"
                name="companyName"
                placeholder="Northstar Lending"
              />
              <Field
                label="Contact phone"
                name="phone"
                placeholder="+1 555 0100"
              />
              <label className="sm:col-span-2 text-sm font-medium text-[#2d3745]">
                Business address
                <textarea
                  className="mt-2 min-h-24 w-full rounded-md border border-[#cfd8e3] px-4 py-3 text-[#15191f] outline-none transition focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10"
                  name="address"
                  placeholder="Street, city, region"
                />
              </label>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-[#15191f]">
              Account access
            </h2>
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <Field
                className="sm:col-span-2"
                label="Business email"
                name="email"
                placeholder="owner@company.com"
                type="email"
              />
              <Field
                label="Password"
                name="password"
                placeholder="Create password"
                type="password"
              />
              <Field
                label="Confirm password"
                name="confirmPassword"
                placeholder="Confirm password"
                type="password"
              />
            </div>
          </div>

          <Link
            className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#2563eb] px-4 text-sm font-semibold text-white transition hover:bg-[#1d4ed8]"
            href="/dashboard/lender"
          >
            Register lender
            <ArrowRight aria-hidden="true" size={17} />
          </Link>
        </form>

        <p className="mt-6 text-center text-sm text-[#657386]">
          Already registered?{" "}
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

function Field({
  className = "",
  label,
  name,
  placeholder,
  type = "text",
}: {
  className?: string;
  label: string;
  name: string;
  placeholder: string;
  type?: "email" | "password" | "text";
}) {
  return (
    <label className={`${className} block text-sm font-medium text-[#2d3745]`}>
      {label}
      <input
        className="mt-2 h-12 w-full rounded-md border border-[#cfd8e3] px-4 text-[#15191f] outline-none transition focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10"
        name={name}
        placeholder={placeholder}
        type={type}
      />
    </label>
  );
}
