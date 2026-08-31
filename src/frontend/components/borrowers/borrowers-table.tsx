"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Pencil, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  deleteBorrowerAction,
  updateBorrowerAction,
} from "@/backend/actions/lending-actions";
import { PhoneInput } from "@/frontend/components/forms/phone-input";
import { announceNavigationStart } from "@/frontend/components/ui/navigation-progress";
import { PendingSubmitButton } from "@/frontend/components/ui/pending-submit-button";

type BorrowerRow = {
  id: string;
  name: string;
  businessName: string;
  contactInfo: string;
  addressInfo: string;
  status: string;
  createdAt: string;
};

export function BorrowersTable({ borrowers }: { borrowers: BorrowerRow[] }) {
  const router = useRouter();

  function openBorrowerProfile(borrowerId: string) {
    announceNavigationStart();
    router.push(`/borrowers/${borrowerId}`);
  }

  return (
    <>
      <div className="divide-y divide-[#eef2f6] md:hidden">
        {borrowers.map((borrower) => (
          <article className="p-4" key={borrower.id}>
            <div className="flex items-start justify-between gap-3">
              <button
                className="min-w-0 flex-1 text-left"
                onClick={() => openBorrowerProfile(borrower.id)}
                type="button"
              >
                <p className="truncate text-base font-semibold text-[#15191f]">
                  {borrower.name}
                </p>
                <p className="mt-1 truncate text-sm text-[#657386]">
                  {borrower.businessName || "No business name"}
                </p>
              </button>
              <BorrowerActions borrower={borrower} />
            </div>
            <button
              className="mt-4 grid w-full grid-cols-2 gap-3 rounded-lg bg-[#f8fafc] p-3 text-left"
              onClick={() => openBorrowerProfile(borrower.id)}
              type="button"
            >
              <MobileDetail
                label="Contact"
                value={borrower.contactInfo || "Not set"}
              />
              <MobileDetail label="Created" value={borrower.createdAt} />
              <span className="col-span-2 flex items-center justify-between border-t border-[#e5eaf0] pt-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#657386]">
                  Status
                </span>
                <span className="rounded-full bg-[#e0ecff] px-2.5 py-1 text-xs font-semibold text-[#1d4ed8]">
                  {borrower.status}
                </span>
              </span>
            </button>
          </article>
        ))}
        {borrowers.length === 0 ? (
          <p className="p-5 text-sm text-[#657386]">No borrowers found.</p>
        ) : null}
      </div>

      <table className="hidden w-full min-w-[860px] border-collapse text-left text-sm md:table">
      <thead className="bg-[#f8fafc] text-[#657386]">
        <tr>
          <th className="px-5 py-3 font-semibold">Name</th>
          <th className="px-5 py-3 font-semibold">Business</th>
          <th className="px-5 py-3 font-semibold">Contact</th>
          <th className="px-5 py-3 font-semibold">Status</th>
          <th className="px-5 py-3 font-semibold">Created</th>
          <th className="px-5 py-3 font-semibold">Actions</th>
        </tr>
      </thead>
      <tbody>
        {borrowers.map((borrower) => (
          <tr
            className="cursor-pointer border-t border-[#eef2f6] transition hover:bg-[#f8fafc] focus:bg-[#f8fafc] focus:outline-none"
            key={borrower.id}
            onClick={() => openBorrowerProfile(borrower.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openBorrowerProfile(borrower.id);
              }
            }}
            role="link"
            tabIndex={0}
          >
            <td className="px-5 py-4 font-semibold text-[#15191f]">
              {borrower.name}
            </td>
            <td className="px-5 py-4 text-[#657386]">
              {borrower.businessName}
            </td>
            <td className="px-5 py-4 text-[#657386]">
              {borrower.contactInfo}
            </td>
            <td className="px-5 py-4">
              <span className="rounded-full bg-[#e0ecff] px-3 py-1 text-[13px] font-semibold text-[#1d4ed8]">
                {borrower.status}
              </span>
            </td>
            <td className="px-5 py-4 text-[#657386]">{borrower.createdAt}</td>
            <td className="px-5 py-4" onClick={(event) => event.stopPropagation()}>
              <BorrowerActions borrower={borrower} />
            </td>
          </tr>
        ))}
        {borrowers.length === 0 ? (
          <tr className="border-t border-[#eef2f6]">
            <td className="px-5 py-6 text-[#657386]" colSpan={6}>
              No borrowers found.
            </td>
          </tr>
        ) : null}
      </tbody>
      </table>
    </>
  );
}

