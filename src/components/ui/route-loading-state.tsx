import { LoaderCircle } from "lucide-react";

export function RouteLoadingState({
  label = "Loading page…",
}: {
  label?: string;
}) {
  return (
    <div
      aria-live="polite"
      className="flex min-h-56 items-center justify-center px-4 py-12"
      role="status"
    >
      <div className="flex items-center gap-3 rounded-lg border border-[#dfe5ec] bg-white px-5 py-4 text-sm font-semibold text-[#526174] shadow-sm">
        <LoaderCircle
          aria-hidden="true"
          className="animate-spin text-[#2563eb]"
          size={20}
        />
        <span>{label}</span>
      </div>
    </div>
  );
}
