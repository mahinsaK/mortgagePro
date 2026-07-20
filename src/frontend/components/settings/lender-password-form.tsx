"use client";

import { useActionState, useRef } from "react";
import {
  updateLenderPasswordFormAction,
  type UpdateLenderPasswordActionState,
} from "@/backend/actions/lending-actions";

const INITIAL_ACTION_STATE: UpdateLenderPasswordActionState = {
  status: "idle",
  message: "",
};

export function LenderPasswordForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [actionState, formAction, isPending] = useActionState(
    async (
      previousState: UpdateLenderPasswordActionState,
      formData: FormData,
    ) => {
      const result = await updateLenderPasswordFormAction(
        previousState,
        formData,
      );

      if (result.status === "success") {
        formRef.current?.reset();
      }

      return result;
    },
    INITIAL_ACTION_STATE,
  );

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2" ref={formRef}>
      {actionState.status !== "idle" ? (
        <p
          aria-live="polite"
          className={`rounded-md border px-3 py-2 text-sm font-medium sm:col-span-2 ${
            actionState.status === "error"
              ? "border-[#fecaca] bg-[#fef2f2] text-[#b91c1c]"
              : "border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]"
          }`}
        >
          {actionState.message}
        </p>
      ) : null}

      <PasswordField label="New password" name="password" />
      <PasswordField label="Confirm password" name="confirm_password" />

      <div className="sm:col-span-2 sm:max-w-xs">
        <button
          className="h-10 w-full rounded-md bg-[#15191f] px-4 text-sm font-semibold text-white transition hover:bg-[#2d3745] disabled:cursor-not-allowed disabled:bg-[#9aa6b2]"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Updating password..." : "Update password"}
        </button>
      </div>
    </form>
  );
}

function PasswordField({ label, name }: { label: string; name: string }) {
  return (
    <label className="text-sm font-medium text-[#2d3745]">
      {label}
      <input
        autoComplete="new-password"
        className="mt-2 h-10 w-full rounded-md border border-[#cfd8e3] px-3 text-base outline-none transition focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#dbeafe]"
        minLength={8}
        name={name}
        required
        type="password"
      />
    </label>
  );
}
