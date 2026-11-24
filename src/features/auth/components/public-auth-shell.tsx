import Link from "next/link";
import {
  BarChart3,
  Building2,
  QrCode,
  UsersRound,
  WalletCards,
} from "lucide-react";

export function PublicAuthShell({
  aside,
  children,
  secondaryAction,
  wide = false,
}: {
  aside?: React.ReactNode;
  children: React.ReactNode;
  secondaryAction?: React.ReactNode;
  wide?: boolean;
}) {
  const width = aside
    ? "max-w-[480px] lg:max-w-[1120px]"
    : wide
      ? "max-w-3xl"
      : "max-w-[480px]";

  const contentMaxWidth = wide && !aside ? "max-w-2xl" : "max-w-[420px]";

  return (
    <main className="relative flex min-h-[100dvh] flex-col justify-center overflow-hidden bg-[var(--background)] px-4 py-[max(1.25rem,env(safe-area-inset-top))] text-[var(--foreground)] sm:px-6 sm:py-8 lg:px-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 -top-32 size-80 rounded-full bg-[#dbeafe]/50 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-36 -right-28 size-96 rounded-full bg-[#e0e7ff]/40 blur-3xl"
      />

      <div className={`relative mx-auto w-full ${width}`}>
        <header className="mb-5 flex min-h-11 flex-wrap items-center justify-between gap-2 sm:mb-6 sm:gap-3">
          <AuthBrand />
          {secondaryAction}
        </header>

        <section
          className={`overflow-hidden rounded-2xl border border-[var(--mp-border)] bg-[var(--mp-surface)] shadow-[0_20px_50px_rgba(15,23,42,0.12)] ${
            aside ? "lg:grid lg:min-h-[600px] lg:grid-cols-[1.05fr_0.95fr]" : ""
          }`}
        >
          {aside}
          <div
            className={`p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-8 ${
              aside ? "lg:flex lg:items-center lg:p-10" : ""
            }`}
          >
            <div className={`mx-auto w-full ${contentMaxWidth}`}>{children}</div>
          </div>
        </section>
      </div>
    </main>
  );
}

export function AuthBrand() {
  return (
    <Link
      aria-label="MortgagePro home"
      className="inline-flex min-h-11 items-center gap-2.5 text-[var(--foreground)]"
      href="/"
    >
      <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#1672ff] to-[#0648c9] text-white shadow-[0_8px_20px_rgba(37,99,235,0.22)] sm:size-11">
        <Building2 aria-hidden="true" size={20} />
      </span>
      <span className="text-lg font-bold tracking-[-0.03em] sm:text-xl">
        MortgagePro
      </span>
    </Link>
  );
}

export function AuthPageHeader({
  description,
  eyebrow,
  prominent = false,
  title,
}: {
  description: React.ReactNode;
  eyebrow: string;
  prominent?: boolean;
  title: string;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--mp-primary)]">
        {eyebrow}
      </p>
      <h1
        className={`mt-2.5 font-bold leading-tight tracking-[-0.03em] text-[var(--foreground)] ${
          prominent ? "text-2xl sm:text-3xl" : "text-2xl sm:text-[1.75rem]"
        }`}
      >
        {title}
      </h1>
      <p className="mt-2 text-sm leading-6 text-[var(--mp-muted)] sm:text-base">
        {description}
      </p>
    </div>
  );
}

export function AuthStatus({
  message,
  status,
}: {
  message?: string;
  status?: string;
}) {
  if (!message) return null;
  const isError = status === "error";

  return (
    <p
      aria-live={isError ? "assertive" : "polite"}
      className={`rounded-xl border px-3.5 py-3 text-sm font-medium ${
        isError
          ? "border-[#fecaca] bg-[#fef2f2] text-[#b91c1c]"
          : "border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]"
      }`}
      role={isError ? "alert" : "status"}
    >
      {message}
    </p>
  );
}

