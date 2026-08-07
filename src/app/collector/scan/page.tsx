import { redirect } from "next/navigation";
import {
  collectScannedPaymentAction,
  collectorLogoutAction,
} from "@/backend/actions/collector-actions";
import { requireActiveCollectorPrincipal } from "@/backend/services/collector-auth-service";
import { getLenderCurrencyById } from "@/backend/services/lender-service";
import { CollectorScanner } from "@/frontend/components/collector/collector-scanner";

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

  const currency = await getLenderCurrencyById(session.lenderId);

  return (
    <main className="min-h-screen bg-[#eef2f6] px-4 py-5 text-[#15191f]">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-[#657386]">Collector</p>
            <h1 className="text-2xl font-semibold">{session.name}</h1>
          </div>
          <form action={collectorLogoutAction}>
            <button
              className="h-10 rounded-md border border-[#cfd8e3] bg-white px-3 text-sm font-semibold text-[#2d3745]"
              type="submit"
            >
              Log out
            </button>
          </form>
        </header>

        <CollectorScanner
          collectAction={collectScannedPaymentAction}
          currency={currency}
          message={message}
          status={status}
        />
      </div>
    </main>
  );
}
