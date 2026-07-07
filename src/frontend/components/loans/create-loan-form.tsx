"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Plus, X } from "lucide-react";
import { createLoanForBorrowerAction } from "@/backend/actions/lending-actions";

export function CreateLoanForm({ borrowerId }: { borrowerId: string }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          className="flex h-10 items-center gap-2 rounded-md bg-[#15191f] px-4 text-sm font-semibold text-white transition hover:bg-[#2d3745]"
          type="button"
        >
          <Plus aria-hidden="true" size={17} />
          Create loan
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(620px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[#dfe5ec] bg-white p-5 text-[#15191f] shadow-xl">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-semibold">
                Create loan
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-[#657386]">
                Add a new loan for this borrower.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                aria-label="Close"
                className="flex size-9 items-center justify-center rounded-md border border-[#dfe5ec] text-[#657386] transition hover:bg-[#f8fafc]"
                type="button"
              >
                <X aria-hidden="true" size={17} />
              </button>
            </Dialog.Close>
          </div>

          <form
            action={createLoanForBorrowerAction}
            className="grid gap-4 sm:grid-cols-2"
          >
            <input name="borrower_id" type="hidden" value={borrowerId} />
            <Field
              label="Amount"
              min="1"
              name="amount"
              placeholder="2500"
              required
              step="0.01"
              type="number"
            />
            <Field
              label="Interest"
              min="0"
              name="interest_rate"
              placeholder="8"
              required
              step="0.01"
              type="number"
            />
            <Field
              label="Daily payment"
              min="0"
              name="daily_payment"
              placeholder="50"
              required
              step="0.01"
              type="number"
            />
            <Field label="Start date" name="start_date" required type="date" />
            <Field label="End date" name="end_date" required type="date" />
            <div className="flex items-end sm:col-span-2">
              <button
                className="h-10 w-full rounded-md bg-[#15191f] px-4 text-sm font-semibold text-white transition hover:bg-[#2d3745]"
                type="submit"
              >
                Create loan
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Field({
  label,
  name,
  placeholder,
  required,
  type,
  min,
  step,
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  type: "date" | "number";
  min?: string;
  step?: string;
}) {
  return (
    <label className="text-sm font-medium text-[#2d3745]">
      {label}
      <input
        className="mt-2 h-10 w-full rounded-md border border-[#cfd8e3] px-3 text-sm outline-none transition focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#dbeafe]"
        min={min}
        name={name}
        placeholder={placeholder}
        required={required}
        step={step}
        type={type}
      />
    </label>
  );
}
