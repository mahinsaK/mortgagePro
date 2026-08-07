import { redirect } from "next/navigation";
import {
  collectScannedPaymentAction,
  collectorLogoutAllDevicesAction,
  collectorLogoutAction,
} from "@/backend/actions/collector-actions";
import { requireActiveCollectorPrincipal } from "@/backend/services/collector-auth-service";
import { CollectorScanner } from "@/frontend/components/collector/collector-scanner";
import { SessionKeepAlive } from "@/frontend/components/auth/session-keep-alive";

export const dynamic = "force-dynamic";

export default async function CollectorScanPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; status?: string }>;
}) {
  const session = await requireActiveCollectorPrincipal();
  const { message, status } = await searchParams;

  if (!session) {
    redirect("/collector/login");
  }

  return (
    <main className="min-h-screen bg-[#eef2f6] px-4 py-5 text-[#15191f]">
      <SessionKeepAlive kind="collector" />
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-[#657386]">Collector</p>
            <h1 className="text-2xl font-semibold">{session.name}</h1>
          </div>
          <div className="flex flex-col items-end gap-1.5 sm:flex-row">
            <form action={collectorLogoutAction}>
              <button
                className="h-10 rounded-md border border-[#cfd8e3] bg-white px-3 text-sm font-semibold text-[#2d3745]"
                type="submit"
              >
                Log out
              </button>
            </form>
            <form action={collectorLogoutAllDevicesAction}>
              <button
                className="text-xs font-semibold text-[#657386] underline-offset-2 hover:underline sm:h-10 sm:rounded-md sm:border sm:border-[#cfd8e3] sm:bg-white sm:px-3 sm:text-sm sm:no-underline"
                type="submit"
              >
                Log out all devices
              </button>
            </form>
          </div>
        </header>

        <CollectorScanner
          collectAction={collectScannedPaymentAction}
          currency={session.currency}
          message={message}
          status={status}
        />
      </div>
    </main>
  );
}
