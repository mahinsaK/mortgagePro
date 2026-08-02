"use client";

import { Download, LoaderCircle, Printer, Share2 } from "lucide-react";
import { useEffect, useState } from "react";

export function LoanQrPanel({ loanId }: { loanId: string }) {
  const qrUrl = `/api/loans/${encodeURIComponent(loanId)}/qr`;
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [isPreparing, setIsPreparing] = useState(true);
  const [activeAction, setActiveAction] = useState<"print" | "share" | null>(
    null,
  );
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function prepareQrFile() {
      try {
        const response = await fetch(`${qrUrl}?display=1`, {
          credentials: "same-origin",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("QR request failed");
        }

        const blob = await response.blob();
        setQrFile(
          new File([blob], "loan-qr-code.png", {
            type: blob.type || "image/png",
          }),
        );
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setFeedback(
            "The QR code could not be prepared. Download it and try again.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsPreparing(false);
        }
      }
    }

    void prepareQrFile();

    return () => controller.abort();
  }, [qrUrl]);

  async function shareQrCode() {
    if (!qrFile) {
      return;
    }

    setActiveAction("share");
    setFeedback("");

    try {
      const shareData = {
        files: [qrFile],
        text: "Loan payment QR code",
        title: "Loan QR code",
      };
      const canShareFile =
        typeof navigator.share === "function" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [qrFile] });

      if (canShareFile) {
        await navigator.share(shareData);
        setFeedback("QR code shared.");
      } else {
        downloadQrFile(qrFile);
        setFeedback(
          "This browser cannot open a share menu. The QR code was downloaded so you can attach it in WhatsApp or another app.",
        );
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setFeedback("The QR code could not be shared. Please try again.");
      }
    } finally {
      setActiveAction(null);
    }
  }

  function printQrCode() {
    if (!qrFile) {
      return;
    }

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      setFeedback("Allow pop-ups to print this QR code.");
      return;
    }

    setActiveAction("print");
    setFeedback("");
    printWindow.opener = null;

    const objectUrl = URL.createObjectURL(qrFile);
    const cleanup = () => URL.revokeObjectURL(objectUrl);
    const style = printWindow.document.createElement("style");
    style.textContent = `
      @page { margin: 18mm; }
      body {
        align-items: center;
        color: #15191f;
        display: flex;
        flex-direction: column;
        font-family: Arial, sans-serif;
        justify-content: center;
        margin: 0;
        min-height: 90vh;
        text-align: center;
      }
      h1 { font-size: 22px; margin: 0 0 20px; }
      img { height: 320px; image-rendering: pixelated; width: 320px; }
      p { color: #475569; font-size: 13px; margin: 18px 0 0; }
    `;
    const heading = printWindow.document.createElement("h1");
    heading.textContent = "Loan payment QR code";
    const image = printWindow.document.createElement("img");
    image.alt = "Loan payment QR code";
    image.src = objectUrl;
    const instruction = printWindow.document.createElement("p");
    instruction.textContent = "Scan this code to record a payment.";

    printWindow.document.title = "Loan QR code";
    printWindow.document.head.append(style);
    printWindow.document.body.replaceChildren(heading, image, instruction);
    printWindow.addEventListener(
      "afterprint",
      () => {
        cleanup();
        printWindow.close();
      },
      { once: true },
    );

    image.addEventListener(
      "load",
      () => {
        setActiveAction(null);
        setFeedback("Print dialog opened.");
        printWindow.focus();
        printWindow.print();
      },
      { once: true },
    );
    image.addEventListener(
      "error",
      () => {
        cleanup();
        printWindow.close();
        setActiveAction(null);
        setFeedback("The QR code could not be printed. Please try again.");
      },
      { once: true },
    );
  }

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
        <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
          <a
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#cfd8e3] bg-white px-3 text-xs font-semibold text-[#1d4ed8] transition hover:bg-[#eef4ff]"
            download="loan-qr-code.png"
            href={qrUrl}
          >
            <Download aria-hidden="true" size={15} />
            Download QR
          </a>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#cfd8e3] bg-white px-3 text-xs font-semibold text-[#1d4ed8] transition hover:bg-[#eef4ff] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!qrFile || activeAction !== null}
            onClick={() => void shareQrCode()}
            type="button"
          >
            {activeAction === "share" || isPreparing ? (
              <LoaderCircle className="animate-spin" aria-hidden="true" size={15} />
            ) : (
              <Share2 aria-hidden="true" size={15} />
            )}
            {isPreparing ? "Preparing" : "Share QR"}
          </button>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#cfd8e3] bg-white px-3 text-xs font-semibold text-[#1d4ed8] transition hover:bg-[#eef4ff] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!qrFile || activeAction !== null}
            onClick={printQrCode}
            type="button"
          >
            {activeAction === "print" ? (
              <LoaderCircle className="animate-spin" aria-hidden="true" size={15} />
            ) : (
              <Printer aria-hidden="true" size={15} />
            )}
            Print QR
          </button>
        </div>
        {feedback ? (
          <p aria-live="polite" className="mt-3 text-xs leading-5 text-[#526173]">
            {feedback}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function downloadQrFile(file: File) {
  const objectUrl = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.download = file.name;
  anchor.href = objectUrl;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}
