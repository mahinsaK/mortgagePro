import type {
  SmsBatchSummary,
  SmsUsageSummary,
} from "@/backend/services/sms-sending-service";
import { LocalTimestamp } from "@/frontend/components/ui/local-timestamp";

export type SmsReportingData = {
  current: SmsUsageSummary;
  months: SmsUsageSummary[];
  latestBatches: SmsBatchSummary[];
};

export function SmsUsageDashboard({ data }: { data: SmsReportingData }) {
  return (
    <section className="w-full max-w-5xl rounded-lg border border-[#dfe5ec] bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#657386]">
            SMS usage
          </p>
          <h2 className="mt-1 text-base font-semibold text-[#15191f]">
            Current month
          </h2>
        </div>
        <p className="text-sm font-semibold text-[#1d4ed8]">
          {data.current.remainingUnits.toLocaleString("en-US")} units remaining
        </p>
      </div>
        <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <Metric label="Monthly quota" value={data.current.quota} />
          <Metric label="Used units" value={data.current.sentUnits} />
          <Metric label="Reserved units" value={data.current.reservedUnits} />
          <Metric label="Remaining units" value={data.current.remainingUnits} />
          <Metric label="Successful recipients" value={data.current.sentRecipients} />
          <Metric label="Failed recipients" value={data.current.failedRecipients} />
        </div>

      <details className="group mt-3 border-t border-[#e7ebf0] pt-1">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3 text-sm font-semibold text-[#1d4ed8] marker:hidden">
          <span className="group-open:hidden">View 12-month report</span>
          <span className="hidden group-open:inline">Hide 12-month report</span>
          <span aria-hidden="true" className="text-lg transition group-open:rotate-180">
            ↓
          </span>
        </summary>
        <section className="overflow-hidden rounded-md border border-[#e7ebf0]">
          <div className="px-3 py-3">
            <h3 className="text-lg font-semibold text-[#15191f]">
              12-month usage
            </h3>
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
      </details>
    </section>
  );
}

export function SmsRecentBatches({ batches }: { batches: SmsBatchSummary[] }) {
  return (
    <details className="group overflow-hidden rounded-lg border border-[#dfe5ec] bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 marker:hidden">
        <div>
          <h2 className="text-base font-semibold text-[#15191f]">
            Recent SMS batches
          </h2>
          <p className="mt-1 text-xs text-[#657386]">
            {batches.length} recent batch{batches.length === 1 ? "" : "es"} · no
            phone numbers or message text stored
          </p>
        </div>
        <span className="text-sm font-semibold text-[#1d4ed8] group-open:hidden">
          View
        </span>
        <span className="hidden text-sm font-semibold text-[#1d4ed8] group-open:inline">
          Hide
        </span>
      </summary>
      <div className="divide-y divide-[#e7ebf0] border-t border-[#e7ebf0]">
        {batches.map((batch) => (
          <article className="px-4 py-3 md:px-5" key={batch.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-[#15191f]">
                  {batchPurposeLabel(batch.purpose)} · {batch.sentRecipients} sent
                </p>
                <p className="mt-1 text-xs text-[#657386]">
                  {batch.senderId} ·{" "}
                  <LocalTimestamp
                    timeZone="Asia/Colombo"
                    value={batch.createdAt}
                  />{" "}
                  · {batch.usedUnits} units · {batch.failedRecipients} failed
                </p>
              </div>
              <span className={batchStatusClass(batch.status)}>
                {batchStatusLabel(batch.status)}
              </span>
            </div>
          </article>
        ))}
        {batches.length === 0 ? (
          <p className="px-4 py-6 text-sm text-[#657386] md:px-5">
            No SMS batches have been recorded yet.
          </p>
        ) : null}
      </div>
    </details>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-md bg-[#f8fafc] px-3 py-2.5">
      <p className="text-xs font-medium text-[#657386]">{label}</p>
      <p className="mt-1 text-lg font-semibold text-[#15191f]">
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

function batchStatusLabel(status: SmsBatchSummary["status"]) {
  return status.replaceAll("_", " ");
}

function batchPurposeLabel(purpose: string) {
  if (purpose === "payment_receipt") return "Automatic payment receipt";
  if (purpose === "loan_welcome") return "Loan welcome";
  if (purpose === "loan_completed") return "Loan completed";
  return "Manual message";
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
