"use client";

import { CheckCircle2, Clock3, ShieldAlert } from "lucide-react";
import {
  type FormEvent,
  useActionState,
  useState,
  useTransition,
} from "react";
import {
  deleteSmsSenderAction,
  requestSmsSenderAction,
  type SmsManagementActionState,
  updateAutomaticPaymentSmsAction,
} from "@/backend/actions/sms-actions";
import type { SmsManagementData } from "@/backend/services/sms-management-service";
import { SmsTemplatePlaceholderHelp } from "@/frontend/components/sms/sms-template-placeholder-help";

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
  const [deleteState, deleteAction, isDeleting] = useActionState(
    deleteSmsSenderAction,
    INITIAL_STATE,
  );
  const suspended = management.account?.status === "suspended";

  return (
    <section className="rounded-lg border border-[#dfe5ec] bg-white p-4 shadow-sm">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#657386]">
          SMS settings
        </p>
        <h2 className="mt-1 text-base font-semibold text-[#15191f]">
          Sender and automatic payments
        </h2>
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        <div className="rounded-md bg-[#f8fafc] p-3">
          <p className="text-sm font-medium text-[#657386]">SMS sender</p>
          <h3 className="mt-1 text-base font-semibold text-[#15191f]">
            {management.activeSender
              ? management.activeSender.senderId
              : "No approved sender ID"}
          </h3>
          <SenderStatus management={management} suspended={suspended} />

          {management.activeSender ? (
            <form action={deleteAction} className="mt-3 grid gap-2">
              <input
                name="sender_request_id"
                type="hidden"
                value={management.activeSender.id}
              />
              <p className="text-xs leading-5 text-[#657386]">
                Delete the approved sender before requesting a different one.
                Automatic payment SMS will be turned off.
              </p>
              {deleteState.message ? (
                <p
                  aria-live="polite"
                  className={
                    deleteState.status === "success"
                      ? "text-sm font-medium text-[#166534]"
                      : "text-sm font-medium text-[#b91c1c]"
                  }
                >
                  {deleteState.message}
                </p>
              ) : null}
              <button
                className="inline-flex h-10 items-center justify-center rounded-md border border-[#fecaca] bg-white px-4 text-sm font-semibold text-[#b91c1c] transition hover:bg-[#fef2f2] disabled:cursor-not-allowed disabled:text-[#9aa6b2] sm:justify-self-start"
                disabled={isDeleting}
                onClick={(event) => {
                  if (
                    !confirm(
                      "Delete this approved sender ID? SMS sending will stop until another sender is approved.",
                    )
                  ) {
                    event.preventDefault();
                  }
                }}
                type="submit"
              >
                {isDeleting ? "Deleting…" : "Delete sender ID"}
              </button>
            </form>
          ) : (
            <form action={action} className="mt-3 grid gap-2">
              <label className="text-sm font-medium text-[#2d3745]">
                Request a sender ID
                <input
                  autoCapitalize="none"
                  className="mt-1.5 h-10 w-full rounded-md border border-[#cfd8e3] bg-white px-3 text-sm outline-none transition focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#dbeafe] disabled:bg-[#f1f5f9]"
                  disabled={Boolean(management.pendingRequest) || isPending}
                  maxLength={11}
                  minLength={3}
                  name="sender_id"
                  pattern="[A-Za-z][A-Za-z0-9]{2,10}"
                  placeholder="MortgagePro"
                  required
                />
              </label>
              <p className="text-xs leading-4 text-[#657386]">
                3–11 letters or numbers, beginning with a letter. Administrator
                approval is required.
              </p>
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
                className="inline-flex h-10 items-center justify-center rounded-md bg-[#15191f] px-4 text-sm font-semibold text-white transition hover:bg-[#2d3745] disabled:cursor-not-allowed disabled:bg-[#9aa6b2] sm:justify-self-start"
                disabled={Boolean(management.pendingRequest) || isPending}
                type="submit"
              >
                {isPending ? "Submitting…" : "Request sender ID"}
              </button>
            </form>
          )}
        </div>

        <AutomaticPaymentSettings
          key={[
            management.account ? "account" : "no-account",
            ...management.templates.map((template) => template.id),
          ].join(":")}
          management={management}
        />
      </div>
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
  const [state, setState] = useState(INITIAL_STATE);
  const [isPending, startTransition] = useTransition();
  const savedEnabled = management.account?.paymentSmsEnabled ?? false;
  const savedTemplateId = management.account?.paymentSmsTemplateId ?? "";
  const hasTemplates = management.templates.length > 0;
  const canConfigure = Boolean(management.account && management.templates.length);

  function submitSettings(form: HTMLFormElement | null) {
    if (!form) return;
    queueMicrotask(() => form.requestSubmit());
  }

  function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const nextState = await updateAutomaticPaymentSmsAction(
        INITIAL_STATE,
        formData,
      );
      setState(nextState);

      if (nextState.status === "error") {
        setEnabled(savedEnabled);
        setTemplateId(savedTemplateId);
      }
    });
  }

  return (
    <form
      className="grid gap-3 rounded-md bg-[#f8fafc] p-3"
      onSubmit={saveSettings}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[#15191f]">
            Automatic payment message
          </h3>
          <p className="mt-1 text-xs leading-4 text-[#657386]">
            Sends after a payment succeeds. SMS failure never reverses payment.
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-3">
          <input
            checked={enabled}
            className="peer sr-only"
            disabled={
              !canConfigure || isPending || (!enabled && !templateId)
            }
            name="enabled"
            onChange={(event) => {
              setEnabled(event.currentTarget.checked);
              submitSettings(event.currentTarget.form);
            }}
            role="switch"
            type="checkbox"
          />
          <span className="relative h-6 w-11 rounded-full bg-[#cfd8e3] transition after:absolute after:left-1 after:top-1 after:size-4 after:rounded-full after:bg-white after:transition-transform peer-checked:bg-[#2563eb] peer-checked:after:translate-x-5 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#2563eb] peer-disabled:cursor-not-allowed peer-disabled:opacity-60" />
          <span className="text-sm font-semibold text-[#2d3745]">
            {enabled ? "On" : "Off"}
          </span>
        </label>
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium text-[#2d3745]">
          Payment template
          <select
            className="mt-1.5 h-10 w-full rounded-md border border-[#cfd8e3] bg-white px-3 text-sm outline-none transition focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#dbeafe] disabled:bg-[#f1f5f9]"
            disabled={!management.account || !hasTemplates || isPending}
            name="template_id"
            onChange={(event) => {
              setTemplateId(event.currentTarget.value);
              submitSettings(event.currentTarget.form);
            }}
            required={enabled}
            value={templateId}
          >
            <option disabled={enabled} value="">
              {hasTemplates
                ? "Choose a saved template"
                : "No saved templates available"}
            </option>
            {management.templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs leading-5 text-[#657386]">
          {management.templates.length} saved template
          {management.templates.length === 1 ? "" : "s"} available. Template
          and switch changes save automatically.
        </p>
      </div>

      <SmsTemplatePlaceholderHelp />

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
      {isPending ? (
        <p aria-live="polite" className="text-sm font-medium text-[#526174]">
          Saving automatic payment settings…
        </p>
      ) : null}
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
