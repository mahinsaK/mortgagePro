"use client";

import { CheckCircle2, Clock3, ShieldAlert } from "lucide-react";
import { useActionState, useState } from "react";
import {
  requestSmsSenderAction,
  type SmsManagementActionState,
  updateAutomaticPaymentSmsAction,
} from "@/backend/actions/sms-actions";
import type { SmsManagementData } from "@/backend/services/sms-management-service";

const INITIAL_STATE: SmsManagementActionState = {
  status: "idle",
  message: "",
};

export function SmsAccountPanel({
  management,
}: {
  management: SmsManagementData;
}) {
  const [state, action, isPending] = useActionState(
    requestSmsSenderAction,
    INITIAL_STATE,
  );
  const suspended = management.account?.status === "suspended";

  return (
    <section className="rounded-lg border border-[#dfe5ec] bg-white p-4 shadow-sm md:p-5">
      <div className="mb-5">
        <p className="text-sm font-medium text-[#657386]">SMS settings</p>
        <h2 className="mt-1 text-lg font-semibold text-[#15191f]">
          Sender and automatic payments
        </h2>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)] lg:items-start">
        <div>
          <p className="text-sm font-medium text-[#657386]">SMS sender</p>
          <h2 className="mt-1 text-lg font-semibold text-[#15191f]">
            {management.activeSender
              ? management.activeSender.senderId
              : "No approved sender ID"}
          </h2>
          <SenderStatus management={management} suspended={suspended} />
        </div>

        <form action={action} className="grid gap-3">
          <label className="text-sm font-medium text-[#2d3745]">
            {management.activeSender
              ? "Request a replacement sender ID"
              : "Request a sender ID"}
            <input
              autoCapitalize="none"
              className="mt-2 h-11 w-full rounded-md border border-[#cfd8e3] px-3 text-sm outline-none transition focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#dbeafe] disabled:bg-[#f1f5f9]"
              disabled={Boolean(management.pendingRequest) || isPending}
              maxLength={11}
              minLength={3}
              name="sender_id"
              pattern="[A-Za-z][A-Za-z0-9]{2,10}"
              placeholder="MortgagePro"
              required
            />
          </label>
          <p className="text-xs leading-5 text-[#657386]">
            Use 3–11 letters or numbers and begin with a letter. An administrator
            will approve it after it is approved in Text.lk.
          </p>
          {state.message ? (
            <p
              aria-live="polite"
              className={state.status === "success" ? "text-sm font-medium text-[#166534]" : "text-sm font-medium text-[#b91c1c]"}
            >
              {state.message}
            </p>
          ) : null}
          <button
            className="inline-flex h-11 items-center justify-center rounded-md bg-[#15191f] px-4 text-sm font-semibold text-white transition hover:bg-[#2d3745] disabled:cursor-not-allowed disabled:bg-[#9aa6b2]"
            disabled={Boolean(management.pendingRequest) || isPending}
            type="submit"
          >
            {isPending ? "Submitting…" : "Request sender ID"}
          </button>
        </form>
      </div>

      <AutomaticPaymentSettings management={management} />
    </section>
  );
}

