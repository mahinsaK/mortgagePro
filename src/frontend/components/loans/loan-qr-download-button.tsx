"use client";

import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import {
  downloadLoanQrBlob,
  fetchLoanQrPng,
} from "@/frontend/lib/loan-qr-file";

export function LoanQrDownloadButton({
  className,
  label = "Download QR",
  loanId,
}: {
  className: string;
  label?: string;
  loanId: string;
}) {
  const [status, setStatus] = useState<"idle" | "downloading" | "error">(
    "idle",
  );

  async function downloadQrCode() {
    setStatus("downloading");

    try {
      const qrUrl = `/api/loans/${encodeURIComponent(loanId)}/qr?display=1`;
      const blob = await fetchLoanQrPng(qrUrl);
      downloadLoanQrBlob(blob);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  const buttonLabel =
    status === "downloading"
      ? "Downloading..."
      : status === "error"
        ? "Retry download"
        : label;

  return (
    <button
      aria-label={buttonLabel}
      className={className}
      disabled={status === "downloading"}
      onClick={(event) => {
        event.stopPropagation();
        void downloadQrCode();
      }}
      title={
        status === "error"
          ? "The QR image could not be downloaded. Try again."
          : undefined
      }
      type="button"
    >
      {status === "downloading" ? (
        <LoaderCircle className="animate-spin" aria-hidden="true" size={14} />
      ) : null}
      {buttonLabel}
    </button>
  );
}
