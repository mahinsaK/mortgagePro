"use client";

import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useActionState, useState } from "react";
import {
  createSmsTemplateAction,
  deleteSmsTemplateAction,
  type SmsManagementActionState,
  updateSmsTemplateAction,
} from "@/backend/actions/sms-actions";
import type { SmsTemplate } from "@/backend/services/sms-management-service";
import { SmsTemplatePlaceholderHelp } from "@/frontend/components/sms/sms-template-placeholder-help";

const INITIAL_STATE: SmsManagementActionState = {
  status: "idle",
  message: "",
};

export function SmsTemplateManager({
  onSelect,
  templates,
}: {
  onSelect: (message: string) => void;
  templates: SmsTemplate[];
}) {
  const [isCreating, setIsCreating] = useState(false);

  return (
    <section className="flex aspect-square min-h-0 w-full flex-col overflow-hidden rounded-lg border border-[#dfe5ec] bg-white p-4 shadow-sm xl:sticky xl:top-4">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#15191f]">
            Message templates
          </h2>
          <p className="mt-1 text-sm text-[#657386]">
            {templates.length} of 20 saved templates
          </p>
        </div>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#cfd8e3] bg-white px-3 text-sm font-semibold text-[#2d3745] transition hover:bg-[#f8fafc] disabled:text-[#9aa6b2]"
          disabled={templates.length >= 20}
          onClick={() => setIsCreating((current) => !current)}
          type="button"
        >
          {isCreating ? (
            <X aria-hidden="true" size={16} />
          ) : (
            <Plus aria-hidden="true" size={16} />
          )}
          {isCreating ? "Cancel" : "New template"}
        </button>
      </div>

      <div
        aria-label="Saved message templates"
        className="mt-3 min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain pr-1"
        role="region"
        tabIndex={0}
      >
        <SmsTemplatePlaceholderHelp className="rounded-md bg-[#f8fafc] px-3 py-2" />

        {isCreating ? (
          <CreateTemplateForm onSaved={() => setIsCreating(false)} />
        ) : null}

        <div className="mt-3 grid gap-3 pb-1">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              onSelect={onSelect}
              template={template}
            />
          ))}
          {templates.length === 0 && !isCreating ? (
            <p className="text-sm text-[#657386]">
              Submit your first sender request to add starter templates, or create
              one here.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function CreateTemplateForm({ onSaved }: { onSaved: () => void }) {
  const [state, action, isPending] = useActionState(
    async (previousState: SmsManagementActionState, formData: FormData) => {
      const result = await createSmsTemplateAction(previousState, formData);
      if (result.status === "success") {
        onSaved();
      }
      return result;
    },
    INITIAL_STATE,
  );

  return (
    <form
      action={action}
      className="mt-4 grid gap-3 rounded-md bg-[#f8fafc] p-4"
    >
      <TemplateFields disabled={isPending} />
      <ActionMessage state={state} />
      <button
        className="h-10 rounded-md bg-[#15191f] px-4 text-sm font-semibold text-white disabled:bg-[#9aa6b2] sm:justify-self-start"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Saving…" : "Save template"}
      </button>
    </form>
  );
}

function TemplateCard({
  onSelect,
  template,
}: {
  onSelect: (message: string) => void;
  template: SmsTemplate;
}) {
  const [editing, setEditing] = useState(false);
  const [state, action, isPending] = useActionState(
    async (previousState: SmsManagementActionState, formData: FormData) => {
      const result = await updateSmsTemplateAction(previousState, formData);
      if (result.status === "success") {
        setEditing(false);
      }
      return result;
    },
    INITIAL_STATE,
  );

  if (editing) {
    return (
      <form
        action={action}
        className="grid w-full gap-3 rounded-md border border-[#bfdbfe] bg-[#f8fafc] p-3"
      >
        <input name="template_id" type="hidden" value={template.id} />
        <TemplateFields disabled={isPending} template={template} />
        <ActionMessage state={state} />
        <div className="flex gap-2">
          <button
            className="h-9 rounded-md bg-[#15191f] px-3 text-xs font-semibold text-white disabled:bg-[#9aa6b2]"
            disabled={isPending}
            type="submit"
          >
            {isPending ? "Saving…" : "Save"}
          </button>
          <button
            className="h-9 rounded-md border border-[#cfd8e3] bg-white px-3 text-xs font-semibold"
            onClick={() => setEditing(false)}
            type="button"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <article className="w-full rounded-md border border-[#dfe5ec] bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <button
          className="min-w-0 flex-1 text-left"
          onClick={() => onSelect(template.message)}
          type="button"
        >
          <span className="block truncate text-sm font-semibold text-[#15191f]">
            {template.name}
          </span>
          <span className="mt-2 line-clamp-2 block text-xs leading-5 text-[#657386]">
            {template.message}
          </span>
          <span className="mt-2 inline-block rounded-md bg-[#e0ecff] px-2 py-1 text-xs font-semibold text-[#1d4ed8]">
            Use message
          </span>
        </button>
        <div className="flex shrink-0 gap-1">
          <button
            aria-label={"Edit " + template.name}
            className="rounded-md p-2 text-[#657386] hover:bg-[#f1f5f9]"
            onClick={() => setEditing(true)}
            type="button"
          >
            <Pencil aria-hidden="true" size={15} />
          </button>
          <form action={deleteSmsTemplateAction}>
            <input name="template_id" type="hidden" value={template.id} />
            <button
              aria-label={"Delete " + template.name}
              className="rounded-md p-2 text-[#b91c1c] hover:bg-[#fef2f2]"
              onClick={(event) => {
                if (!confirm("Delete the “" + template.name + "” template?")) {
                  event.preventDefault();
                }
              }}
              type="submit"
            >
              <Trash2 aria-hidden="true" size={15} />
            </button>
          </form>
        </div>
      </div>
    </article>
  );
}

function TemplateFields({
  disabled,
  template,
}: {
  disabled: boolean;
  template?: SmsTemplate;
}) {
  return (
    <>
      <label className="text-sm font-medium text-[#2d3745]">
        Template name
        <input
          className="mt-1 h-10 w-full rounded-md border border-[#cfd8e3] bg-white px-3 text-sm"
          defaultValue={template?.name}
          disabled={disabled}
          maxLength={80}
          name="name"
          required
        />
      </label>
      <label className="text-sm font-medium text-[#2d3745]">
        Message
        <textarea
          className="mt-1 min-h-28 w-full resize-none rounded-md border border-[#cfd8e3] bg-white px-3 py-2 text-sm"
          defaultValue={template?.message}
          disabled={disabled}
          maxLength={480}
          name="message"
          required
        />
      </label>
    </>
  );
}

function ActionMessage({ state }: { state: SmsManagementActionState }) {
  return state.message ? (
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
  ) : null;
}
