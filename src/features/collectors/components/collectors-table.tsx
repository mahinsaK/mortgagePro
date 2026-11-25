"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Check, Copy, LoaderCircle, Pencil, Trash2, X } from "lucide-react";
import { useActionState, useState } from "react";
import {
  deleteCollectorAction,
  updateCollectorFormAction,
  type UpdateCollectorActionState,
} from "@/features/collectors/server/collector-management-actions";
import type { CollectorRow } from "@/server/services/lending-service";
import { PhoneInput } from "@/components/forms/phone-input";
import { PendingSubmitButton } from "@/components/ui/pending-submit-button";

const INITIAL_UPDATE_STATE: UpdateCollectorActionState = {
  status: "idle",
  message: "",
};

export function CollectorsTable({ collectors }: { collectors: CollectorRow[] }) {
  const [copiedUsername, setCopiedUsername] = useState("");

  async function copyUsername(username: string) {
    await navigator.clipboard.writeText(username);
    setCopiedUsername(username);
    window.setTimeout(() => {
      setCopiedUsername((current) => (current === username ? "" : current));
    }, 2000);
  }

  return (
    <>
      <div className="divide-y divide-[#eef2f6] @min-[600px]:grid @min-[600px]:grid-cols-2 @min-[600px]:gap-3 @min-[600px]:divide-y-0 @min-[600px]:bg-[#f8fafc] @min-[600px]:p-3 @min-[1040px]:hidden">
        {collectors.map((collector) => (
          <article className="min-w-0 p-4 @min-[600px]:rounded-lg @min-[600px]:border @min-[600px]:border-[#dfe5ec] @min-[600px]:bg-white" key={collector.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold">
                  {collector.name}
                </p>
              </div>
              <CollectorActions collector={collector} />
            </div>
            <div className="mt-3 flex min-w-0 items-center gap-2">
              <code className="min-w-0 flex-1 truncate text-sm text-[#657386]" title={collector.username}>
                {collector.username}
              </code>
              <CopyUsernameButton
                copied={copiedUsername === collector.username}
                name={collector.name}
                onCopy={() => copyUsername(collector.username)}
              />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-[#f8fafc] p-3">
              <MobileDetail
                label="Contact"
                value={collector.contactInfo || "Not set"}
              />
              <MobileDetail
                label="Area"
                value={collector.areaInfo || "Not set"}
              />
              <MobileDetail label="Created" value={collector.createdAt} />
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-[#657386]">
                  Status
                </dt>
                <dd className="mt-1">
                  <StatusBadge status={collector.status} />
                </dd>
              </div>
            </dl>
          </article>
        ))}
        {collectors.length === 0 ? (
          <p className="p-5 text-sm text-[#657386]">No collectors found.</p>
        ) : null}
      </div>

      <div
        aria-label="Collectors table"
        className="hidden w-full max-w-full overflow-x-auto overscroll-x-contain focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#2563eb] @min-[1040px]:block"
        role="region"
        tabIndex={0}
      >
        <table className="w-full min-w-[1040px] table-fixed border-collapse text-left text-sm">
          <thead className="bg-[#f8fafc] text-[#657386]">
            <tr>
              <th className="w-[15%] px-5 py-3 font-semibold">Name</th>
              <th className="w-[24%] px-5 py-3 font-semibold">Username</th>
              <th className="w-[15%] px-5 py-3 font-semibold">Contact</th>
              <th className="w-[11%] px-5 py-3 font-semibold">Area</th>
              <th className="w-[11%] px-5 py-3 font-semibold">Status</th>
              <th className="w-[11%] px-5 py-3 font-semibold">Created</th>
              <th className="w-[13%] px-3 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {collectors.map((collector) => (
              <tr className="border-t border-[#eef2f6]" key={collector.id}>
                <td className="break-words px-5 py-4 font-medium">{collector.name}</td>
                <td className="px-5 py-4">
                  <div className="flex min-w-0 items-center gap-2 text-[#657386]">
                    <code className="block min-w-0 max-w-[230px] truncate" title={collector.username}>
                      {collector.username}
                    </code>
                    <CopyUsernameButton
                      copied={copiedUsername === collector.username}
                      name={collector.name}
                      onCopy={() => copyUsername(collector.username)}
                    />
                  </div>
                </td>
                <td className="break-words px-5 py-4 text-[#657386]">
                  {collector.contactInfo || "No contact info"}
                </td>
                <td className="break-words px-5 py-4 text-[#657386]">
                  {collector.areaInfo || "No area"}
                </td>
                <td className="px-5 py-4">
                  <StatusBadge status={collector.status} />
                </td>
                <td className="px-5 py-4 text-[#657386]">
                  {collector.createdAt}
                </td>
                <td className="px-3 py-4">
                  <div className="flex justify-end">
                    <CollectorActions collector={collector} />
                  </div>
                </td>
              </tr>
            ))}
            {collectors.length === 0 ? (
              <tr className="border-t border-[#eef2f6]">
                <td className="px-5 py-6 text-[#657386]" colSpan={7}>
                  No collectors found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}

function CopyUsernameButton({
  copied,
  name,
  onCopy,
}: {
  copied: boolean;
  name: string;
  onCopy: () => void;
}) {
  return (
    <button
      aria-label={`Copy username for ${name}`}
      className="inline-flex shrink-0 items-center gap-1 rounded border border-[#dfe5ec] px-1.5 py-1 text-xs font-medium text-[#2d3745] transition hover:bg-[#f8fafc]"
      onClick={onCopy}
      type="button"
    >
      {copied ? (
        <Check aria-hidden="true" size={12} />
      ) : (
        <Copy aria-hidden="true" size={12} />
      )}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function CollectorActions({ collector }: { collector: CollectorRow }) {
  return (
    <div className="flex shrink-0 items-center gap-2">
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
        <PendingSubmitButton
          aria-label={`Delete ${collector.name}`}
          className="flex size-11 items-center justify-center rounded-lg border border-[#fecaca] text-[#b91c1c] transition hover:bg-[#fef2f2] lg:size-9"
          pendingLabel={null}
        >
          <Trash2 aria-hidden="true" size={16} />
        </PendingSubmitButton>
      </form>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={
        status === "active"
          ? "rounded-full bg-[#dcfce7] px-2.5 py-1 text-xs font-semibold text-[#166534]"
          : "rounded-full bg-[#f1f5f9] px-2.5 py-1 text-xs font-semibold text-[#64748b]"
      }
    >
      {status}
    </span>
  );
}

function MobileDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-[#657386]">
        {label}
      </dt>
      <dd className="mt-1 truncate text-sm font-medium text-[#15191f]">
        {value}
      </dd>
    </div>
  );
}

function EditCollectorDialog({ collector }: { collector: CollectorRow }) {
  const [isOpen, setIsOpen] = useState(false);
  const [actionState, formAction, isPending] = useActionState(
    async (
      previousState: UpdateCollectorActionState,
      formData: FormData,
    ) => {
      const result = await updateCollectorFormAction(previousState, formData);

      if (result.status === "success") {
        setIsOpen(false);
      }

      return result;
    },
    INITIAL_UPDATE_STATE,
  );

  return (
    <Dialog.Root onOpenChange={setIsOpen} open={isOpen}>
      <Dialog.Trigger asChild>
        <button
          aria-label={`Edit ${collector.name}`}
          className="flex size-11 items-center justify-center rounded-lg border border-[#cfd8e3] text-[#2d3745] transition hover:bg-[#f8fafc] lg:size-9"
          type="button"
        >
          <Pencil aria-hidden="true" size={16} />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[calc(100dvh-0.75rem)] overflow-y-auto rounded-t-2xl border border-[#dfe5ec] bg-white p-5 text-[#15191f] shadow-xl sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[min(620px,calc(100vw-32px))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg">
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
                className="flex size-11 items-center justify-center rounded-md border border-[#dfe5ec] text-[#657386] transition hover:bg-[#f8fafc] sm:size-10"
                type="button"
              >
                <X aria-hidden="true" size={17} />
              </button>
            </Dialog.Close>
          </div>

          <form action={formAction} className="grid gap-4 sm:grid-cols-2">
            <input name="collector_id" type="hidden" value={collector.id} />
            {actionState.status === "error" ? (
              <p
                aria-live="polite"
                className="rounded-md border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-sm font-medium text-[#b91c1c] sm:col-span-2"
              >
                {actionState.message}
              </p>
            ) : null}
            <Field
              defaultValue={collector.name}
              label="Name"
              name="name"
              required
            />
            <label className="text-sm font-medium text-[#2d3745]">
              Username
              <input
                className="mt-2 h-10 w-full cursor-not-allowed rounded-md border border-[#dfe5ec] bg-[#f8fafc] px-3 text-sm text-[#657386]"
                disabled
                value={collector.username}
              />
              <span className="mt-1 block text-xs font-normal text-[#657386]">
                Usernames are permanent after creation.
              </span>
            </label>
            <label className="text-sm font-medium text-[#2d3745]">
              Phone
              <PhoneInput
                className="mt-2 h-10 w-full rounded-md border border-[#cfd8e3] px-3 text-sm outline-none transition focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#dbeafe]"
                defaultValue={collector.contactInfo}
                name="phone"
              />
            </label>
            <Field defaultValue={collector.areaInfo} label="Area" name="area" />
            <Field
              defaultValue=""
              label="New password"
              minLength={8}
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
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#15191f] px-4 text-sm font-semibold text-white transition hover:bg-[#2d3745]"
                disabled={isPending}
                type="submit"
              >
                {isPending ? (
                  <>
                    <LoaderCircle aria-hidden="true" className="animate-spin" size={16} />
                    Updating collector…
                  </>
                ) : "Update collector"}
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
  minLength,
  name,
  placeholder,
  required,
  type = "text",
}: {
  defaultValue: string;
  label: string;
  minLength?: number;
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
        minLength={minLength}
        name={name}
        placeholder={placeholder}
        required={required}
        type={type}
      />
    </label>
  );
}
