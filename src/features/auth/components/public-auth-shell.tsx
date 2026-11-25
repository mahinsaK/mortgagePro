import Link from "next/link";
import Image from "next/image";
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
    ? "max-w-none"
    : wide
      ? "max-w-3xl"
      : "max-w-[480px]";

  const contentMaxWidth = wide && !aside ? "max-w-2xl" : aside ? "max-w-[470px]" : "max-w-[420px]";

  return (
    <main className={`relative flex min-h-[100dvh] flex-col justify-center overflow-hidden text-[var(--foreground)] ${
      aside
        ? "bg-[#f4f7ff]"
        : "bg-[var(--background)] px-4 py-[max(1.25rem,env(safe-area-inset-top))] sm:px-6 sm:py-8 lg:px-10"
    }`}>
      {!aside ? (
        <>
          <div aria-hidden="true" className="pointer-events-none absolute -left-32 -top-32 size-80 rounded-full bg-[#dbeafe]/50 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-36 -right-28 size-96 rounded-full bg-[#e0e7ff]/40 blur-3xl" />
        </>
      ) : null}

      <div className={`relative mx-auto w-full ${width}`}>
        <header className={`flex min-h-11 flex-wrap items-center justify-between gap-2 sm:gap-3 ${
          aside ? "px-5 py-5 sm:px-8 lg:hidden" : "mb-5 sm:mb-6"
        }`}>
          <AuthBrand />
          {aside && secondaryAction ? <span className="md:hidden">{secondaryAction}</span> : secondaryAction}
        </header>

        <section
          className={`overflow-hidden ${
            aside
              ? "bg-transparent lg:grid lg:min-h-[100dvh] lg:grid-cols-2"
              : "rounded-2xl border border-[var(--mp-border)] bg-[var(--mp-surface)] shadow-[0_20px_50px_rgba(15,23,42,0.12)]"
          }`}
        >
          {aside}
          <div
            className={`p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-8 ${
              aside ? "lg:flex lg:items-center lg:px-10 lg:py-8 xl:px-14" : ""
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
          prominent ? "text-3xl lg:text-4xl" : "text-2xl sm:text-[1.75rem]"
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
    <aside className="hidden min-w-0 flex-col justify-between px-10 py-8 text-[#102449] lg:flex xl:px-14">
      <div>
        <span className="inline-flex items-center gap-2 rounded-xl border border-[#d2e1ff] bg-[#e8f0ff] px-4 py-2 text-sm font-semibold text-[#0755df]">
          <UsersRound aria-hidden="true" size={17} />
          Lender workspace
        </span>
        <h2 className="mt-6 max-w-[530px] text-4xl font-bold leading-tight tracking-[-0.035em] text-[#101d36] text-balance xl:text-5xl">
          Keep your lending operations in view.
        </h2>
        <p className="mt-3 max-w-[480px] text-base leading-7 text-[#51627d] text-pretty">
          Manage borrowers, review loans, and follow collections from one
          organized workspace.
        </p>

        <div className="mt-6 grid gap-3">
          <OverviewItem
            icon={<UsersRound size={17} />}
            text="Borrower and collector management"
            detail="Keep your lending contacts organized."
          />
          <OverviewItem
            icon={<WalletCards size={17} />}
            text="Loan and payment tracking"
            detail="Review loans, payments, and balances."
          />
          <OverviewItem
            icon={<BarChart3 size={17} />}
            text="Daily collection visibility"
            detail="See today's collections at a glance."
          />
        </div>
      </div>
      <Image
        alt=""
        aria-hidden="true"
        className="mx-auto mt-4 h-[clamp(200px,32vh,320px)] w-full object-contain object-bottom"
        height={1024}
        priority
        src="/lender-workspace-overview.png"
        width={1536}
      />
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

function OverviewItem({ icon, text, detail }: { icon: React.ReactNode; text: string; detail: string }) {
  return (
    <div className="flex items-center gap-4">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#e4edff] text-[#0755df]">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-base font-semibold text-[#122344]">{text}</span>
        <span className="block text-sm text-[#596b85]">{detail}</span>
      </span>
    </div>
  );
}
