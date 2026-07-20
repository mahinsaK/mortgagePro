# Internal Security Test Report

Test date: July 20, 2026  
Branch: `security/critical-tenant-isolation`  
Tested commit: `3d04c7c`  
Release scope: controlled demo/testing only

## Status

**Conditional / merge gate not yet complete.** Source, live Appwrite isolation,
runtime-key access, local rate limiting, monitoring persistence, dependency
audit, secret scan, lint, TypeScript, tests, and production build were tested.
The Vercel preview security smoke test and visual browser smoke test remain
pending.

This is an internal engineering security test. It is **not** an independent
penetration test, compliance certification, legal review, or approval to store
real borrower, identity, or financial data.

## Authorized scope

- Local source and test suite in this repository.
- The configured Appwrite project using demo accounts and throwaway records.
- Low-volume localhost authentication probes using reserved documentation IP
  addresses supplied in request headers.
- Authentication/session handling, tenant IDOR resistance, direct Appwrite
  access, collector QR lookup, exports, payment integrity, rate-limit
  concurrency, malformed input handling, and secret leakage.

No destructive production testing, denial-of-service testing, credential
stuffing, external-user data, or third-party systems were targeted.

## Evidence and results

### Live Appwrite boundary

`npm run appwrite:tables` and `npm run appwrite:indexes` created the
`auth_rate_limits` and `security_events` collections and their indexes. The
same setup reconciled the existing five collections to the server-only model.

`npm run appwrite:permissions:check` passed for all seven collections:

| Collection | Client permissions | Document security | Enabled | Result |
| --- | --- | --- | --- | --- |
| lenders | empty | false | true | Pass |
| borrowers | empty | false | true | Pass |
| collectors | empty | false | true | Pass |
| loans | empty | false | true | Pass |
| payments | empty | false | true | Pass |
| auth_rate_limits | empty | false | true | Pass |
| security_events | empty | false | true | Pass |

`npm run appwrite:isolation:verify` then used a normal demo lender session and
throwaway records. List, create, update, and delete were denied on every
collection: 28 denial checks passed. The runtime key created and updated a
throwaway record in every collection, and cleanup completed.

The verifier initially exposed an Appwrite SSR compatibility issue because its
login client lacked the runtime key needed to receive the server session
secret. Commit `8c7d9a8` corrected it and the full verifier passed.

Limitation: the table reconciliation hardened the collections before this
run's permission-check command, so this run has post-change metadata rather
than a fresh pre-change snapshot. The July 10 assessment preserves the earlier
observation of broad `Role.users()` access.

### Authentication rate limiting and monitoring

Local HTTP probes used a temporary, non-persisted monitoring secret and the
live Appwrite security collections:

- 30 Google OAuth start requests for one test IP were accepted.
- The 31st request was blocked.
- Three simultaneous requests for a second test IP all succeeded and updated
  the shared counter without an unavailable response.
- The aggregate report showed 30 starts and blocked events without identities
  or IP hashes.
- The retention cleanup command completed successfully and found no expired
  records.

The first smoke attempt found that Appwrite rejects transaction TTL values
below 60 seconds. Both the authentication limiter and payment transaction code
used 30 seconds. Commit `542f4f9` changed every transaction to 60 seconds and
added regression assertions. The corrected live probes passed.

The initial failed smoke events remain sanitized demo evidence and will expire
under the documented 90-day event retention. Their rate-limit state uses
reserved test IPs and expires under the 7-day cleanup policy.

Stable `SECURITY_MONITORING_SECRET` configuration is still required locally and
in Vercel. Authentication intentionally fails closed when this secret or the
rate-limit store is unavailable; monitoring writes remain best effort.

### Automated security coverage

The complete test suite passed: 35 files and 134 tests. Focused security tests
also passed for:

- mandatory lender ownership on borrower, collector, loan, and payment reads;
- prevention of cross-tenant update and delete by resource ID;
- tenant ID overwrite/stripping on create and update;
- collector QR lookup returning `404` for another lender's loan;
- loan-payment export returning `404` for another lender's loan;
- lender session states for anonymous, valid, invalid, and unavailable;
- stale-cookie cleanup without a render-time mutation loop;
- collector session tampering, expiry, deletion, inactivity, password change,
  and lender mismatch;
- Google state mismatch, replayed/rejected callback, unknown lender, session
  cleanup, fixed callback origins, and protected state cookies;
- hashed rate-limit subjects, threshold blocking, transaction-conflict retry,
  successful identity-counter cleanup, and fail-closed behavior;