function BorrowerActions({ borrower }: { borrower: BorrowerRow }) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <EditBorrowerDialog borrower={borrower} />
      <form
        action={deleteBorrowerAction}
        onSubmit={(event) => {
          if (!confirm("Delete this borrower and their loans?")) {
            event.preventDefault();
          }
        }}
      >
        <input name="borrower_id" type="hidden" value={borrower.id} />
        <PendingSubmitButton
          aria-label={`Delete ${borrower.name}`}
          className="flex size-9 items-center justify-center rounded-md border border-[#fecaca] text-[#b91c1c] transition hover:bg-[#fef2f2]"
          pendingLabel={null}
        >
          <Trash2 aria-hidden="true" size={16} />
        </PendingSubmitButton>
      </form>
    </div>
  );
}

function MobileDetail({ label, value }: { label: string; value: string }) {
  return (
    <span className="min-w-0">
      <span className="block text-xs font-semibold uppercase tracking-wide text-[#657386]">
        {label}
      </span>
      <span className="mt-1 block truncate text-sm font-medium text-[#15191f]">
        {value}
      </span>
    </span>
  );
}

function EditBorrowerDialog({ borrower }: { borrower: BorrowerRow }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          aria-label={`Edit ${borrower.name}`}
          className="flex size-9 items-center justify-center rounded-md border border-[#cfd8e3] text-[#2d3745] transition hover:bg-[#f8fafc]"
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
                Edit borrower
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-[#657386]">
                Updating name or contact also refreshes loan search.
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

          <form action={updateBorrowerAction} className="grid gap-4 sm:grid-cols-2">
            <input name="borrower_id" type="hidden" value={borrower.id} />
            <Field
              defaultValue={borrower.name}
              label="Name"
              name="name"
              required
            />
            <Field
              defaultValue={borrower.businessName}
              label="Business"
              name="business_name"
            />
            <PhoneField
              defaultValue={borrower.contactInfo}
              name="phone"
            />
            <Field
              defaultValue={borrower.addressInfo}
              label="Address"
              name="address"
            />
            <label className="text-sm font-medium text-[#2d3745]">
              Status
              <select
                className="mt-2 h-10 w-full rounded-md border border-[#cfd8e3] bg-white px-3 text-sm outline-none transition focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#dbeafe]"
                defaultValue={borrower.status}
                name="status"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <div className="flex items-end sm:col-span-2">
              <PendingSubmitButton
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#15191f] px-4 text-sm font-semibold text-white transition hover:bg-[#2d3745] disabled:cursor-wait disabled:opacity-70"
                pendingLabel="Updating borrower…"
              >
                Update borrower
              </PendingSubmitButton>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function PhoneField({
  defaultValue,
  name,
}: {
  defaultValue: string;
  name: string;
}) {
  return (
    <label className="text-sm font-medium text-[#2d3745]">
      Phone
      <PhoneInput
        className="mt-2 h-10 w-full rounded-md border border-[#cfd8e3] px-3 text-sm outline-none transition focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#dbeafe]"
        defaultValue={defaultValue}
        name={name}
      />
    </label>
  );
}

function Field({
  defaultValue,
  label,
  name,
  required,
}: {
  defaultValue: string;
  label: string;
  name: string;
  required?: boolean;
}) {
  return (
    <label className="text-sm font-medium text-[#2d3745]">
      {label}
      <input
        className="mt-2 h-10 w-full rounded-md border border-[#cfd8e3] px-3 text-sm outline-none transition focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#dbeafe]"
        defaultValue={defaultValue}
        name={name}
        required={required}
      />
    </label>
  );
}
