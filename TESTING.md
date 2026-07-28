# Controlled Pilot Testing

MortgagePro's release gate is designed for a supervised pilot using trial-copy
records. It does not approve the application as the official financial ledger.

## Local release gate

Install dependencies and Playwright browsers once:

```bash
npm ci
npx playwright install chromium firefox webkit
```

Run the repeatable checks:

```bash
npm run test:unit
npm run test:coverage
npm run build
npm run test:e2e:public
npm run test:lighthouse
npm run test:security
```

`npm run test:release` combines lint, TypeScript, unit tests, coverage, build,
Lighthouse, the tracked-file/history secret scan, and the production dependency
audit. Public Playwright tests are separate because their browser binaries must
be installed first.

Coverage gates are 80% statements/lines/functions and 75% branches for the
selected backend test surface. Authentication sessions, collector sessions,
tenant data access, and payment recording have stricter 90% line/function/
statement and 85% branch targets.

## Dedicated Appwrite E2E project

Never point the E2E mutation commands at production. Create a separate Appwrite
project, run the normal table/index/permission setup against it, and deploy a
Vercel preview whose environment points only to that project.

Configure these local variables or equivalent protected GitHub environment
secrets:

```dotenv
E2E_TEST_PROJECT_MARKER="MORTGAGEPRO_DEDICATED_TEST_PROJECT"
E2E_APPWRITE_PROJECT_ID="your_dedicated_test_project_id"
PRODUCTION_APPWRITE_PROJECT_ID="your_production_project_id"
PLAYWRIGHT_BASE_URL="https://your-dedicated-preview.example"

E2E_LENDER_EMAIL="approved-alpha-test-account@example.test"
E2E_LENDER_PASSWORD="test-password"
E2E_SECOND_LENDER_EMAIL="approved-beta-test-account@example.test"
E2E_SECOND_LENDER_PASSWORD="test-password"
E2E_PENDING_LENDER_EMAIL="pending-test-account@example.test"
E2E_PENDING_LENDER_PASSWORD="test-password"
E2E_COLLECTOR_USERNAME="e2ealpha4821"
E2E_COLLECTOR_PASSWORD="test-password"
```

The normal Appwrite endpoint, database, collection IDs, and runtime key must
also point to the test project. The guard refuses mutation unless the marker is
exact, the configured project equals `E2E_APPWRITE_PROJECT_ID`, and it differs
from `PRODUCTION_APPWRITE_PROJECT_ID`.

Run:

```bash
npm run e2e:cleanup
npm run e2e:seed
npm run test:e2e
npm run e2e:cleanup
```

The seed creates two isolated active lenders, one inactive lender, collectors,
borrowers, loans, and one payment. It never prints credentials. Cleanup removes
only the reserved deterministic E2E IDs.

## GitHub Actions

`.github/workflows/pilot-release-gate.yml` runs the quality and public browser
matrix on pushes and pull requests. The dedicated preview job runs only by
manual dispatch with a preview URL and secrets stored in the protected
`pilot-test` GitHub environment.

Do not expose Appwrite keys to pull requests from forks. Keep the setup key out
of GitHub and Vercel; the E2E utilities require only the dedicated runtime key.

## Manual provider and device evidence

Complete these once on the dedicated preview before pilot approval:

- [ ] Active test lender signs in with Google.
- [ ] Inactive test lender is rejected by Google and receives no app session.
- [ ] Password-reset email arrives and the reset completes.
- [ ] One SMS reaches the approved test phone number.
- [ ] An iPhone scans a generated QR inside the collector scanner.
- [ ] Scheduled and custom payment controls remain scrollable with the number
      keyboard open.
- [ ] A duplicate payment is rejected or returned as the existing payment.
- [ ] An overpayment is rejected without changing the loan balance.

Record only dates, pass/fail outcomes, browser/device versions, and sanitized
screenshots. Never record tokens, cookies, credentials, raw phone numbers, or
API keys.

## Release decision

Approval requires all automated checks, the dedicated two-tenant suite, and
every manual item above to pass three consecutive critical-flow runs. Critical
or High production findings and failed core journeys block release. Medium/Low
findings need an owner and accepted follow-up.

Authentication rate limiting, active security-event writes, exact minor-unit
money storage, auditable payment voids, backups/restore drills, MFA, external
penetration testing, and compliance certification remain deferred. This limits
approval to supervised trial-copy use.
