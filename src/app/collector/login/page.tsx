import { redirect } from "next/navigation";
import { collectorLoginAction } from "@/backend/actions/collector-actions";
import { requireActiveCollectorPrincipal } from "@/backend/services/collector-auth-service";

export const dynamic = "force-dynamic";

export default async function CollectorLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; status?: string }>;
}) {
  const { message, status } = await searchParams;
  const session = await requireActiveCollectorPrincipal();

  if (session) {
    redirect("/collector/scan");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#eef2f6] px-5 py-10">
      <section className="w-full max-w-md rounded-lg border border-[#d9e0e8] bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-medium text-[#657386]">Collector access</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#15191f]">
          Scan QR code
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#657386]">
          Sign in with the username and password created by your lender.
        </p>

        <form action={collectorLoginAction} className="mt-8 space-y-5">
          <StatusMessage message={message} status={status} />
          <label className="block text-sm font-medium text-[#2d3745]">
            Username
            <input
              className="mt-2 h-12 w-full rounded-md border border-[#cfd8e3] px-4 text-[#15191f] outline-none transition focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10"
              autoCapitalize="none"
              autoComplete="username"
              autoCorrect="off"
              name="username"
              placeholder="jordanlee4821"
              required
            />
          </label>
          <label className="block text-sm font-medium text-[#2d3745]">
            Password
            <input
              className="mt-2 h-12 w-full rounded-md border border-[#cfd8e3] px-4 text-[#15191f] outline-none transition focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10"
              name="password"
              placeholder="Collector password"
              required
              type="password"
            />
          </label>
          <button
            className="h-12 w-full rounded-md bg-[#2563eb] px-4 text-sm font-semibold text-white transition hover:bg-[#1d4ed8]"
            type="submit"
          >
            Continue to scanner
          </button>
        </form>
      </section>
    </main>
  );
}

function StatusMessage({
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
