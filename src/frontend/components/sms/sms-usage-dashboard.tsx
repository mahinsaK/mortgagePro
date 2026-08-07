import type {
  SmsBatchSummary,
  SmsUsageSummary,
} from "@/backend/services/sms-sending-service";

export type SmsReportingData = {
  current: SmsUsageSummary;
  months: SmsUsageSummary[];
  latestBatches: SmsBatchSummary[];
};

export function SmsUsageDashboard({ data }: { data: SmsReportingData }) {
  return (
    <div className="grid gap-6">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Metric label="Monthly quota" value={data.current.quota} />
        <Metric label="Used units" value={data.current.sentUnits} />
        <Metric label="Reserved units" value={data.current.reservedUnits} />
        <Metric label="Remaining units" value={data.current.remainingUnits} />
        <Metric label="Successful recipients" value={data.current.sentRecipients} />
        <Metric label="Failed recipients" value={data.current.failedRecipients} />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="overflow-hidden rounded-lg border border-[#dfe5ec] bg-white shadow-sm">
          <div className="border-b border-[#e7ebf0] px-4 py-4 md:px-5">
            <h2 className="text-lg font-semibold text-[#15191f]">
              Recent SMS batches
            </h2>
            <p className="mt-1 text-sm text-[#657386]">
              Summary only—phone numbers and message text are not stored.
            </p>
          </div>
          <div className="divide-y divide-[#e7ebf0]">
            {data.latestBatches.map((batch) => (
              <article className="px-4 py-3 md:px-5" key={batch.id}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[#15191f]">
                      {batch.senderId} · {batch.sentRecipients} sent
                    </p>
                    <p className="mt-1 text-xs text-[#657386]">
                      {formatSmsTimestamp(batch.createdAt)} · {batch.usedUnits} units
                      · {batch.failedRecipients} failed
                    </p>
                  </div>
                  <span className={batchStatusClass(batch.status)}>
                    {batchStatusLabel(batch.status)}
                  </span>
                </div>
              </article>
            ))}
            {data.latestBatches.length === 0 ? (
              <p className="px-4 py-6 text-sm text-[#657386] md:px-5">
                No SMS batches have been recorded yet.
              </p>
            ) : null}
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-[#dfe5ec] bg-white shadow-sm">
          <div className="border-b border-[#e7ebf0] px-4 py-4 md:px-5">
            <h2 className="text-lg font-semibold text-[#15191f]">
              12-month usage
            </h2>
            <p className="mt-1 text-sm text-[#657386]">
              Successful and failed recipients by Asia/Colombo month.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#f8fafc] text-xs uppercase tracking-wide text-[#657386]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Month</th>
                  <th className="px-4 py-3 font-semibold">Batches</th>
                  <th className="px-4 py-3 font-semibold">Sent</th>
                  <th className="px-4 py-3 font-semibold">Failed</th>
                  <th className="px-4 py-3 font-semibold">Units</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e7ebf0]">
                {data.months.map((month) => (
                  <tr key={month.month}>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-[#2d3745]">
                      {formatMonth(month.month)}
                    </td>
                    <td className="px-4 py-3 text-[#657386]">{month.batchCount}</td>
                    <td className="px-4 py-3 text-[#657386]">
                      {month.sentRecipients}
                    </td>
                    <td className="px-4 py-3 text-[#657386]">
                      {month.failedRecipients}
                    </td>
                    <td className="px-4 py-3 text-[#657386]">{month.sentUnits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-lg border border-[#dfe5ec] bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-[#657386]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[#15191f]">
        {value.toLocaleString("en-US")}
      </p>
    </article>
  );
}

function formatMonth(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    timeZone: "Asia/Colombo",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 15)));
}

function formatSmsTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Colombo",
  }).format(date);
}

function batchStatusLabel(status: SmsBatchSummary["status"]) {
  return status.replaceAll("_", " ");
}

function batchStatusClass(status: SmsBatchSummary["status"]) {
  const base = "rounded-full px-2.5 py-1 text-xs font-semibold capitalize";
  if (status === "sent") return `${base} bg-[#dcfce7] text-[#166534]`;
  if (status === "failed" || status === "review_required") {
    return `${base} bg-[#fee2e2] text-[#991b1b]`;
  }
  if (status === "partial") return `${base} bg-[#ffedd5] text-[#9a3412]`;
  return `${base} bg-[#e0ecff] text-[#1d4ed8]`;
}
