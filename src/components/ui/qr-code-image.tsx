export function QrCodeImage({ src }: { src: string }) {
  if (!src) {
    return (
      <div className="flex h-16 w-16 items-center justify-center rounded-md border border-[#dfe5ec] bg-[#f8fafc] text-xs text-[#657386]">
        No QR
      </div>
    );
  }

  return (
    // QR codes are generated data URLs from the backend service.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt="Loan QR code"
      className="h-16 w-16 rounded-md border border-[#dfe5ec] bg-white p-1"
      src={src}
    />
  );
}
