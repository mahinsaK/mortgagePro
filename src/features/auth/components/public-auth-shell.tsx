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
  const width = wide || aside ? "max-w-[1310px]" : "max-w-[500px]";

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#f8f6f3] px-4 py-[max(1.25rem,env(safe-area-inset-top))] text-[#10203b] sm:px-6 sm:py-6 lg:px-10 lg:py-8">
      <div
        aria-hidden="true"
        className="absolute -left-32 -top-32 size-80 rounded-full bg-[#dbeafe]/60 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-36 -right-28 size-96 rounded-full bg-[#e0e7ff]/50 blur-3xl"
      />

      <div className={`relative mx-auto w-full ${width}`}>
        <header className="mb-5 flex min-h-12 items-center justify-between gap-3 min-[840px]:mb-6">
          <AuthBrand />
          {secondaryAction}
        </header>

        <section
          className={`overflow-hidden rounded-[1.25rem] border border-[#cbd5e1] bg-white shadow-[0_24px_60px_rgba(20,34,55,0.15)] ${
            aside
              ? "min-[840px]:grid min-[840px]:min-h-[clamp(540px,calc(100dvh-8.5rem),720px)] min-[840px]:grid-cols-[1.02fr_0.98fr] xl:grid-cols-[1.1fr_0.98fr]"
              : ""
          }`}
        >
          {aside}
          <div
            className={`p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-7 ${
              aside ? "min-[840px]:flex min-[840px]:items-center min-[840px]:p-7 lg:p-9 xl:p-11" : ""
            }`}
          >
            <div className="mx-auto w-full max-w-[540px]">{children}</div>
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
      className="inline-flex items-center gap-2.5 text-[#172033]"
      href="/"
    >
      <span className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#1672ff] to-[#0648c9] text-white shadow-[0_8px_20px_rgba(37,99,235,0.22)] min-[840px]:size-12 min-[840px]:rounded-[0.9rem] xl:size-14 xl:rounded-2xl">
        <Building2 aria-hidden="true" className="xl:size-7" size={21} />
      </span>
      <span className="text-xl font-bold tracking-[-0.035em] min-[840px]:text-2xl xl:text-[1.8rem]">
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
      <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#075ee8] sm:text-sm">
        {eyebrow}
      </p>
      <h1
        className={`mt-3 font-bold leading-tight tracking-[-0.04em] text-[#10203b] ${
          prominent ? "text-3xl sm:text-4xl xl:text-[2.8rem]" : "text-[1.75rem] sm:text-3xl"
        }`}
      >
        {title}
      </h1>
      <p
        className={`mt-3 text-[#56647b] ${
          prominent ? "text-base leading-7 xl:text-lg" : "text-sm leading-6"
        }`}
      >
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
    <aside className="relative hidden overflow-hidden bg-[#0b2848] p-7 text-white min-[840px]:flex min-[840px]:flex-col lg:p-9 xl:p-12">
      <div className="relative z-10">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#8eb8df]/35 bg-white/[0.07] px-5 py-2.5 text-sm font-semibold text-[#d7eaff] shadow-inner">
          <UsersRound aria-hidden="true" size={17} />
          Lender workspace
        </span>
        <h2 className="mt-6 max-w-[560px] text-[2rem] font-bold leading-[1.12] tracking-[-0.045em] lg:text-[2.4rem] xl:mt-8 xl:text-[3.15rem]">
          Keep your lending operation in view.
        </h2>
        <p className="mt-3 max-w-[550px] text-base leading-6 text-[#d5dfeb] lg:text-lg lg:leading-7 xl:mt-4 xl:text-xl">
          Manage borrowers, review loans, and follow collections from one
          organized workspace.
        </p>

        <div className="mt-6 grid gap-3 xl:mt-8 xl:gap-4">
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

      <p className="relative z-10 mt-auto pt-5 text-xs leading-5 text-[#d5dfeb] xl:pt-8 xl:text-sm">
        Your account must be approved before lender access is enabled.
      </p>
    </aside>
  );
}

export function CollectorAccessLink() {
  return (
    <Link
      className="inline-flex h-11 items-center gap-2.5 rounded-xl border border-[#bfc8d5] bg-white/70 px-4 text-sm font-semibold text-[#10203b] shadow-sm backdrop-blur transition hover:border-[#9eabba] hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2563eb]/15 lg:h-12 lg:px-5"
      href="/collector/login"
    >
      <QrCode aria-hidden="true" size={14} />
      Collector login
    </Link>
  );
}

export function LenderAccessLink() {
  return (
    <Link
      className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#d6e0eb] bg-white px-3 text-xs font-semibold text-[#425169] shadow-sm transition hover:border-[#b9c8da] hover:bg-[#f8fafc] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2563eb]/15"
      href="/auth/login"
    >
      <Building2 aria-hidden="true" size={14} />
      Lender login
    </Link>
  );
}

function OverviewItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 text-sm font-medium text-[#f1f6fb] lg:text-base xl:gap-4 xl:text-lg">
      <span className="flex size-10 items-center justify-center rounded-xl border border-[#8eb8df]/25 bg-white/[0.07] text-[#9ed2ff] shadow-inner xl:size-12">
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
