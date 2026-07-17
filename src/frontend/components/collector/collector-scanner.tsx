"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import QrScanner from "qr-scanner";
import { useEffect, useRef, useState } from "react";

type LoanPreview = {
  id: string;
  borrowerName: string;
  amount: number;
  totalPaid: number;
  remainingAmount: number;
  dailyPayment: number;
  status: string;
};

type CollectorScannerProps = {
  collectAction: (formData: FormData) => void | Promise<void>;
  message?: string;
  status?: string;
};

export function CollectorScanner({
  collectAction,
  message,
  status,
}: CollectorScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const isMountedRef = useRef(true);
  const [cameraMessage, setCameraMessage] = useState("");
  const [loan, setLoan] = useState<LoanPreview | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentRequestId, setPaymentRequestId] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      scannerRef.current?.destroy();
      scannerRef.current = null;
    };
  }, []);

  function stopScanning() {
    scannerRef.current?.destroy();
    scannerRef.current = null;
    setIsScanning(false);
  }

  async function startScanning() {
    if (!videoRef.current || isLookingUp) {
      return;
    }

    stopScanning();
    setCameraMessage("");
    setLookupError("");
    setLoan(null);
    setPaymentAmount("");
    setPaymentRequestId("");
    setIsScanning(true);

    const scanner = new QrScanner(
      videoRef.current,
      (scanResult) => {
        const scannedLoanId = scanResult.data.trim();

        if (!scannedLoanId || scannerRef.current !== scanner) {
          return;
        }

        stopScanning();
        void lookupLoan(scannedLoanId);
      },
      {
        highlightCodeOutline: true,
        highlightScanRegion: true,
        maxScansPerSecond: 10,
        preferredCamera: "environment",
        returnDetailedScanResult: true,
      },
    );

    scannerRef.current = scanner;

    try {
      await scanner.start();
    } catch (error) {
      if (scannerRef.current !== scanner) {
        return;
      }

      scanner.destroy();
      scannerRef.current = null;

      if (isMountedRef.current) {
        setIsScanning(false);
        setCameraMessage(cameraErrorMessage(error));
      }
    }
  }

  async function lookupLoan(value: string) {
    const requestedLoanId = value.trim();

    if (!requestedLoanId) {
      setLookupError("The scanned QR code is empty.");
      return;
    }

    stopScanning();
    setIsLookingUp(true);
    setLookupError("");
    setLoan(null);

    try {
      const response = await fetch(
        `/api/collector/loan?loanId=${encodeURIComponent(requestedLoanId)}`,
      );
      const data = (await response.json()) as {
        error?: string;
        loan?: LoanPreview;
      };

      if (!response.ok || !data.loan) {
        throw new Error(data.error ?? "Could not validate this QR code.");
      }

      setLoan(data.loan);
      setPaymentAmount("");
      setPaymentRequestId(crypto.randomUUID());
    } catch (error) {
      setLookupError(
        error instanceof Error ? error.message : "Could not validate this QR code.",
      );
    } finally {
      setIsLookingUp(false);
    }
  }

  return (
    <section className="rounded-lg border border-[#d9e0e8] bg-white p-4 shadow-sm">
      <StatusMessage message={lookupError || message} status={lookupError ? "error" : status} />

      <div className="relative mt-4 overflow-hidden rounded-md bg-black">
        <video
          aria-label="QR code camera preview"
          className="aspect-[3/4] w-full object-cover"
          muted
          playsInline
          ref={videoRef}
        />
      </div>
      {cameraMessage ? (
        <p className="mt-3 rounded-md bg-[#f8fafc] px-3 py-2 text-sm text-[#657386]">
          {cameraMessage}
        </p>
      ) : null}

      <button
        className={`mt-4 h-11 w-full rounded-md px-4 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-[#9aa6b2] ${
          isScanning
            ? "bg-[#b91c1c] hover:bg-[#991b1b]"
            : "bg-[#2563eb] hover:bg-[#1d4ed8]"
        }`}
        disabled={isLookingUp}
        onClick={isScanning ? stopScanning : () => void startScanning()}
        type="button"
      >
        {isLookingUp
          ? "Checking scanned QR..."
          : isScanning
            ? "Stop scanning"
            : "Start scanning"}
      </button>

      <Dialog.Root
        onOpenChange={(open) => {
          if (!open) {
            setLoan(null);
            setPaymentAmount("");
            setPaymentRequestId("");
          }
        }}
        open={loan !== null}
      >
        {loan ? (
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45" />
            <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100vh-32px)] w-[min(560px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-[#dfe5ec] bg-white text-[#15191f] shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-[#dfe5ec] px-5 py-4">
                <div>
                  <Dialog.Title className="text-xl font-semibold">
                    Payment details
                  </Dialog.Title>
                  <Dialog.Description className="mt-1 text-sm text-[#657386]">
                    Confirm the loan and enter the amount being collected.
                  </Dialog.Description>
                </div>
                <Dialog.Close asChild>
                  <button
                    aria-label="Close payment details"
                    className="flex size-9 shrink-0 items-center justify-center rounded-md border border-[#dfe5ec] text-[#657386] transition hover:bg-[#f8fafc]"
                    type="button"
                  >
                    <X aria-hidden="true" size={17} />
                  </button>
                </Dialog.Close>
              </div>

              <form action={collectAction} className="p-5">
                <input name="loan_id" type="hidden" value={loan.id} />
                <input
                  name="payment_request_id"
                  type="hidden"
                  value={paymentRequestId}
                />
                <dl className="grid gap-4 rounded-lg bg-[#f8fafc] p-4 sm:grid-cols-2">
                  <Detail label="Borrower" value={loan.borrowerName} />
                  <Detail label="Status" value={loan.status} />
                  <Detail label="Loan amount" value={formatMoney(loan.amount)} />
                  <Detail label="Total paid" value={formatMoney(loan.totalPaid)} />
                  <Detail label="Remaining" value={formatMoney(loan.remainingAmount)} />
                  <Detail label="Daily payment" value={formatMoney(loan.dailyPayment)} />
                </dl>

                <label className="mt-5 block text-sm font-medium text-[#2d3745]">
                  Payment amount
                  <input
                    className="mt-2 h-11 w-full rounded-md border border-[#cfd8e3] px-3 text-base outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#dbeafe]"
                    max={loan.remainingAmount}
                    min="0.01"
                    name="amount"
                    onChange={(event) => setPaymentAmount(event.target.value)}
                    placeholder="Enter a custom amount"
                    required
                    step="0.01"
                    type="number"
                    value={paymentAmount}
                  />
                </label>

                <button
                  className="mt-3 h-11 w-full rounded-md border border-[#93c5fd] bg-[#eff6ff] px-4 text-sm font-semibold text-[#1d4ed8] transition hover:bg-[#dbeafe] disabled:cursor-not-allowed disabled:border-[#dfe5ec] disabled:bg-[#f8fafc] disabled:text-[#9aa6b2]"
                  disabled={loan.dailyPayment <= 0 || loan.remainingAmount <= 0}
                  onClick={() =>
                    setPaymentAmount(
                      String(Math.min(loan.dailyPayment, loan.remainingAmount)),
                    )
                  }
                  type="button"
                >
                  Use scheduled amount ·{" "}
                  {formatMoney(Math.min(loan.dailyPayment, loan.remainingAmount))}
                </button>

                <button
                  className="mt-4 h-11 w-full rounded-md bg-[#2563eb] px-4 text-sm font-semibold text-white transition hover:bg-[#1d4ed8]"
                  disabled={!paymentRequestId}
                  type="submit"
                >
                  Collect payment
                </button>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        ) : null}
      </Dialog.Root>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-[#657386]">{label}</dt>
      <dd className="mt-1 font-medium text-[#15191f]">{value}</dd>
    </div>
  );
}

function StatusMessage({
  message,
  status,
}: {
  message?: string;
  status?: string;
}) {
  if (!message) {
    return null;
  }

  const isError = status === "error";

  return (
    <p
      className={`rounded-md border px-3 py-2 text-sm font-medium ${
        isError
          ? "border-[#fecaca] bg-[#fef2f2] text-[#b91c1c]"
          : "border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]"
      }`}
    >
      {message}
    </p>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(value);
}

function cameraErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (/permission|denied|notallowed/i.test(message)) {
    return "Camera permission was blocked. Allow camera access and try again.";
  }

  if (/https|secure context/i.test(message)) {
    return "Camera scanning requires a secure HTTPS connection.";
  }

  return "Unable to start the QR scanner. Check camera access and try again.";
}
