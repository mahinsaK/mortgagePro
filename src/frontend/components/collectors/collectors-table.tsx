"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Pencil, Trash2, X } from "lucide-react";
import {
  deleteCollectorAction,
  updateCollectorAction,
} from "@/backend/actions/lending-actions";
import type { CollectorRow } from "@/backend/services/lending-service";

export function CollectorsTable({ collectors }: { collectors: CollectorRow[] }) {
  return (
    <table className="w-full min-w-[920px] border-collapse text-left text-sm">
      <thead className="bg-[#f8fafc] text-[#657386]">
        <tr>
          <th className="px-5 py-3 font-semibold">Name</th>
          <th className="px-5 py-3 font-semibold">Contact</th>
          <th className="px-5 py-3 font-semibold">Area</th>
          <th className="px-5 py-3 font-semibold">Status</th>
          <th className="px-5 py-3 font-semibold">Created</th>
          <th className="px-5 py-3 font-semibold">Actions</th>
        </tr>
      </thead>
      <tbody>
        {collectors.map((collector) => (
          <tr className="border-t border-[#eef2f6]" key={collector.id}>
            <td className="px-5 py-4">
              <p className="font-medium">{collector.name}</p>
            </td>
            <td className="px-5 py-4 text-[#657386]">
              {collector.contactInfo || "No contact info"}
            </td>
            <td className="px-5 py-4 text-[#657386]">
              {collector.areaInfo || "No area"}
            </td>
            <td className="px-5 py-4">
              <span
                className={
                  collector.status === "active"
                    ? "rounded-full bg-[#dcfce7] px-3 py-1 text-[13px] font-semibold text-[#166534]"
                    : "rounded-full bg-[#f1f5f9] px-3 py-1 text-[13px] font-semibold text-[#64748b]"
                }
              >
                {collector.status}
              </span>
            </td>
            <td className="px-5 py-4 text-[#657386]">
              {collector.createdAt}
            </td>
            <td className="px-5 py-4">
              <div className="flex items-center gap-2">
                <EditCollectorDialog collector={collector} />
                <form
                  action={deleteCollectorAction}
                  onSubmit={(event) => {
                    if (!confirm("Delete this collector?")) {
                      event.preventDefault();
                    }
                  }}
                >
                  <input name="collector_id" type="hidden" value={collector.id} />
                  <button
                    aria-label={`Delete ${collector.name}`}
                    className="flex size-9 items-center justify-center rounded-md border border-[#fecaca] text-[#b91c1c] transition hover:bg-[#fef2f2]"
                    type="submit"
                  >
                    <Trash2 aria-hidden="true" size={16} />
                  </button>
                </form>
              </div>
            </td>
          </tr>
        ))}
        {collectors.length === 0 ? (
          <tr className="border-t border-[#eef2f6]">
            <td className="px-5 py-6 text-[#657386]" colSpan={6}>
              No collectors found.
            </td>
          </tr>
        ) : null}
      </tbody>
    </table>
  );
}

function EditCollectorDialog({ collector }: { collector: CollectorRow }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          aria-label={`Edit ${collector.name}`}
          className="flex size-9 items-center justify-center rounded-md border border-[#cfd8e3] text-[#2d3745] transition hover:bg-[#f8fafc]"
          type="button"
        >
          <Pencil aria-hidden="true" size={16} />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(620px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[#dfe5ec] bg-white p-5 text-[#15191f] shadow-xl">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-semibold">
                Edit collector
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-[#657386]">
                Update collector contact and working area.
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

          <form action={updateCollectorAction} className="grid gap-4 sm:grid-cols-2">
            <input name="collector_id" type="hidden" value={collector.id} />
            <Field
              defaultValue={collector.name}
              label="Name"
              name="name"
              required
            />
            <Field
              defaultValue={collector.contactInfo}
              label="Phone"
              name="phone"
            />
            <Field defaultValue={collector.areaInfo} label="Area" name="area" />
            <Field
              defaultValue=""
              label="New password"
              name="password"
              placeholder="Leave blank to keep current"
              type="password"
            />
            <label className="text-sm font-medium text-[#2d3745]">
              Status
              <select
                className="mt-2 h-10 w-full rounded-md border border-[#cfd8e3] bg-white px-3 text-sm outline-none transition focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#dbeafe]"
                defaultValue={collector.status}
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
                Update collector
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Field({
  defaultValue,
  label,
  name,
  placeholder,
  required,
  type = "text",
}: {
  defaultValue: string;
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  type?: "password" | "text";
}) {
  return (
    <label className="text-sm font-medium text-[#2d3745]">
      {label}
      <input
        className="mt-2 h-10 w-full rounded-md border border-[#cfd8e3] px-3 text-sm outline-none transition focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#dbeafe]"
        defaultValue={defaultValue}
        name={name}
        placeholder={placeholder}
        required={required}
        type={type}
      />
    </label>
  );
}
