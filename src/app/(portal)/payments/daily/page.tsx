import Link from "next/link";
import {
  getDailyCollectionCollectors,
  getDailyCollectionsData,
} from "@/backend/services/lending-service";
import { DailyCollectionsTable } from "@/frontend/components/payments/daily-collections-table";

export const dynamic = "force-dynamic";

export default async function DailyCollectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const selectedDate = date || toDateInputValue(new Date());
  const [{ payments, pageInfo }, collectors] = await Promise.all([
    getDailyCollectionsData(selectedDate, { page: 1, pageSize: 20 }),
    getDailyCollectionCollectors(),
  ]);

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4 md:mb-8">
        <div>
          <p className="text-sm font-medium text-[#657386]">
            Daily collections
          </p>
          <h1 className="mt-1 text-2xl font-semibold md:mt-2 md:text-3xl">Payments by day</h1>
        </div>
        <Link
          className="shrink-0 rounded-md border border-[#cfd8e3] px-3 py-2 text-sm font-medium text-[#2d3745] transition hover:bg-[#f8fafc] md:px-4"
          href="/dashboard/lender"
        >
          Back
        </Link>
      </div>

      <DailyCollectionsTable
        collectors={collectors}
        initialPage={{ items: payments, pageInfo }}
        key={selectedDate}
        selectedDate={selectedDate}
      />
    </div>
  );
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
