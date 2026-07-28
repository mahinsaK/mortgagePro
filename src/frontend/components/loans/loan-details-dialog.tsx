"use client";

import { EllipsisVertical } from "lucide-react";
import { useState } from "react";
import {
  deleteLoanAction,
  updateLoanAction,
} from "@/backend/actions/lending-actions";
import type { LoanRow } from "@/backend/services/lending-service";
import { LoanPaymentsPanel } from "@/frontend/components/loans/loan-payments-panel";
import { LoanQrPanel } from "@/frontend/components/loans/loan-qr-panel";

export function LoanDetailsDialog({
  loan,
  onClose,
}: {
  loan: LoanRow;
  onClose: () => void;
}) {
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:px-4"
      onClick={onClose}
    >
      <section
        aria-labelledby="loan-details-title"
        aria-modal="true"
        className="max-h-[calc(100dvh-0.75rem)] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:max-h-[calc(100vh-48px)] sm:rounded-lg"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="flex items-start justify-between border-b border-[#dfe5ec] px-4 py-4 sm:px-6 sm:py-5">
          <div>
            <p className="text-sm font-medium text-[#657386]">Loan details</p>
            <h2 className="mt-1 text-2xl font-semibold" id="loan-details-title">
              {loan.borrowerName}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                aria-expanded={isActionsOpen}
                aria-label="Loan actions"
                className="flex size-10 items-center justify-center rounded-md border border-[#cfd8e3] text-[#2d3745] transition hover:bg-[#f8fafc]"
                onClick={() => setIsActionsOpen((isOpen) => !isOpen)}
                type="button"
              >
                <EllipsisVertical aria-hidden="true" size={18} />
              </button>
              {isActionsOpen ? (
                <div className="absolute right-0 top-11 z-10 w-40 rounded-md border border-[#dfe5ec] bg-white p-1 text-sm shadow-lg">
                  <button
                    className="flex h-9 w-full items-center rounded px-3 text-left font-medium text-[#2d3745] transition hover:bg-[#f8fafc]"
                    onClick={() => {
                      setIsEditing(true);
                      setIsActionsOpen(false);
                    }}
                    type="button"
                  >
                    Update loan
                  </button>
                  <form
                    action={deleteLoanAction}
                    onSubmit={(event) => {
                      if (!confirm("Delete this loan and its payments?")) {
                        event.preventDefault();
                      }
                    }}
                  >
                    <input name="loan_id" type="hidden" value={loan.id} />
                    <button
                      className="flex h-9 w-full items-center rounded px-3 text-left font-medium text-[#b91c1c] transition hover:bg-[#fef2f2]"
                      type="submit"
                    >
                      Delete loan
                    </button>
                  </form>
                </div>
              ) : null}
            </div>
            <button
              className="rounded-md border border-[#cfd8e3] px-3 py-2 text-sm font-medium text-[#2d3745] transition hover:bg-[#f8fafc]"
              onClick={onClose}
              type="button"
            >
              Close
            </button>
          </div>
        </div>

        <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">
          <dl className="grid gap-4 sm:grid-cols-2">
            <Detail label="Borrower" value={loan.borrowerName} />
            <Detail label="Status" value={loan.status} />
            <Detail label="Amount" value={loan.amount} />
            <Detail label="Total paid" value={loan.totalPaid} />
            <Detail label="Remaining" value={loan.remainingAmount} />
            <Detail label="Daily payment" value={loan.dailyPayment} />
            <Detail label="Interest rate" value={loan.interestRate} />
            <Detail label="Start date" value={loan.startDate} />
            <Detail label="End date" value={loan.endDate} />
          </dl>

          <LoanQrPanel loanId={loan.id} />
          <LoanPaymentsPanel loanId={loan.id} />

          {isEditing ? (
            <form
              action={updateLoanAction}
              className="mt-6 grid gap-4 border-t border-[#eef2f6] pt-5 sm:grid-cols-2"
            >
              <input name="loan_id" type="hidden" value={loan.id} />
              <Field
                defaultValue={loan.amountValue}
                label="Amount"
                min="1"
                name="amount"
                required
                step="0.01"
                type="number"
              />
              <Field
                defaultValue={loan.interestRateValue}
                label="Interest"
                min="0"
                name="interest_rate"
                required
                step="0.01"
                type="number"
              />
              <Field
                defaultValue={loan.dailyPaymentValue}
                label="Daily payment"
                min="0"
                name="daily_payment"
                required
                step="0.01"
                type="number"
              />
              <label className="text-sm font-medium text-[#2d3745]">
                Status
                <select
                  className="mt-2 h-10 w-full rounded-md border border-[#cfd8e3] bg-white px-3 text-sm outline-none transition focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#dbeafe]"
                  defaultValue={loan.status}
                  name="status"
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>
              <Field
                defaultValue={loan.startDateInput}
                label="Start date"
                name="start_date"
                required
                type="date"
              />
              <Field
                defaultValue={loan.endDateInput}
                label="End date"
                name="end_date"
                required
                type="date"
              />
              <div className="flex items-end sm:col-span-2">
                <button
                  className="h-10 w-full rounded-md bg-[#15191f] px-4 text-sm font-semibold text-white transition hover:bg-[#2d3745]"
                  type="submit"
                >
                  Update loan
                </button>
              </div>
            </form>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function Field({
  defaultValue,
  label,
  min,
  name,
  required,
  step,
  type,
}: {
  defaultValue: string;
  label: string;
  min?: string;
  name: string;
  required?: boolean;
  step?: string;
  type: "date" | "number";
}) {
  return (
    <label className="text-sm font-medium text-[#2d3745]">
      {label}
      <input
        className="mt-2 h-10 w-full rounded-md border border-[#cfd8e3] px-3 text-sm outline-none transition focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#dbeafe]"
        defaultValue={defaultValue}
        min={min}
        name={name}
        required={required}
        step={step}
        type={type}
      />
    </label>
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
