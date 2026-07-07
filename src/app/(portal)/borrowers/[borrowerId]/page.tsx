import Link from "next/link";
import { notFound } from "next/navigation";
import { getBorrowerProfileData } from "@/backend/services/lending-service";
import { CreateLoanForm } from "@/frontend/components/loans/create-loan-form";
import { QrCodeImage } from "@/frontend/components/ui/qr-code-image";

export const dynamic = "force-dynamic";

export default async function BorrowerProfilePage({
  params,
}: {
  params: Promise<{ borrowerId: string }>;
}) {
  const { borrowerId } = await params;
  const { borrower, loans } = await getBorrowerProfileData(borrowerId);

  if (!borrower) {
    notFound();
  }

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#657386]">Borrower profile</p>
          <h1 className="mt-2 text-3xl font-semibold">{borrower.name}</h1>
          <p className="mt-2 text-sm text-[#657386]">
            {borrower.businessName || "No business name"} / {borrower.contactInfo}
          </p>
        </div>
        <Link
          className="rounded-md border border-[#cfd8e3] px-4 py-2 text-sm font-medium text-[#2d3745] transition hover:bg-[#f8fafc]"
          href="/borrowers"
        >
          Back
        </Link>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <SummaryCard label="Total loans" value={String(borrower.loanCount)} />
        <SummaryCard
          label="Active loans"
          value={String(borrower.activeLoanCount)}
        />
        <SummaryCard label="Status" value={borrower.status} />
      </div>

      <CreateLoanForm borrowerId={borrower.id} />

      <section>
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Loans</h2>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {loans.map((loan) => (
            <article
              className="rounded-lg border border-[#dfe5ec] bg-white p-5 shadow-sm"
              key={loan.id}
            >
              <div className="flex gap-5">
                <div className="shrink-0">
                  <QrCodeImage src={loan.qrCode} />
                  {loan.qrCode ? (
                    <a
                      className="mt-2 block text-center text-xs font-semibold text-[#1d4ed8] hover:underline"
                      download={`${loan.id}-qr.png`}
                      href={loan.qrCode}
                    >
                      Download
                    </a>
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-[#657386]">
                        {loan.id}
                      </p>
                      <h3 className="mt-1 text-xl font-semibold">
                        {loan.amount}
                      </h3>
                    </div>
                    <span className="rounded-full bg-[#e0ecff] px-3 py-1 text-xs font-semibold text-[#1d4ed8]">
                      {loan.status}
                    </span>
                  </div>

                  <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                    <Detail label="Daily payment" value={loan.dailyPayment} />
                    <Detail label="Interest" value={loan.interestRate} />
                    <Detail label="Start date" value={loan.startDate} />
                    <Detail label="End date" value={loan.endDate} />
                  </dl>
                </div>
              </div>
            </article>
          ))}
          {loans.length === 0 ? (
            <div className="rounded-lg border border-[#dfe5ec] bg-white p-6 text-sm text-[#657386] shadow-sm">
              No loans found for this borrower.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-[#dfe5ec] bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-[#657386]">{label}</p>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
    </article>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[#657386]">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-[#15191f]">{value}</dd>
    </div>
  );
}
