import Link from "next/link";
import { Construction } from "lucide-react";

export function FeatureMaintenanceCover({
  description,
  label,
  title,
}: {
  description: string;
  label: string;
  title: string;
}) {
  return (
    <div>
      <div className="mb-6 md:mb-8">
        <p className="text-sm font-medium text-[#657386]">{label}</p>
        <h1 className="mt-1 text-2xl font-semibold md:mt-2 md:text-3xl">
          Service unavailable
        </h1>
      </div>

      <section
        aria-labelledby="maintenance-title"
        className="relative min-h-[min(620px,70dvh)] overflow-hidden rounded-xl border border-[#dfe5ec] bg-white shadow-sm"
      >
        <MaintenancePreview />
        <div className="absolute inset-0 flex items-center justify-center bg-white/65 p-5 backdrop-blur-[6px]">
          <div className="w-full max-w-md rounded-xl border border-[#dfe5ec] bg-white p-6 text-center shadow-xl sm:p-8">
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#fff7ed] text-[#c2410c]">
              <Construction aria-hidden="true" size={23} />
            </span>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-[#c2410c]">
              Under maintenance
            </p>
            <h2
              className="mt-2 text-2xl font-semibold text-[#15191f]"
              id="maintenance-title"
            >
              {title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#657386]">
              {description}
            </p>
            <Link
              className="mt-6 inline-flex h-11 items-center justify-center rounded-md bg-[#15191f] px-5 text-sm font-semibold text-white transition hover:bg-[#2d3745]"
              href="/dashboard/lender"
            >
              Return to dashboard
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function MaintenancePreview() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none grid gap-5 p-5 opacity-40 blur-[2px] md:grid-cols-[minmax(0,1.4fr)_minmax(240px,0.6fr)] md:p-7"
    >
      <div className="space-y-5">
        <div className="rounded-lg border border-[#dfe5ec] p-5">
          <div className="h-4 w-32 rounded bg-[#cfd8e3]" />
          <div className="mt-5 h-11 rounded-md bg-[#eef2f6]" />
          <div className="mt-3 h-28 rounded-md bg-[#eef2f6]" />
          <div className="mt-4 ml-auto h-10 w-32 rounded-md bg-[#aeb8c5]" />
        </div>
        <div className="rounded-lg border border-[#dfe5ec] p-5">
          <div className="h-4 w-40 rounded bg-[#cfd8e3]" />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="h-20 rounded-md bg-[#eef2f6]" />
            <div className="h-20 rounded-md bg-[#eef2f6]" />
          </div>
        </div>
      </div>
      <div className="space-y-5">
        <div className="h-36 rounded-lg border border-[#dfe5ec] bg-[#f8fafc]" />
        <div className="h-52 rounded-lg border border-[#dfe5ec] bg-[#f8fafc]" />
      </div>
    </div>
  );
}
