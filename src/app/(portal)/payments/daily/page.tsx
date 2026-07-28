import Link from "next/link";
import { getDailyCollectionsData } from "@/backend/services/lending-service";
import { DailyCollectionsTable } from "@/frontend/components/payments/daily-collections-table";

export const dynamic = "force-dynamic";

export default async function DailyCollectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const selectedDate = date || toDateInputValue(new Date());
  const { payments } = await getDailyCollectionsData(selectedDate);

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

      <section className="mb-5 rounded-lg border border-[#dfe5ec] bg-white p-4 shadow-sm md:mb-6 md:p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <form className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-end gap-2 sm:flex sm:w-auto sm:gap-3">
            <label className="min-w-0 text-sm font-medium text-[#2d3745]">
              <span className="sr-only">Collection date</span>
              <input
                className="h-10 w-full min-w-0 rounded-md border border-[#cfd8e3] px-3 text-sm outline-none transition focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#dbeafe]"
                defaultValue={selectedDate}
                name="date"
                type="date"
              />
            </label>
            <button
              className="h-10 rounded-md bg-[#15191f] px-4 text-sm font-semibold text-white transition hover:bg-[#2d3745]"
              type="submit"
            >
              View day
            </button>
          </form>
        </div>
      </section>

      <DailyCollectionsTable payments={payments} selectedDate={selectedDate} />
    </div>
  );
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
