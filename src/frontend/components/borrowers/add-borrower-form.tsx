"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Plus, X } from "lucide-react";
import { createBorrowerAction } from "@/backend/actions/lending-actions";
import { PhoneInput } from "@/frontend/components/forms/phone-input";
import { PendingSubmitButton } from "@/frontend/components/ui/pending-submit-button";

export function AddBorrowerForm() {
  return (
    <div className="mb-5 flex justify-end md:mb-6">
      <Dialog.Root>
        <Dialog.Trigger asChild>
          <button
            className="flex h-10 items-center gap-2 rounded-md bg-[#15191f] px-4 text-sm font-semibold text-white transition hover:bg-[#2d3745]"
            type="button"
          >
            <Plus aria-hidden="true" size={17} />
            Add borrower
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45" />
          <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[100dvh] overflow-y-auto rounded-t-2xl border border-[#dfe5ec] bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-[#15191f] shadow-xl sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:w-[min(620px,calc(100vw-32px))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-lg font-semibold">
                  Add borrower
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-[#657386]">
                  Create a borrower profile for this lender.
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
              action={createBorrowerAction}
              className="grid gap-4 sm:grid-cols-2"
            >
              <Field label="Name" name="name" placeholder="Avery Stone" required />
              <Field
                label="Business"
                name="business_name"
                placeholder="Stone Hardware"
              />
              <PhoneField name="phone" />
              <Field label="Address" name="address" placeholder="Main Street" />
              <div className="flex items-end sm:col-span-2">
                <PendingSubmitButton
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#15191f] px-4 text-sm font-semibold text-white transition hover:bg-[#2d3745] disabled:cursor-wait disabled:opacity-70"
                  pendingLabel="Adding borrower…"
                >
                  Add borrower
                </PendingSubmitButton>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function PhoneField({ name }: { name: string }) {
  return (
    <label className="text-sm font-medium text-[#2d3745]">
      Phone
      <PhoneInput
        className="mt-2 h-10 w-full rounded-md border border-[#cfd8e3] px-3 text-sm outline-none transition focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#dbeafe]"
        name={name}
        placeholder="+15550100"
      />
    </label>
  );
}

function Field({
  label,
  name,
  placeholder,
  required,
}: {
  label: string;
  name: string;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <label className="text-sm font-medium text-[#2d3745]">
      {label}
      <input
        className="mt-2 h-10 w-full rounded-md border border-[#cfd8e3] px-3 text-sm outline-none transition focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#dbeafe]"
        name={name}
        placeholder={placeholder}
        required={required}
      />
    </label>
  );
}
