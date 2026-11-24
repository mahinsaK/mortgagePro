import Link from "next/link";
import {
  Building2,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { CapabilityExplorer } from "@/features/marketing/components/capability-explorer";
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
      "The app checks each payment request before recording it. Repeating the same request does not create a second payment, and an amount above the remaining loan balance is rejected. The payment and balance update are saved together.",
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

const COMPARISON = [
  {
    before: "Loan balances in separate spreadsheets",
    after: "Borrowers, loans, and balances in one workspace",
  },
  {
    before: "Field payments confirmed through chat",
    after: "QR scans record payments against the loan",
  },
  {
    before: "A manual tally at the end of each day",
    after: "A daily view of payments recorded in MortgagePro",
  },
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
    title: "Records stay behind the app",
    detail:
      "The browser cannot read database collections directly. Requests pass through application server checks.",
  },
  {
    title: "Each lender sees their own records",
    detail:
      "Borrower, loan, collector, and payment lookups are checked against the signed in lender account.",
  },
  {
    title: "Payments and balances move together",
    detail:
      "A payment and its loan balance change are saved in one transaction, with checks against overpayment.",
  },
  {
    title: "Protected sign in",
    detail:
      "Lender sessions use protected browser cookies. Collector passwords are stored as salted hashes, not plain text.",
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
            <div className="rounded-[2rem] bg-[#e8edff] p-3 shadow-[0_20px_55px_rgba(26,45,99,0.12)] sm:p-5 lg:px-12 lg:py-9">
              <InteractiveWorkspacePreview />
            </div>
          </div>
          <p className="mt-7 text-center text-sm text-[#657286]">Interactive product illustration with sample records, not live customer data.</p>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <ScrollReveal>
            <div className="grid gap-10 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:gap-16">
              <div className="max-w-[380px]">
                <h2 className="heading-3 text-[#17233a] [text-wrap:balance]">
                  Less chasing. More clarity at the end of the day.
                </h2>
                <p className="body-3 mt-4 text-[#657286] [text-wrap:pretty]">
                  MortgagePro connects the lender desk with payments recorded in
                  the field, so the next step is easier to see.
                </p>
              </div>

              <div className="border-t border-[#dce4f1]">
                {COMPARISON.map((item) => (
                  <div
                    className="grid gap-3 border-b border-[#dce4f1] py-6 sm:grid-cols-2 sm:gap-8"
                    key={item.before}
                  >
                    <div>
                      <p className="caption-3 text-[#657286]">Before</p>
                      <p className="body-3 mt-2 text-[#657286]">{item.before}</p>
                    </div>
                    <div>
                      <p className="caption-3 text-[#3156ee]">With MortgagePro</p>
                      <p className="body-2 mt-2 text-[#17233a]">{item.after}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </section>

        <CapabilityExplorer />

        {/* Mandatory scroll activated tagline reveal */}
        <TaglineReveal />

        {/* How it works */}
        <section
          className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20"
          id="workflow"
        >
          <ScrollReveal>
            <div className="max-w-[680px]">
              <h2 className="heading-3 text-[#17233a] [text-wrap:balance]">
                From account request to the first field payment.
              </h2>
              <p className="body-3 mt-4 text-[#657286] [text-wrap:pretty]">
                Three practical steps connect the lender desk and collector phone.
              </p>
            </div>

            <ol className="mt-10 grid gap-8 md:grid-cols-3 md:gap-10">
              {WORKFLOW_STEPS.map((step) => (
                <li
                  className="border-t-2 border-[#dce4f1] pt-5"
                  key={step.number}
                >
                  <span className="title-1 text-[#3156ee]">
                    {step.number}
                  </span>
                  <h3 className="title-1 mt-5 text-[#17233a]">
                    {step.title}
                  </h3>
                  <p className="body-6 mt-2 text-[#657286] [text-wrap:pretty]">
                    {step.description}
                  </p>
                </li>
              ))}
            </ol>
          </ScrollReveal>
        </section>

        {/* Security & architecture transparency */}
        <section
          className="bg-[#0b2848] px-4 py-16 text-white sm:px-6 sm:py-20"
          id="security"
        >
          <div className="mx-auto w-full max-w-6xl">
            <ScrollReveal>
              <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
                <div className="max-w-[420px]">
                  <div className="inline-flex size-10 items-center justify-center rounded-xl bg-white/10 text-[#b9d4ff]">
                    <Lock aria-hidden="true" size={19} />
                  </div>
                  <h2 className="heading-3 mt-5 text-white [text-wrap:balance]">
                    Your workspace stays yours.
                  </h2>
                  <p className="body-3 mt-4 text-[#d5dfeb] [text-wrap:pretty]">
                    Lenders and collectors have separate access. The app checks
                    which records belong to your workspace before showing them.
                  </p>
                </div>

                <div className="border-t border-white/20">
                  {SECURITY_CONTROLS.map((control) => (
                    <div className="flex gap-4 border-b border-white/20 py-5" key={control.title}>
                      <ShieldCheck
                        aria-hidden="true"
                        className="mt-0.5 shrink-0 text-[#a9c7ff]"
                        size={19}
                      />
                      <div>
                        <h3 className="title-3 text-white">{control.title}</h3>
                        <p className="body-6 mt-1 text-[#d5dfeb]">{control.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <p className="caption-2 mt-10 max-w-[760px] text-[#c7d5e7]">
                MortgagePro is currently a controlled pilot workspace. MFA,
                auditable payment reversals, and independent compliance review
                remain planned work.
              </p>
            </ScrollReveal>
          </div>
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

