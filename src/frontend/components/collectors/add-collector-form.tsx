"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Plus, X } from "lucide-react";
import { createCollectorAction } from "@/backend/actions/lending-actions";

export function AddCollectorForm() {
  return (
    <div className="mb-6 flex justify-end">
      <Dialog.Root>
        <Dialog.Trigger asChild>
          <button
            className="flex h-10 items-center gap-2 rounded-md bg-[#15191f] px-4 text-sm font-semibold text-white transition hover:bg-[#2d3745]"
            type="button"
          >
            <Plus aria-hidden="true" size={17} />
            Add collector
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(620px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[#dfe5ec] bg-white p-5 text-[#15191f] shadow-xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-lg font-semibold">
                  Add collector
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-[#657386]">
                  Create a collector profile for this lender.
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
              action={createCollectorAction}
              className="grid gap-4 sm:grid-cols-2"
            >
              <Field label="Name" name="name" placeholder="Jordan Lee" required />
              <Field label="Phone" name="phone" placeholder="+1 555 0102" />
              <Field label="Area" name="area" placeholder="Austin North" />
              <label className="text-sm font-medium text-[#2d3745]">
                Status
                <select
                  className="mt-2 h-10 w-full rounded-md border border-[#cfd8e3] bg-white px-3 text-sm outline-none transition focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#dbeafe]"
                  name="status"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
              <div className="flex items-end sm:col-span-2">
                <button
                  className="h-10 w-full rounded-md bg-[#15191f] px-4 text-sm font-semibold text-white transition hover:bg-[#2d3745]"
                  type="submit"
                >
                  Add collector
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
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
