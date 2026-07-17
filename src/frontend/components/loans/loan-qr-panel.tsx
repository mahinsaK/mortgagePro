export function LoanQrPanel({ loanId }: { loanId: string }) {
  const qrUrl = `/api/loans/${encodeURIComponent(loanId)}/qr`;

  return (
    <section className="mt-5 flex flex-col items-center gap-4 rounded-lg border border-[#dfe5ec] bg-[#f8fafc] p-5 sm:flex-row sm:items-center">
      <div className="shrink-0 rounded-lg border border-[#dfe5ec] bg-white p-2 shadow-sm">
        {/* The authenticated QR route must load directly in the browser. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt="QR code for this loan"
          className="size-44"
          height={176}
          src={`${qrUrl}?display=1`}
          width={176}
        />
      </div>

      <div className="text-center sm:text-left">
        <h3 className="text-base font-semibold text-[#15191f]">Loan QR code</h3>
        <p className="mt-1 text-sm leading-5 text-[#657386]">
          Scan this code to identify the correct loan when collecting a payment.
        </p>
        <a
          className="mt-3 inline-flex h-10 items-center justify-center rounded-md border border-[#cfd8e3] bg-white px-3 text-xs font-semibold text-[#1d4ed8] transition hover:bg-[#eef4ff]"
          download="loan-qr-code.png"
          href={qrUrl}
        >
          Download QR
        </a>
      </div>
    </section>
  );
}
