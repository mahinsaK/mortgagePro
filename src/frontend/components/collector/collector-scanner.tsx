"use client";

import { useEffect, useRef, useState } from "react";

type LoanPreview = {
  id: string;
  borrowerName: string;
  amount: number;
  totalPaid: number;
  remainingAmount: number;
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
  const [cameraMessage, setCameraMessage] = useState("");
  const [loanId, setLoanId] = useState("");
  const [loan, setLoan] = useState<LoanPreview | null>(null);
  const [lookupError, setLookupError] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let interval: number | undefined;
    let isMounted = true;

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraMessage("Camera is not available. Enter the loan ID manually.");
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });

        if (!isMounted || !videoRef.current) {
          return;
        }

        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        const BarcodeDetectorClass = (
          window as typeof window & {
            BarcodeDetector?: new (options: {
              formats: string[];
            }) => {
              detect(video: HTMLVideoElement): Promise<Array<{ rawValue: string }>>;
            };
          }
        ).BarcodeDetector;

        if (!BarcodeDetectorClass) {
          setCameraMessage(
            "Camera is on, but this browser cannot read QR codes automatically. Enter the loan ID manually.",
          );
          return;
        }

        const detector = new BarcodeDetectorClass({ formats: ["qr_code"] });
        interval = window.setInterval(async () => {
          if (!videoRef.current || isLookingUp || loan) {
            return;
          }

          const codes = await detector.detect(videoRef.current);
          const value = codes[0]?.rawValue?.trim();

          if (value) {
            setLoanId(value);
            await lookupLoan(value);
          }
        }, 900);
      } catch {
        setCameraMessage("Camera permission was blocked. Enter the loan ID manually.");
      }
    }

    void startCamera();

    return () => {
      isMounted = false;
      if (interval) {
        window.clearInterval(interval);
      }
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [isLookingUp, loan]);

  async function lookupLoan(value = loanId) {
    const requestedLoanId = value.trim();

    if (!requestedLoanId) {
      setLookupError("Enter or scan a loan ID.");
      return;
    }

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

      <div className="mt-4 overflow-hidden rounded-md bg-black">
        <video
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

      <div className="mt-4 flex gap-2">
        <input
          className="h-11 min-w-0 flex-1 rounded-md border border-[#cfd8e3] px-3 text-sm outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#dbeafe]"
          onChange={(event) => setLoanId(event.target.value)}
          placeholder="Loan ID from QR"
          value={loanId}
        />
        <button
          className="h-11 rounded-md bg-[#15191f] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#9aa6b2]"
          disabled={isLookingUp}
          onClick={() => void lookupLoan()}
          type="button"
        >
          {isLookingUp ? "Checking" : "Check"}
        </button>
      </div>

      {loan ? (
        <form action={collectAction} className="mt-4 rounded-md border border-[#dfe5ec] p-4">
          <input name="loan_id" type="hidden" value={loan.id} />
          <dl className="grid gap-3 text-sm">
            <Detail label="Borrower" value={loan.borrowerName} />
            <Detail label="Loan" value={loan.id} />
            <Detail label="Remaining" value={formatMoney(loan.remainingAmount)} />
          </dl>
          <label className="mt-4 block text-sm font-medium text-[#2d3745]">
            Amount
            <input
              className="mt-2 h-11 w-full rounded-md border border-[#cfd8e3] px-3 text-sm outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#dbeafe]"
              min="0.01"
              name="amount"
              placeholder="0.00"
              required
              step="0.01"
              type="number"
            />
          </label>
          <button
            className="mt-4 h-11 w-full rounded-md bg-[#2563eb] px-4 text-sm font-semibold text-white transition hover:bg-[#1d4ed8]"
            type="submit"
          >
            Collect payment
          </button>
        </form>
      ) : null}
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