export function LoginOverviewPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-[#0b2848] p-8 text-white lg:flex lg:flex-col lg:p-10">
      <div className="relative z-10">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#8eb8df]/35 bg-white/[0.07] px-4 py-2 text-xs font-semibold text-[#d7eaff] shadow-inner sm:text-sm">
          <UsersRound aria-hidden="true" size={16} />
          Lender workspace
        </span>
        <h2 className="mt-6 max-w-[440px] text-3xl font-bold leading-[1.15] tracking-[-0.035em] xl:text-4xl">
          Keep your lending operation in view.
        </h2>
        <p className="mt-3 max-w-[440px] text-base leading-7 text-[#d5dfeb]">
          Manage borrowers, review loans, and follow collections from one
          organized workspace.
        </p>

        <div className="mt-6 grid gap-3">
          <OverviewItem
            icon={<UsersRound size={17} />}
            text="Borrower and collector management"
          />
          <OverviewItem
            icon={<WalletCards size={17} />}
            text="Loan and payment tracking"
          />
          <OverviewItem
            icon={<BarChart3 size={17} />}
            text="Daily collection visibility"
          />
        </div>
      </div>

      <ArchitectureArtwork />

      <p className="relative z-10 mt-auto pt-6 text-xs leading-5 text-[#d5dfeb]">
        Your account must be approved before lender access is enabled.
      </p>
    </aside>
  );
}

export function CollectorAccessLink() {
  return (
    <Link
      className="inline-flex h-11 items-center gap-2 rounded-xl border border-[var(--mp-border)] bg-[var(--mp-surface)] px-3 text-xs font-semibold text-[var(--foreground)] shadow-sm transition hover:bg-[var(--mp-surface-muted)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2563eb]/15 sm:px-4 sm:text-sm"
      href="/collector/login"
    >
      <QrCode aria-hidden="true" size={15} />
      Collector login
    </Link>
  );
}

export function LenderAccessLink() {
  return (
    <Link
      className="inline-flex h-11 items-center gap-2 rounded-xl border border-[var(--mp-border)] bg-[var(--mp-surface)] px-3 text-xs font-semibold text-[var(--foreground)] shadow-sm transition hover:bg-[var(--mp-surface-muted)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2563eb]/15 sm:px-4 sm:text-sm"
      href="/auth/login"
    >
      <Building2 aria-hidden="true" size={15} />
      Lender login
    </Link>
  );
}

function OverviewItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 text-sm font-medium text-[#f1f6fb] lg:text-base">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#8eb8df]/25 bg-white/[0.07] text-[#9ed2ff] shadow-inner">
        {icon}
      </span>
      <span>{text}</span>
    </div>
  );
}

function ArchitectureArtwork() {
  return (
    <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[48%] overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-t from-[#09223e] via-[#102f54]/80 to-transparent" />
      <svg
        className="absolute bottom-10 left-0 h-[90%] w-full opacity-80"
        preserveAspectRatio="none"
        viewBox="0 0 700 360"
      >
        <path d="M0 292 305 180 700 277V360H0Z" fill="#173b64" opacity=".72" />
        <path d="M0 326 302 248 545 305 700 280V360H0Z" fill="#0a2441" />
        <path d="M340 250 470 112 700 155V296H340Z" fill="#102b4c" stroke="#dbeafe" strokeWidth="2" />
        <path d="m470 112 112 36v147H340v-45Z" fill="#15395f" opacity=".82" />
        <path d="M405 235V188l120-42v135" fill="#071b31" stroke="#bcd8f4" strokeWidth="1.5" />
        <path d="M436 224v-48l28-10v52Zm35-14v-46l29-10v49Z" fill="#d8a67e" opacity=".78" />
        <path d="M582 148v147M340 250l130-138 230 43" fill="none" stroke="#f1f5f9" strokeWidth="2" />
        <path d="M0 326 302 248l243 57" fill="none" stroke="#9cc8f2" strokeWidth="1.5" opacity=".75" />
      </svg>
    </div>
  );
}
