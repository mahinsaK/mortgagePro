"use client";

import { LoaderCircle } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";

export function PendingSubmitButton({
  children,
  disabled,
  pendingLabel = "Working…",
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
  children: ReactNode;
  pendingLabel?: ReactNode;
}) {
  const { pending } = useFormStatus();

  return (
    <button {...props} disabled={disabled || pending} type="submit">
      {pending ? (
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
