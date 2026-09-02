"use client";

import { LoaderCircle } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";

export function PendingSubmitButton({
  children,
  disabled,
  formAction,
  pendingLabel = "Working…",
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
  children: ReactNode;
  pendingLabel?: ReactNode;
}) {
  const status = useFormStatus();
  const showsPendingState =
    status.pending && (!formAction || status.action === formAction);

  return (
    <button
      {...props}
      aria-busy={showsPendingState || undefined}
      disabled={disabled || status.pending}
      formAction={formAction}
      type="submit"
    >
      {showsPendingState ? (
        <>
          <LoaderCircle aria-hidden="true" className="animate-spin" size={16} />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}
