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
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#657386]">
            Daily collections
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Payments by day</h1>
        </div>
        <Link
          className="rounded-md border border-[#cfd8e3] px-4 py-2 text-sm font-medium text-[#2d3745] transition hover:bg-[#f8fafc]"
          href="/dashboard/lender"
        >
          Back
        </Link>
      </div>

      <section className="mb-6 rounded-lg border border-[#dfe5ec] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <form className="flex flex-wrap items-end gap-3">
            <label className="text-sm font-medium text-[#2d3745]">
              <span className="sr-only">Collection date</span>
              <input
                className="h-10 rounded-md border border-[#cfd8e3] px-3 text-sm outline-none transition focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#dbeafe]"
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
