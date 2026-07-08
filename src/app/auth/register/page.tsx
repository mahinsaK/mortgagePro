import Link from "next/link";
import { Building2, QrCode } from "lucide-react";
import { registerLenderAction } from "@/backend/actions/auth-actions";
import { RegisterLenderForm } from "@/frontend/components/auth/register-lender-form";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; status?: string }>;
}) {
  const { message, status } = await searchParams;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#eef2f6] px-5 py-10">
      <Link
        className="flex h-12 w-full max-w-md items-center justify-center gap-2 rounded-md bg-[#15191f] px-4 text-sm font-semibold text-white shadow-sm md:hidden"
        href="/collector/login"
      >
        <QrCode aria-hidden="true" size={18} />
        Scan QR code
      </Link>
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

        <RegisterLenderForm
          action={registerLenderAction}
          message={message}
          status={status}
        />

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