function AutomaticPaymentSettings({
  management,
}: {
  management: SmsManagementData;
}) {
  const [enabled, setEnabled] = useState(
    management.account?.paymentSmsEnabled ?? false,
  );
  const [templateId, setTemplateId] = useState(
    management.account?.paymentSmsTemplateId ?? "",
  );
  const [state, action, isPending] = useActionState(
    updateAutomaticPaymentSmsAction,
    INITIAL_STATE,
  );
  const canConfigure = Boolean(management.account && management.templates.length);

  return (
    <form
      action={action}
      className="mt-6 grid gap-4 border-t border-[#e7ebf0] pt-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h3 className="text-base font-semibold text-[#15191f]">
            Automatic payment message
          </h3>
          <p className="mt-1 text-sm leading-6 text-[#657386]">
            Send the selected template to the borrower only after a collector’s
            payment is recorded successfully. An SMS problem never reverses the
            payment.
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-3">
          <input
            checked={enabled}
            className="peer sr-only"
            disabled={!canConfigure || isPending}
            name="enabled"
            onChange={(event) => setEnabled(event.target.checked)}
            role="switch"
            type="checkbox"
          />
          <span className="relative h-6 w-11 rounded-full bg-[#cfd8e3] transition after:absolute after:left-1 after:top-1 after:size-4 after:rounded-full after:bg-white after:transition-transform peer-checked:bg-[#2563eb] peer-checked:after:translate-x-5 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#2563eb] peer-disabled:cursor-not-allowed peer-disabled:opacity-60" />
          <span className="text-sm font-semibold text-[#2d3745]">
            {enabled ? "On" : "Off"}
          </span>
        </label>
      </div>

      <label className="text-sm font-medium text-[#2d3745]">
        Payment message template
        <select
          className="mt-2 h-11 w-full rounded-md border border-[#cfd8e3] bg-white px-3 text-sm outline-none transition focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#dbeafe] disabled:bg-[#f1f5f9]"
          disabled={!canConfigure || isPending}
          name="template_id"
          onChange={(event) => setTemplateId(event.target.value)}
          required={enabled}
          value={templateId}
        >
          <option value="">Choose a saved template</option>
          {management.templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
      </label>

      <p className="text-xs leading-5 text-[#657386]">
        Available placeholders: {"{{borrowerName}}"}, {"{{amount}}"},{" "}
        {"{{remainingBalance}}"}, {"{{paymentDate}}"}, and{" "}
        {"{{companyName}}"}.
      </p>

      {!canConfigure ? (
        <p className="text-sm font-medium text-[#9a6700]">
          Request a sender ID and create at least one template before enabling
          automatic messages.
        </p>
      ) : null}
      {state.message ? (
        <p
          aria-live="polite"
          className={
            state.status === "success"
              ? "text-sm font-medium text-[#166534]"
              : "text-sm font-medium text-[#b91c1c]"
          }
        >
          {state.message}
        </p>
      ) : null}
      <button
        className="h-11 rounded-md bg-[#15191f] px-4 text-sm font-semibold text-white transition hover:bg-[#2d3745] disabled:cursor-not-allowed disabled:bg-[#9aa6b2] sm:justify-self-start"
        disabled={!canConfigure || isPending || (enabled && !templateId)}
        type="submit"
      >
        {isPending ? "Saving…" : "Save automatic message setting"}
      </button>
    </form>
  );
}

function SenderStatus({
  management,
  suspended,
}: {
  management: SmsManagementData;
  suspended: boolean;
}) {
  if (suspended) {
    return (
      <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-[#b91c1c]">
        <ShieldAlert aria-hidden="true" className="mt-0.5 shrink-0" size={17} />
        SMS sending is suspended. Saved templates and history remain available.
      </p>
    );
  }

  if (management.pendingRequest) {
    return (
      <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-[#9a6700]">
        <Clock3 aria-hidden="true" className="mt-0.5 shrink-0" size={17} />
        {management.pendingRequest.senderId} is awaiting review
        {management.activeSender ? "; the approved sender remains active." : "."}
      </p>
    );
  }

  if (management.activeSender) {
    return (
      <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-[#166534]">
        <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0" size={17} />
        Approved and ready when this account has monthly quota.
      </p>
    );
  }

  if (management.latestRejectedRequest) {
    return (
      <div className="mt-3 text-sm leading-6 text-[#b91c1c]">
        <p>{management.latestRejectedRequest.senderId} was not approved.</p>
        {management.latestRejectedRequest.rejectionReason ? (
          <p className="mt-1">{management.latestRejectedRequest.rejectionReason}</p>
        ) : null}
      </div>
    );
  }

  return (
    <p className="mt-3 text-sm leading-6 text-[#657386]">
      Sending is disabled until a sender ID is approved and a monthly quota is
      assigned.
    </p>
  );
}
