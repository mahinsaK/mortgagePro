"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Download, Eye, LoaderCircle, X } from "lucide-react";
import { useState } from "react";
import {
  downloadLoanQrBlob,
  fetchLoanQrPng,
  getLoanQrDataUrl,
} from "@/frontend/lib/loan-qr-file";

export function LoanQrTableActions({ loanId }: { loanId: string }) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "preparing" | "downloading" | "error"
  >("idle");

  async function prepareQrCode() {
    if (qrDataUrl) {
      return qrDataUrl;
    }

    setStatus("preparing");

    try {
      const dataUrl = await getLoanQrDataUrl(loanId);
      setQrDataUrl(dataUrl);
      setStatus("idle");
      return dataUrl;
    } catch {
      setStatus("error");
      return "";
    }
  }

  async function downloadQrCode() {
    setStatus("downloading");

    try {
      const dataUrl = qrDataUrl || (await getLoanQrDataUrl(loanId));
      setQrDataUrl(dataUrl);
      downloadLoanQrBlob(await fetchLoanQrPng(dataUrl));
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  const isBusy = status === "preparing" || status === "downloading";

  return (
    <Dialog.Root
      open={isPreviewOpen}
      onOpenChange={(open) => {
        setIsPreviewOpen(open);
        if (open) {
          void prepareQrCode();
        }
      }}
    >
      <div
        className="flex items-center gap-1"
        onMouseEnter={() => void prepareQrCode()}
      >
        <Dialog.Trigger asChild>
          <button
            aria-label="Preview QR"
            className="flex size-11 shrink-0 items-center justify-center rounded-md border border-[#cfd8e3] text-[#1d4ed8] transition hover:bg-[#eef4ff] md:size-9"
            onClick={(event) => event.stopPropagation()}
            onFocus={() => void prepareQrCode()}
            title="Preview QR"
            type="button"
          >
            <Eye aria-hidden="true" size={15} />
          </button>
        </Dialog.Trigger>
        <button
          aria-label="Download QR"
          className="flex size-11 shrink-0 items-center justify-center rounded-md border border-[#cfd8e3] text-[#1d4ed8] transition hover:bg-[#eef4ff] disabled:cursor-not-allowed disabled:opacity-60 md:size-9"
          disabled={isBusy}
          onClick={(event) => {
            event.stopPropagation();
            void downloadQrCode();
          }}
          onFocus={() => void prepareQrCode()}
          title={status === "error" ? "Retry QR download" : "Download QR"}
          type="button"
        >
          {isBusy ? (
            <LoaderCircle aria-hidden="true" className="animate-spin" size={15} />
          ) : (
            <Download aria-hidden="true" size={15} />
          )}
        </button>
      </div>

      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-50 bg-black/45"
          onClick={(event) => event.stopPropagation()}
        />
        <Dialog.Content
          className="fixed z-[60] w-[min(360px,calc(100vw-32px))] rounded-xl border border-[#dfe5ec] bg-white p-4 text-[#15191f] shadow-2xl outline-none"
          onClick={(event) => event.stopPropagation()}
          style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <Dialog.Title className="text-base font-semibold">
              Loan QR code
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              Preview the QR code used to identify this loan.
            </Dialog.Description>
            <Dialog.Close asChild>
              <button
                aria-label="Close QR preview"
                className="flex size-11 items-center justify-center rounded-md border border-[#dfe5ec] text-[#657386] transition hover:bg-[#f8fafc] sm:size-10"
                type="button"
              >
                <X aria-hidden="true" size={17} />
              </button>
            </Dialog.Close>
          </div>
          <div className="flex aspect-square w-full items-center justify-center rounded-lg bg-[#f8fafc] p-3">
            {qrDataUrl ? (
              // The QR data URL is generated locally from the authorized loan row.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt="QR code for this loan"
                className="size-full rounded-md bg-white object-contain"
                height={320}
                src={qrDataUrl}
                width={320}
              />
            ) : status === "error" ? (
              <button
                className="text-sm font-semibold text-[#b91c1c]"
                onClick={() => void prepareQrCode()}
                type="button"
              >
                QR preview failed. Try again
              </button>
            ) : (
              <LoaderCircle
                aria-label="Preparing QR preview"
                className="animate-spin text-[#1d4ed8]"
                size={28}
              />
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
