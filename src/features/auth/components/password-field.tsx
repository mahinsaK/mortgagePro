"use client";

import { Eye, EyeOff } from "lucide-react";
import { forwardRef, useId, useState } from "react";

export const PasswordField = forwardRef<
  HTMLInputElement,
  {
    autoComplete: "current-password" | "new-password";
    label: string;
    leadingIcon?: React.ReactNode;
    minLength?: number;
    name: string;
    placeholder: string;
  }
>(function PasswordField(
  { autoComplete, label, leadingIcon, minLength, name, placeholder },
  ref,
) {
  const [visible, setVisible] = useState(false);
  const generatedId = useId();
  const inputId = `${name}-${generatedId}`;

  return (
    <div>
      <label
        className="block text-sm font-semibold text-[var(--foreground)]"
        htmlFor={inputId}
      >
        {label}
      </label>
      <span className="relative mt-2 block">
        {leadingIcon ? (
          <span aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#596b85]">
            {leadingIcon}
          </span>
        ) : null}
        <input
          ref={ref}
          autoComplete={autoComplete}
          className={`h-12 w-full rounded-xl border border-[var(--mp-border)] bg-[var(--mp-surface)] pr-12 text-base text-[var(--foreground)] outline-none transition placeholder:text-[var(--mp-muted)] focus:border-[var(--mp-primary)] focus:ring-4 focus:ring-[#2563eb]/10 ${leadingIcon ? "pl-12" : "pl-4"}`}
          id={inputId}
          minLength={minLength}
          name={name}
          placeholder={placeholder}
          required
          type={visible ? "text" : "password"}
        />
        <button
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-[var(--mp-muted)] transition hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2563eb]"
          onClick={() => setVisible((current) => !current)}
          type="button"
        >
          {visible ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
        </button>
      </span>
    </div>
  );
});
