"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Plus, RefreshCw, X } from "lucide-react";
import { useActionState, useRef, useState } from "react";
import {
  createCollectorAction,
  type CreateCollectorActionState,
} from "@/backend/actions/lending-actions";
import {
  generateCollectorUsername,
  normalizeCollectorUsernameDraft,
  validateNewCollectorUsername,
} from "@/backend/modules/collectors/username";

type Availability = "idle" | "checking" | "available" | "taken" | "invalid";

const INITIAL_ACTION_STATE: CreateCollectorActionState = {
  status: "idle",
  message: "",
};

export function AddCollectorForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [availability, setAvailability] = useState<Availability>("idle");
  const [availabilityMessage, setAvailabilityMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const requestSequenceRef = useRef(0);
  const submitAfterCheckRef = useRef(false);
  const [actionState, formAction, isPending] = useActionState(
    async (
      previousState: CreateCollectorActionState,
      formData: FormData,
    ) => {
      const result = await createCollectorAction(previousState, formData);

      if (result.status === "success") {
        resetDraft();
        setIsOpen(false);
      }

      return result;
    },
    INITIAL_ACTION_STATE,
  );

  async function checkUsername(candidate: string) {
    const validationError = validateNewCollectorUsername(candidate);

    if (validationError) {
      setAvailability("invalid");
      setAvailabilityMessage(validationError);
      return false;
    }

    const requestSequence = ++requestSequenceRef.current;
    setAvailability("checking");
    setAvailabilityMessage("Checking username...");

    try {
      const result = await requestUsernameAvailability(candidate);

      if (requestSequence !== requestSequenceRef.current) {
        return false;
      }

      if (result.available) {
        setAvailability("available");
        setAvailabilityMessage("Username is available.");
        return true;
      }

      setAvailability("taken");
      setAvailabilityMessage("Username already exists. Use another one.");
      return false;
    } catch (error) {
      if (requestSequence !== requestSequenceRef.current) {
        return false;
      }

      setAvailability("invalid");
      setAvailabilityMessage(
        error instanceof Error ? error.message : "Could not check this username.",
      );
      return false;
    }
  }

  async function generateAvailableUsername() {
    const requestSequence = ++requestSequenceRef.current;
    setIsGenerating(true);
    setAvailability("checking");
    setAvailabilityMessage("Generating an available username...");

    try {
      for (let attempt = 0; attempt < 12; attempt += 1) {
        const candidate = generateCollectorUsername(name);
        const result = await requestUsernameAvailability(candidate);

        if (requestSequence !== requestSequenceRef.current) {
          return;
        }

        if (result.available) {
          setUsername(candidate);
          setAvailability("available");
          setAvailabilityMessage("Username is available.");
          return;
        }
      }

      setAvailability("invalid");
      setAvailabilityMessage("Could not generate a username. Please try again.");
    } catch (error) {
      if (requestSequence === requestSequenceRef.current) {
        setAvailability("invalid");
        setAvailabilityMessage(
          error instanceof Error ? error.message : "Could not generate a username.",
        );
      }
    } finally {
      if (requestSequence === requestSequenceRef.current) {
        setIsGenerating(false);
      }
    }
  }

  function resetDraft() {
    requestSequenceRef.current += 1;
    formRef.current?.reset();
    setName("");
    setUsername("");
    setAvailability("idle");
    setAvailabilityMessage("");
    setIsGenerating(false);
    submitAfterCheckRef.current = false;
  }

  const actionStateIsCurrent =
    actionState.status === "error" &&
    actionState.submittedUsername === username;
  const submittedUsernameError = actionStateIsCurrent
    ? actionState.fieldErrors?.username
    : undefined;
  const usernameMessage = submittedUsernameError ?? availabilityMessage;
  const usernameHasError =
    Boolean(submittedUsernameError) ||
    availability === "taken" ||
    availability === "invalid";
  const submitDisabled =
    isPending ||
    isGenerating ||
    availability === "checking" ||
    availability === "taken" ||
    availability === "invalid" ||
    !username;

  return (
    <div className="mb-6 flex justify-end">
      <Dialog.Root
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) {
            resetDraft();
          }
        }}
        open={isOpen}
      >
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
              action={formAction}
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={async (event) => {
                if (submitAfterCheckRef.current) {
                  submitAfterCheckRef.current = false;
                  return;
                }

                if (availability === "available") {
                  return;
                }

                event.preventDefault();
                if (await checkUsername(username)) {
                  submitAfterCheckRef.current = true;
                  formRef.current?.requestSubmit();
                }
              }}
              ref={formRef}
            >
              {actionStateIsCurrent && !submittedUsernameError ? (
                <p
                  aria-live="polite"
                  className="rounded-md border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-sm font-medium text-[#b91c1c] sm:col-span-2"
                >
                  {actionState.message}
                </p>
              ) : null}
              <label className="text-sm font-medium text-[#2d3745]">
                Name
                <input
                  className="mt-2 h-10 w-full rounded-md border border-[#cfd8e3] px-3 text-sm outline-none transition focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#dbeafe]"
                  name="name"
                  onBlur={() => {
                    if (!username && name.trim()) {
                      void generateAvailableUsername();
                    }
                  }}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Jordan Lee"
                  required
                  value={name}
                />
              </label>
              <Field label="Phone" name="phone" placeholder="+1 555 0102" />
              <label className="text-sm font-medium text-[#2d3745] sm:col-span-2">
                Username
                <div className="mt-2 flex gap-2">
                  <input
                    aria-describedby="collector-username-help collector-username-status"
                    className="h-10 min-w-0 flex-1 rounded-md border border-[#cfd8e3] px-3 text-sm outline-none transition focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#dbeafe]"
                    maxLength={36}
                    minLength={5}
                    name="username"
                    onBlur={() => {
                      if (username) {
                        void checkUsername(username);
                      }
                    }}
                    onChange={(event) => {
                      requestSequenceRef.current += 1;
                      setUsername(normalizeCollectorUsernameDraft(event.target.value));
                      setAvailability("idle");
                      setAvailabilityMessage("");
                    }}
                    pattern="[a-z][a-z0-9]{4,35}"
                    placeholder="jordanlee4821"
                    required
                    value={username}
                  />
                  <button
                    className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md border border-[#cfd8e3] px-3 text-sm font-semibold text-[#2d3745] transition hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:text-[#9aa6b2]"
                    disabled={!name.trim() || isGenerating || isPending}
                    onClick={() => void generateAvailableUsername()}
                    type="button"
                  >
                    <RefreshCw aria-hidden="true" size={15} />
                    {username ? "Generate another" : "Generate"}
                  </button>
                </div>
                <span
                  className="mt-2 block text-xs font-normal text-[#657386]"
                  id="collector-username-help"
                >
                  Permanent after creation. Use 5-36 lowercase letters and numbers.
                </span>
                <span
                  aria-live="polite"
                  className={`mt-1 block text-xs font-medium ${
                    usernameHasError
                      ? "text-[#b91c1c]"
                      : availability === "available"
                        ? "text-[#166534]"
                        : "text-[#657386]"
                  }`}
                  id="collector-username-status"
                >
                  {usernameMessage}
                </span>
              </label>
              <Field label="Area" name="area" placeholder="Austin North" />
              <Field
                label="Collector password"
                minLength={8}
                name="password"
                placeholder="Minimum 8 characters"
                required
                type="password"
              />
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
                  disabled={submitDisabled}
                  type="submit"
                >
                  {isPending ? "Adding collector..." : "Add collector"}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

async function requestUsernameAvailability(username: string) {
  const response = await fetch(
    `/api/collectors/username?value=${encodeURIComponent(username)}`,
    { cache: "no-store" },
  );
  const data = (await response.json()) as {
    available?: boolean;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error ?? "Could not check this username.");
  }

  return { available: data.available === true };
}

function Field({
  label,
  minLength,
  name,
  placeholder,
  required,
  type = "text",
}: {
  label: string;
  minLength?: number;
  name: string;
  placeholder: string;
  required?: boolean;
  type?: "password" | "text";
}) {
  return (
    <label className="text-sm font-medium text-[#2d3745]">
      {label}
      <input
        className="mt-2 h-10 w-full rounded-md border border-[#cfd8e3] px-3 text-sm outline-none transition focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#dbeafe]"
        minLength={minLength}
        name={name}
        placeholder={placeholder}
        required={required}
        type={type}
      />
    </label>
  );
}