- atomic payment/balance writes, deterministic duplicate prevention,
  overpayment rejection, rollback, and conflict retry; and
- security-event hashing, metadata filtering, non-blocking persistence failure,
  and missing-secret behavior.

### Static authorization review

Direct business-data Appwrite calls were reviewed. Tenant-owned normal reads
and mutations route through the tenant data service or include explicit
`lender_id` constraints inside payment transactions. Remaining direct calls
are limited to lender-profile resolution, global collector username/login
lookups, authentication security collections, and authenticated lender profile
updates.

Exports resolve the lender from the protected server session and retrieve data
through tenant-aware services. Cross-tenant loan-payment export behavior is
covered by a `404` test. Date inputs reject malformed formats with `400`.
Spreadsheet formula prefixes in exported values are neutralized before CSV
quoting; commit `3d04c7c` added the shared sanitizer and regression tests.

### Secret leakage review

A tracked-file scan covered 203 files and known private-key/provider-token
patterns. No real key prefix or private key was found. Two test files matched
high-entropy `secret`/`token` assignments; inspection confirmed they are fixed
test fixtures. A history search for common secret prefixes and private-key
headers returned no commit.

Tests confirm OAuth callback/session values do not appear in the final browser
URL. Structured security logs contain event type, outcome, principal type,
request ID, reason, and timestamp only. They do not contain the raw principal,
IP, password, API key, OAuth token, or session secret.

### Build and dependency checks

- ESLint: Pass.
- TypeScript `npx tsc --noEmit`: Pass.
- Vitest: Pass, 134/134.
- Next.js production build: Pass.
- `npm audit --omit=dev --audit-level=high`: no Critical or High advisory;
  two Moderate findings represent the same bundled PostCSS advisory through
  Next.js.

## Findings

### Critical and High

No unresolved Critical or High finding was identified within the completed
scope. This statement does not include the untested Vercel preview gate or an
independent penetration test.

### Moderate: bundled PostCSS advisory

`npm audit` reports GHSA-qx2v-qp2m-jg93 in the PostCSS version bundled by the
installed Next.js release. The suggested forced resolution would install an
unrelated breaking Next.js version, so it was not applied automatically.

Disposition: accept only for controlled demo/testing, monitor the stable
Next.js release line, and upgrade when a compatible patched release is
available. Re-run the audit before every release.

### Merge-gate blocker: preview configuration and smoke test

After the successful live probes, the owner chose to freeze authentication rate
limiting and security-event execution to avoid Appwrite operation costs.
`AUTH_SECURITY_CONTROLS_ENABLED` now defaults to `false`. While frozen, both
services return before any security-collection read, write, or structured event
log. The implementation, collections, scripts, and historical evidence remain
available for later reactivation.

This changes the release posture: active application-level login rate limiting
and security monitoring are deferred controls, not current protections.

Remaining preview checks before merge:

1. Keep `AUTH_SECURITY_CONTROLS_ENABLED=false` in the preview and production
   environments, or leave it unset because false is the default.
2. Redeploy `security/critical-tenant-isolation`.
3. Smoke-test lender login, collector login, Google OAuth start/cancel, stale
   session recovery, QR cross-tenant `404`, one valid payment, one duplicate
   retry, and one overpayment rejection.

### Test limitation: no connected visual browser

No in-app browser was available during this run. Route behavior was tested by
unit tests and low-volume localhost HTTP requests, but responsive UI/login and
cookie behavior must receive a manual or connected-browser smoke pass on the
preview deployment.

## Explicitly deferred and accepted only for demo/testing

The requested plan defers these controls:

- exact minor-unit/decimal money storage;
- auditable payment void/correction instead of hard deletion;
- MFA and step-up authentication;
- active application-level authentication rate limiting;
- active security-event monitoring;
- external alerts and a staffed incident-response process;
- backup/restore and disaster-recovery drills;
- full financial mutation audit history;
- CSP/security-header hardening;
- an independent penetration test; and
- jurisdiction-specific privacy, financial, and compliance review.

These deferred risks prevent approval for real customers or enterprise
financial operation even if the remaining preview merge gate passes.

## Merge decision

**Do not merge yet.** Live Appwrite tenant isolation has passed and no
completed-scope Critical/High finding remains, but the preview deployment smoke
test and visual browser smoke test are outstanding. Rate limiting and security
events are explicitly deferred while the cost-control freeze is active.
After those checks pass and the Moderate/deferred risks are explicitly accepted
for controlled demo/testing, recheck branch ancestry, fast-forward `main`, and
rerun the complete verification suite on `main`.
