"use client";

import { Download, LoaderCircle } from "lucide-react";
import { useState } from "react";
import {
  downloadLoanQrBlob,
  fetchLoanQrPng,
  getLoanQrDataUrl,
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
      const dataUrl = await getLoanQrDataUrl(loanId);
      downloadLoanQrBlob(await fetchLoanQrPng(dataUrl));
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
          ? "The QR image could not be prepared. Try again."
          : "Download QR"
      }
      type="button"
    >
      {status === "downloading" ? (
        <LoaderCircle aria-hidden="true" className="animate-spin" size={14} />
      ) : (
        <Download aria-hidden="true" size={14} />
      )}
      {buttonLabel}
    </button>
  );
}
