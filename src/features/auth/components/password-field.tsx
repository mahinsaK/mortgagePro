"use client";

import { Eye, EyeOff } from "lucide-react";
import { forwardRef, useId, useState } from "react";

export const PasswordField = forwardRef<
  HTMLInputElement,
  {
    autoComplete: "current-password" | "new-password";
    label: string;
    minLength?: number;
    name: string;
    placeholder: string;
  }
>(function PasswordField(
  { autoComplete, label, minLength, name, placeholder },
  ref,
) {
  const [visible, setVisible] = useState(false);
  const generatedId = useId();
  const inputId = `${name}-${generatedId}`;

  return (
    <div>
      <label className="block text-sm font-semibold text-[#10203b] xl:text-base" htmlFor={inputId}>
        {label}
      </label>
      <span className="relative mt-2 block">
        <input
          ref={ref}
          autoComplete={autoComplete}
          className="h-12 w-full rounded-xl border border-[#bfcbd9] bg-white px-4 pr-12 text-base text-[#172033] outline-none transition placeholder:text-[#7b8799] focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10 xl:h-14 xl:px-5 xl:pr-14 xl:text-lg"
          id={inputId}
          minLength={minLength}
          name={name}
          placeholder={placeholder}
          required
          type={visible ? "text" : "password"}
        />
        <button
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-[#5e6d85] transition hover:text-[#24324a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2563eb] xl:w-14"
          onClick={() => setVisible((current) => !current)}
          type="button"
        >
          {visible ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
        </button>
      </span>
    </div>
  );
});
