import { MessageSquareText, Send } from "lucide-react";
import { sendManualSmsAction } from "@/backend/actions/sms-actions";

export const dynamic = "force-dynamic";

export default async function SmsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; phone?: string; message?: string }>;
}) {
  const { status, phone, message } = await searchParams;

  return (
    <div>
      <div className="mb-8">
        <p className="text-sm font-medium text-[#657386]">SMS</p>
        <h1 className="mt-2 text-3xl font-semibold">Send message</h1>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-lg border border-[#dfe5ec] bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#e0ecff] text-[#1d4ed8]">
              <MessageSquareText aria-hidden="true" size={20} />
            </div>
            <div>
              <p className="text-sm font-medium text-[#657386]">Manual SMS</p>
              <h2 className="mt-1 text-lg font-semibold">Customer message</h2>
            </div>
          </div>

          {status === "sent" ? (
            <div className="mb-5 rounded-md border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-sm font-medium text-[#166534]">
              SMS queued for {phone || "customer"}.
            </div>
          ) : null}
          {status === "error" ? (
            <div className="mb-5 rounded-md border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm font-medium text-[#991b1b]">
              {message || "SMS could not be queued."}
            </div>
          ) : null}

          <form action={sendManualSmsAction} className="grid gap-4">
            <label className="text-sm font-medium text-[#2d3745]">
              Phone number
              <input
                className="mt-2 h-11 w-full rounded-md border border-[#cfd8e3] px-3 text-sm outline-none transition focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#dbeafe]"
                name="phone_number"
                placeholder="+94 77 123 4567"
                required
                type="tel"
              />
            </label>

            <label className="text-sm font-medium text-[#2d3745]">
              Message
              <textarea
                className="mt-2 min-h-40 w-full resize-y rounded-md border border-[#cfd8e3] px-3 py-3 text-sm outline-none transition focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#dbeafe]"
                maxLength={480}
                name="message"
                placeholder="Type the customer message"
                required
              />
            </label>

            <div className="flex justify-end">
              <button
                className="inline-flex h-11 items-center gap-2 rounded-md bg-[#15191f] px-5 text-sm font-semibold text-white transition hover:bg-[#2d3745]"
                type="submit"
              >
                <Send aria-hidden="true" size={17} />
                Send SMS
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-lg border border-[#dfe5ec] bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-[#657386]">Templates</p>
          <div className="mt-4 space-y-3">
            <TemplateCard title="Loan welcome" />
            <TemplateCard title="Loan completed" />
            <TemplateCard title="Manual message" />
          </div>
        </section>
      </div>
    </div>
  );
}

function TemplateCard({ title }: { title: string }) {
  return (
    <article className="rounded-md border border-[#eef2f6] bg-[#f8fafc] p-3">
      <h3 className="text-sm font-semibold text-[#15191f]">{title}</h3>
    </article>
  );
}
