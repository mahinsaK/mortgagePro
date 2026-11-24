import Link from "next/link";
import {
  Building2,
  Check,
  FileSpreadsheet,
  Lock,
  MessageSquareText,
  QrCode,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import {
  FaqAccordion,
  type FaqItem,
} from "@/features/marketing/components/faq-accordion";
import { InteractiveWorkspacePreview } from "@/features/marketing/components/interactive-workspace-preview";
import { LandingNavbar } from "@/features/marketing/components/landing-navbar";
import { ScrollReveal } from "@/features/marketing/components/scroll-reveal";
import { TaglineReveal } from "@/features/marketing/components/tagline-reveal";

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "How does lender onboarding and account approval work?",
    answer:
      "Submit your business name, contact phone, email address, and password on the registration page. New lender profiles start inactive until reviewed and approved so workspace access stays controlled.",
  },
  {
    question: "Do field collectors need to install a separate mobile application?",
    answer:
      "No. Collectors open the collector login page in their mobile browser, sign in with the username and password issued by their lender, and scan loan QR codes directly with the phone camera.",
  },
  {
    question: "How does MortgagePro prevent duplicate payments or overpayments?",
    answer:
      "Every payment submission generates a deterministic request identifier so repeated taps or retries return the original record instead of charging twice. Each payment and loan balance update runs in one atomic transaction that rechecks the remaining balance and rejects overpayments.",
  },
  {
    question: "Can another lender or collector view my borrower records?",
    answer:
      "No. Database access runs strictly on the server with empty client permissions, and every borrower, collector, loan, and payment query is scoped to the authenticated lender boundary. Scanning a QR code never bypasses lender ownership checks.",
  },
  {
    question: "How are borrower SMS notifications handled?",
    answer:
      "MortgagePro integrates with TextLK for borrower reminders and notifications. Lenders manage reusable message templates, sender approval requests, monthly quota counters, and sanitized batch send logs from the SMS section.",
  },
  {
    question: "Can I sign in with Google as a lender?",
    answer:
      "Yes, once your lender profile is approved and active. Google sign in uses a short lived OAuth state cookie and connects only to existing active lender accounts without automatically creating new access.",
  },
  {
    question: "Can I export borrower and payment history for accounting?",
    answer:
      "Yes. Lenders can export borrower lists and payment records as CSV files directly from the portal, with CSV formula neutralization built in for spreadsheet safety.",
  },
];

const COMPARISON_BEFORE = [
  "Balances tracked across disconnected spreadsheets and paper notebooks",
  "Field payments confirmed through chat messages and typed manually at night",
  "Duplicate entries when collectors tap twice on slow mobile networks",
  "No clear separation between lender administration and collector access",
];

const COMPARISON_AFTER = [
  "Borrower profiles, loans, and schedules maintained inside one lender portal",
  "Camera QR scanning logs daily or custom repayments in one atomic update",
  "Deterministic request keys block duplicate charges and reject overpayments",
  "Separate lender and collector sessions scoped strictly to your business",
];

const WORKFLOW_STEPS = [
  {
    number: "01",
    title: "Request your lender workspace",
    description:
      "Submit your company profile and contact details. Once approved, sign in with email and password or connect your Google account.",
  },
  {
    number: "02",
    title: "Add borrowers, loans, and collectors",
    description:
      "Create borrower records, issue loans with scannable QR codes, configure SMS templates, and provision collector usernames.",
  },
  {
    number: "03",
    title: "Collect in the field and reconcile daily",
    description:
      "Collectors scan loan QR codes to record daily or custom payments while your dashboard tracks daily totals and overdue loans live.",
  },
];

const SECURITY_CONTROLS = [
  {
    title: "Server only database access",
    detail:
      "Browser sessions never talk directly to collections. All reads and writes run through server side clients with private runtime credentials.",
  },
  {
    title: "Strict lender tenant boundary",
    detail:
      "Every borrower, loan, collector, and payment lookup checks ownership against the authenticated server session rather than client inputs.",
  },
  {
    title: "Atomic repayment transactions",
    detail:
      "Payment creation and remaining balance updates commit together, verifying loan status and rejecting amounts above the open balance.",
  },
  {
    title: "Protected sessions and salted hashes",
    detail:
      "Lender sessions use HTTP only cookies with SameSite Lax protection. Collector passwords are stored as salted scrypt hashes.",
  },
];

