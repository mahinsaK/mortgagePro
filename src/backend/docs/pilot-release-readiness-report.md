# Controlled Pilot Release Readiness

Assessment date: July 28, 2026  
Target: supervised pilot using trial-copy records

## Current verdict

**Local automated gate passed; live pilot gate is pending.** The application
must not yet be represented as pilot-approved because the dedicated Appwrite
project, Vercel preview, live provider checks, and physical iPhone scanner check
have not been supplied or completed.

## Completed evidence

- Next.js upgraded to 16.2.12 with patched PostCSS and Sharp overrides.
- Production dependency audit: zero vulnerabilities.
- Tracked-file and Git-history secret scan: pass.
- ESLint, TypeScript, and production build: pass.
- Vitest: 36 files and 164 tests pass.
- Selected backend coverage: 90.90% lines, 93.33% functions, 90.96%
  statements, and 80.61% branches.
- Chromium, Firefox, WebKit, iPhone, and Android public browser matrix: 22
  passed and 3 correctly skipped desktop-only/mobile-only cases.
- Axe WCAG checks: no Critical or Serious violations on lender login,
  registration, or collector login.
- Lighthouse single-run local validation:
  - Lender login: accessibility 1.00, performance 0.98, CLS 0.000.
  - Registration: accessibility 1.00, performance 0.98, CLS 0.000.
  - Collector login: accessibility 1.00, performance 0.99, CLS 0.000.
- The browser suite found and fixed one Serious contrast violation in the
  lender-login separator.
- New lender registration now creates an inactive profile, creates no session,
  cleans up a user after profile failure, and waits for manual Appwrite Console
  activation.
- Unfinished Analytics, Notifications, Borrower dashboard, and Collector
  dashboard routes were removed.

## Pending release blockers

- Provision the dedicated Appwrite E2E project and preview environment.
- Run seed, two-tenant authenticated browser/API tests, and cleanup.
- Run the live Appwrite permission/isolation verifier against the test project.
- Complete Google, password reset, SMS, and physical iPhone checks.
- Run critical browser journeys three consecutive times on the preview.

## Accepted limitations

- Full `npm audit` reports development-only advisories through the compatible
  ESLint/Next lint plugin chain. The shipped production dependency audit is
  clean; forced upgrades currently break the lint runner. Recheck when the
  upstream lint plugins support the patched dependency chain.
- Rate-limit and security-event database operations remain frozen for cost
  control. Public inactive registration can still be abused to create pending
  accounts.
- Money remains floating point, payments can be hard-deleted, and no tested
  backup/restore process exists.
- This is internal engineering evidence, not an independent penetration test,
  compliance certification, or approval for authoritative financial records.
