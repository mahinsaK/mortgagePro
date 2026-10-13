import { getPaymentsPageData } from "@/backend/services/lending-service";
import { PaymentsInfiniteList } from "@/frontend/components/payments/payments-infinite-list";

export const dynamic = "force-dynamic";

/** Renders the first payment-history page for client-side infinite loading. */
export default async function PaymentsPage() {
  const { payments, pageInfo } = await getPaymentsPageData({
    page: 1,
    pageSize: 20,
  });

  return (
    <div>
      <div className="mb-6 md:mb-8">
        <p className="text-sm font-medium text-[#657386]">Payments</p>
        <h1 className="mt-1 text-2xl font-semibold md:mt-2 md:text-3xl">Payment history</h1>
      </div>

      <section className="rounded-lg border border-[#dfe5ec] bg-white shadow-sm">
        <div className="border-b border-[#dfe5ec] px-5 py-4">
          <h2 className="text-lg font-semibold">Payments list</h2>
        </div>
        <PaymentsInfiniteList initialPage={{ items: payments, pageInfo }} />
      </section>
    </div>
  );
}