export function LandingPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <div className="marketing-page min-h-screen bg-white text-[#111827]">
      <a
        className="button-sm sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-[#0b2848] focus:px-4 focus:py-3 focus:text-white"
        href="#main-content"
      >
        Skip to main content
      </a>

      <LandingNavbar />

      <main id="main-content">
        {/* Hero */}
        <section className="mx-auto w-full max-w-7xl px-4 pb-16 pt-12 sm:px-8 sm:pb-20 sm:pt-16 lg:px-12 lg:pt-20">
          <div className="mx-auto max-w-[760px] text-center">
            <span className="inline-flex min-h-9 items-center rounded-full border border-[#e3e8ef] bg-white px-4 text-sm font-medium text-[#56647b] shadow-sm">
              A workspace for everyday lending
            </span>
            <h1 className="mt-6 text-4xl font-semibold tracking-[-0.045em] text-[#0b1850] [text-wrap:balance] sm:text-5xl lg:text-6xl">
              Every loan. Every collection.
              <br className="hidden sm:block" /> One clear view.
            </h1>
            <p className="mx-auto mt-5 max-w-[640px] text-base leading-7 text-[#586579] [text-wrap:pretty] sm:text-lg">
              Keep borrowers, loan balances, and field payments together. Give
              collectors a simple QR workflow while you follow each day from
              your own lender workspace.
            </p>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link
                className="button-md inline-flex min-h-12 items-center justify-center rounded-full bg-[#3156ee] px-7 py-2 text-white shadow-[0_10px_22px_rgba(49,86,238,0.2)] transition-[background-color,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[#2445d4] active:scale-[0.98]"
                href="/auth/register"
              >
                Request lender access
              </Link>
              <Link
                className="button-md inline-flex min-h-12 items-center justify-center rounded-full border border-[#d8deea] bg-white px-6 py-2 text-[#17233a] transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[#f7f8fc]"
                href="/auth/login"
              >
                Lender sign in
              </Link>
            </div>

            <p className="mt-4 text-sm text-[#657286]">
              Access requests are reviewed before a lender account is activated.
            </p>
          </div>

          <div className="relative mx-auto mt-12 max-w-[1100px] lg:mt-16">
            <div className="absolute -left-4 top-12 z-10 hidden rounded-2xl bg-[#101827] px-5 py-4 text-white shadow-xl lg:block">
              <p className="text-xl font-semibold">QR collections</p>
              <p className="mt-1 max-w-40 text-sm text-[#cfd8e5]">Record payments in the field</p>
            </div>
            <div className="absolute -right-5 top-20 z-10 hidden rounded-2xl bg-white px-5 py-4 shadow-[0_12px_36px_rgba(15,23,42,0.16)] lg:block">
              <p className="text-xl font-semibold text-[#101827]">Loan balances</p>
              <p className="mt-1 max-w-40 text-sm text-[#657286]">See what remains, clearly</p>
            </div>
            <div className="rounded-[2rem] bg-[#e8edff] p-3 shadow-[0_20px_55px_rgba(26,45,99,0.12)] sm:p-5 lg:px-12 lg:py-9">
              <InteractiveWorkspacePreview />
            </div>
            <div className="absolute -bottom-5 left-10 z-10 hidden rounded-2xl bg-white px-5 py-4 shadow-[0_12px_36px_rgba(15,23,42,0.14)] lg:block">
              <p className="text-xl font-semibold text-[#101827]">Daily overview</p>
              <p className="mt-1 max-w-40 text-sm text-[#657286]">Review collections together</p>
            </div>
          </div>
          <p className="mt-7 text-center text-sm text-[#657286]">Interactive product illustration with sample records, not live customer data.</p>
        </section>

        {/* Problem to solution */}
        <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <ScrollReveal>
            <div className="max-w-[680px]">
              <h2 className="heading-3 text-[var(--foreground)]">
                Replace scattered spreadsheets and manual nightly tallying
              </h2>
              <p className="body-3 mt-4 text-[var(--mp-muted)]">
                Small lending teams lose hours reconciling cash collected in the
                field against office records. MortgagePro connects both sides
                directly.
              </p>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <article className="rounded-2xl border border-[var(--mp-border)] bg-[var(--mp-surface)] p-6 sm:p-8">
                <h3 className="title-1 text-[var(--foreground)]">
                  Manual spreadsheets and chat receipts
                </h3>
                <ul className="mt-6 space-y-4">
                  {COMPARISON_BEFORE.map((item) => (
                    <li
                      className="body-6 flex items-start gap-3 text-[var(--mp-muted)]"
                      key={item}
                    >
                      <span
                        aria-hidden="true"
                        className="mt-2 size-2 shrink-0 rounded-full bg-[var(--mp-muted)]/60"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>

              <article className="rounded-2xl border border-[#1d3b5c] bg-[#0b2848] p-6 text-white sm:p-8">
                <h3 className="title-1 text-white">
                  With MortgagePro ledger and scanner
                </h3>
                <ul className="mt-6 space-y-4">
                  {COMPARISON_AFTER.map((item) => (
                    <li
                      className="body-6 flex items-start gap-3 text-[#d5dfeb]"
                      key={item}
                    >
                      <span
                        aria-hidden="true"
                        className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-white/15 text-[#9ed2ff]"
                      >
                        <Check size={13} />
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            </div>
          </ScrollReveal>
        </section>

        {/* Capabilities */}
        <section
          className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16"
          id="capabilities"
        >
          <ScrollReveal>
            <div className="max-w-[680px]">
              <h2 className="heading-3 text-[var(--foreground)]">
                Built around the four jobs a lending desk runs every day
              </h2>
              <p className="body-3 mt-4 text-[var(--mp-muted)]">
                Every route in MortgagePro maps to an operational task rather
                than bloated reporting menus.
              </p>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-12">
              <article className="rounded-2xl border border-[var(--mp-border)] bg-[var(--mp-surface)] p-6 sm:p-8 lg:col-span-7">
                <div className="flex size-10 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-[var(--mp-surface-muted)] text-[var(--mp-primary)]">
                  <QrCode aria-hidden="true" size={20} />
                </div>
                <h3 className="heading-5 mt-6 text-[var(--foreground)]">
                  QR field collection with atomic balance updates
                </h3>
                <p className="body-3 mt-3 text-[var(--mp-muted)]">
                  Each loan generates a downloadable QR code. Collectors scan
                  the code on their phone camera, inspect the remaining balance,
                  and record the scheduled daily installment or a custom amount
                  without typing loan IDs.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-[var(--mp-border)] bg-[var(--mp-surface-muted)] p-4">
                    <p className="body-4 text-[var(--foreground)]">
                      Duplicate safe retries
                    </p>
                    <p className="caption-2 mt-1 text-[var(--mp-muted)]">
                      Deterministic request IDs keep unstable mobile connections
                      from double posting.
                    </p>
                  </div>
                  <div className="rounded-xl border border-[var(--mp-border)] bg-[var(--mp-surface-muted)] p-4">
                    <p className="body-4 text-[var(--foreground)]">
                      Overpayment rejection
                    </p>
                    <p className="caption-2 mt-1 text-[var(--mp-muted)]">
                      Transactions recheck remaining balance before committing
                      any change.
                    </p>
                  </div>
                </div>
              </article>

              <article className="rounded-2xl border border-[var(--mp-border)] bg-[var(--mp-surface)] p-6 sm:p-8 lg:col-span-5">
                <div className="flex size-10 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-[var(--mp-surface-muted)] text-[var(--mp-primary)]">
                  <FileSpreadsheet aria-hidden="true" size={20} />
                </div>
                <h3 className="heading-5 mt-6 text-[var(--foreground)]">
                  Portfolio visibility and clean CSV exports
                </h3>
                <p className="body-3 mt-3 text-[var(--mp-muted)]">
                  Monitor daily collections, open balances, and overdue loans
                  from the lender dashboard. Export borrower directories and
                  payment histories to CSV whenever your bookkeeper needs a
                  copy.
                </p>
                <ul className="mt-6 space-y-2">
                  <li className="body-6 flex items-center gap-2 text-[var(--foreground)]">
                    <Check
                      aria-hidden="true"
                      className="text-[var(--mp-primary)]"
                      size={16}
                    />
                    Dedicated daily collection breakdown view
                  </li>
                  <li className="body-6 flex items-center gap-2 text-[var(--foreground)]">
                    <Check
                      aria-hidden="true"
                      className="text-[var(--mp-primary)]"
                      size={16}
                    />
                    One click overdue loan drawer with borrower details
                  </li>
                  <li className="body-6 flex items-center gap-2 text-[var(--foreground)]">
                    <Check
                      aria-hidden="true"
                      className="text-[var(--mp-primary)]"
                      size={16}
                    />
                    Formula safe CSV export formatting
                  </li>
                </ul>
              </article>

              <article className="rounded-2xl border border-[var(--mp-border)] bg-[var(--mp-surface)] p-6 sm:p-8 lg:col-span-5">
                <div className="flex size-10 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-[var(--mp-surface-muted)] text-[var(--mp-primary)]">
                  <UsersRound aria-hidden="true" size={20} />
                </div>
                <h3 className="heading-5 mt-6 text-[var(--foreground)]">
                  Separate access for lenders and collectors
                </h3>
                <p className="body-3 mt-3 text-[var(--mp-muted)]">
                  Lenders manage borrowers, issue loans, and review reports from
                  the full portal. Field collectors sign in with lender issued
                  usernames and see only the scanner workflow they need.
                </p>
              </article>

              <article className="rounded-2xl border border-[var(--mp-border)] bg-[var(--mp-surface)] p-6 sm:p-8 lg:col-span-7">
                <div className="flex size-10 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-[var(--mp-surface-muted)] text-[var(--mp-primary)]">
                  <MessageSquareText aria-hidden="true" size={20} />
                </div>
                <h3 className="heading-5 mt-6 text-[var(--foreground)]">
                  Borrower SMS notifications with quota control
                </h3>
                <p className="body-3 mt-3 text-[var(--mp-muted)]">
                  Send borrower updates through TextLK directly from your
                  workspace. Manage lender owned templates, track monthly SMS
                  usage against your quota, request approved sender IDs, and
                  review sanitized delivery logs without exposing borrower phone
                  lists outside your account.
                </p>
              </article>
            </div>
          </ScrollReveal>
        </section>

        {/* Mandatory scroll activated tagline reveal */}
        <TaglineReveal />

        {/* How it works */}
        <section
          className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16"
          id="workflow"
        >
          <ScrollReveal>
            <div className="max-w-[680px]">
              <h2 className="heading-3 text-[var(--foreground)]">
                From workspace request to first field receipt in three steps
              </h2>
              <p className="body-3 mt-4 text-[var(--mp-muted)]">
                Start with your existing borrowers and field staff without
                complex integrations.
              </p>
            </div>

            <ol className="mt-8 grid gap-6 md:grid-cols-3">
              {WORKFLOW_STEPS.map((step) => (
                <li
                  className="rounded-2xl border border-[var(--mp-border)] bg-[var(--mp-surface)] p-6"
                  key={step.number}
                >
                  <span className="caption-3 inline-flex rounded-lg border border-[var(--mp-border)] bg-[var(--mp-surface-muted)] px-3 py-1 font-mono text-[var(--mp-primary)]">
                    Step {step.number}
                  </span>
                  <h3 className="title-1 mt-4 text-[var(--foreground)]">
                    {step.title}
                  </h3>
                  <p className="body-6 mt-2 text-[var(--mp-muted)]">
                    {step.description}
                  </p>
                </li>
              ))}
            </ol>
          </ScrollReveal>
        </section>

        {/* Security & architecture transparency */}
        <section
          className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16"
          id="security"
        >
          <ScrollReveal>
            <div className="rounded-2xl border border-[var(--mp-border)] bg-[var(--mp-surface)] p-6 sm:p-10">
              <div className="max-w-[680px]">
                <div className="inline-flex items-center gap-2 rounded-lg border border-[var(--mp-border)] bg-[var(--mp-surface-muted)] px-3 py-1 text-[var(--foreground)]">
                  <Lock aria-hidden="true" size={14} />
                  <span className="caption-3">Verified security controls</span>
                </div>
                <h2 className="heading-3 mt-4 text-[var(--foreground)]">
                  Designed for strict multi lender separation
                </h2>
                <p className="body-3 mt-3 text-[var(--mp-muted)]">
                  Every safeguard below is implemented and covered by automated
                  tests inside this codebase.
                </p>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {SECURITY_CONTROLS.map((control) => (
                  <div
                    className="rounded-xl border border-[var(--mp-border)] bg-[var(--mp-surface-muted)] p-5"
                    key={control.title}
                  >
                    <div className="flex items-center gap-2 text-[var(--foreground)]">
                      <ShieldCheck
                        aria-hidden="true"
                        className="shrink-0 text-[#166534]"
                        size={18}
                      />
                      <h3 className="title-3">{control.title}</h3>
                    </div>
                    <p className="body-6 mt-2 text-[var(--mp-muted)]">
                      {control.detail}
                    </p>
                  </div>
                ))}
              </div>

              <p className="caption-2 mt-6 text-[var(--mp-muted)]">
                Transparency note: MortgagePro is currently provided as a
                controlled pilot lending workspace. Mandatory MFA, immutable
                payment void reversals, and third party compliance audits are
                planned for future releases.
              </p>
            </div>
          </ScrollReveal>
        </section>

        {/* FAQ */}
        <section
          className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-16"
          id="faq"
        >
          <ScrollReveal>
            <div className="max-w-[680px]">
              <h2 className="heading-3 text-[var(--foreground)]">
                Common questions before requesting access
              </h2>
              <p className="body-3 mt-3 text-[var(--mp-muted)]">
                Clear answers about account approval, collector logins, data
                isolation, and SMS delivery.
              </p>
            </div>

            <div className="mt-8">
              <FaqAccordion items={FAQ_ITEMS} />
            </div>
          </ScrollReveal>
        </section>

        {/* Final CTA */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pb-24">
          <ScrollReveal>
            <div className="rounded-2xl border border-[#1d3b5c] bg-[#0b2848] p-8 text-white sm:p-12">
              <div className="max-w-[680px]">
                <h2 className="heading-3 text-white">
                  Ready to move your lending portfolio into one organized
                  workspace?
                </h2>
                <p className="body-3 mt-4 text-[#d5dfeb]">
                  Request a lender account for your business. There is no
                  automatic billing or card required to submit an access
                  request, and accounts are activated after review.
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <Link
                    className="button-md inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-6 py-2 text-[#0b2848] transition-[background-color,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[#f1f5f9] active:scale-[0.98]"
                    href="/auth/register"
                  >
                    Request lender access
                  </Link>
                  <Link
                    className="button-md inline-flex min-h-12 items-center justify-center rounded-xl border border-white/25 px-5 py-2 text-white transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-white/10"
                    href="/auth/login"
                  >
                    Lender sign in
                  </Link>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </section>
      </main>

      <footer className="border-t border-[var(--mp-border)] bg-[var(--mp-surface)]">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              className="inline-flex min-h-11 items-center gap-2 text-[var(--foreground)]"
              href="/"
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-[#0b2848] text-white">
                <Building2 aria-hidden="true" size={16} />
              </span>
              <span className="title-3 font-semibold">MortgagePro</span>
            </Link>
            <p className="caption-2 mt-2 text-[var(--mp-muted)]">
              Lending operations, field QR collections, and borrower SMS in one
              portal.
            </p>
          </div>

          <nav
            aria-label="Footer navigation"
            className="flex flex-wrap items-center gap-x-6 gap-y-2"
          >
            <Link
              className="caption-1 inline-flex min-h-11 items-center text-[var(--mp-muted)] transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-[var(--foreground)]"
              href="/auth/register"
            >
              Request access
            </Link>
            <Link
              className="caption-1 inline-flex min-h-11 items-center text-[var(--mp-muted)] transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-[var(--foreground)]"
              href="/auth/login"
            >
              Lender sign in
            </Link>
            <Link
              className="caption-1 inline-flex min-h-11 items-center text-[var(--mp-muted)] transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-[var(--foreground)]"
              href="/privacy"
            >
              Privacy
            </Link>
            <Link
              className="caption-1 inline-flex min-h-11 items-center text-[var(--mp-muted)] transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-[var(--foreground)]"
              href="/terms"
            >
              Terms
            </Link>
          </nav>
        </div>
      </footer>

      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        type="application/ld+json"
      />
    </div>
  );
}

