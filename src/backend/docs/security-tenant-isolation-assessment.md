# Tenant Isolation, Collector Authorization, and Enterprise Readiness

Assessment date: July 10, 2026  
Remediation implementation update: July 11, 2026

Status: **Critical remediation is implemented on
`security/critical-tenant-isolation`, but live Appwrite enforcement and rollout
verification are still pending. The app is not approved for enterprise or real
financial/PII production use.**

> Security-sensitive document: do not publish this assessment in a public
> repository or share it outside the remediation team until the live
> `TENANT-001` permission change and direct-client denial tests are complete.
> The historical baseline below describes a practical bypass path that was
> confirmed in the last observed live configuration.

## Executive verdict

The source branch now implements the selected critical release: deny-by-default
collection provisioning/reconciliation, separate runtime and setup keys,
shared tenant-aware data helpers, generic not-found behavior for cross-tenant
IDs, collector ID login, dedicated 12-hour signed sessions, database-backed
session revocation, and focused security verification.

That is a material improvement in the code, but it does not by itself change
the live Appwrite project. The last read-only live metadata inspection on July
10 confirmed all five collections granted `Role.users()` read/create/update/
delete access with document security disabled. No live permission apply or
post-change direct-client test has been performed in this implementation
session. Until the guided rollout passes, the deployed database boundary must
still be treated as critically vulnerable.

Even after the critical rollout, deferred financial and operational issues
remain: payment/balance writes are non-transactional and non-idempotent, money
uses floating point, overpayments are accepted, financial history can be hard
deleted, and enterprise monitoring/MFA/backup/compliance controls are absent.

Direct answers:

- **Do lender pages and mutations now share a mandatory tenant boundary?** Yes,
  in this branch for borrowers, collectors, loans, and payments.
- **Is cross-lender separation guaranteed against a malicious authenticated
  Appwrite user in the current live project?** Not until live permissions are
  applied and the direct-session verifier passes.
- **Does the official collector payment action reject another lender's loan?**
  Yes; lookup and collection query by both loan ID and collector lender ID.
- **Are collector cookies short-lived and revocable?** Yes in this branch: 12
  hours, active-record revalidation, and session-version revocation.
- **Can the current overall system be trusted as an enterprise financial
  system?** No.
- **Should real customer or financial data be added before remediation?** No.

## Critical-release implementation evidence

| Control | Source status | Live status |
| --- | --- | --- |
| Empty client collection permissions | Implemented in `0976933` | Pending apply/check |
| Separate runtime/setup Appwrite keys | Implemented in `0976933` | Pending environment/key rollout |
| Shared tenant-aware reads/writes | Implemented in `b9cbf2a` | Pending deployment |
| Collector ID login and copy-ID UI | Implemented in `a7fa177` | Pending deployment |
| 12-hour versioned collector sessions | Implemented in `a7fa177` | Pending secret/schema/deployment |
| Tenant/session automated tests | 52 tests passing in `61e6f08` | Local/mocked coverage complete |
| Direct Appwrite session denial verifier | Implemented in `61e6f08` | Must run after permission apply |
| Additive collector schema migration | Implemented in `76888ba` | Must run before deployment |

The exact deployment, verification, key rotation, and rollback procedure is in
`critical-tenant-isolation-rollout.md`.

The remainder of this document preserves the original July 10 evidence and the
still-relevant deferred findings. Where an original collector or tenant finding
has source remediation, a remediation note now follows it.

## Scope and method

This assessment covered:

- Appwrite server-client construction and environment configuration.
- Lender and collector authentication/session handling.
- Lender-facing queries, exports, API routes, and server actions.
- Collector login, loan lookup, and payment collection.
- Appwrite collection provisioning and permissions.
- Payment consistency, concurrency, and auditability.
- Existing automated authorization tests.
- Production dependency audit output.
- A read-only request to the live Appwrite collection metadata. No customer
  documents or secrets were printed or modified.

This is a source-code and configuration review, not a formal penetration test,
compliance certification, disaster-recovery test, or third-party infrastructure
audit.

## Current architecture and trust boundaries

### Lender identity

The lender flow is:

1. Appwrite Auth creates an email/password session.
2. The session secret is stored in the HTTP-only `mortgagepro_session` cookie.
3. `getCurrentAppwriteUser()` resolves the current Appwrite user.
4. `getPrimaryLender()` selects one active lender whose
   `appwrite_user_id` equals that user's Appwrite ID.
5. Lender-facing services use the returned lender document ID as `lender_id`.

Evidence:

- `src/backend/services/auth-session-service.ts`
- `src/backend/services/lender-service.ts`
- `src/backend/actions/auth-actions.ts`
- `src/app/(portal)/layout.tsx`

The lender cookie uses `httpOnly`, `sameSite: "lax"`, and `secure` in
production. These are appropriate baseline cookie protections.

### Database access

`src/backend/appwrite/server-client.ts` creates a shared server SDK client with
an Appwrite API key. Appwrite server API keys are governed by their scopes and
ignore end-user document permissions. Consequently, every server-side access
must enforce tenant ownership correctly in application code.

The remediated branch routes borrower, collector, loan, and payment operations
through `tenant-data-service.ts`. Its list helper always prepends the trusted
lender filter; creates overwrite any supplied tenant ID; updates strip tenant
ID changes; and updates/deletes verify ownership before mutation. Direct server
SDK exceptions are limited to lender/Auth mapping and pre-authentication
collector-ID lookup.

### Collector identity

Collectors are not Appwrite Auth users. In the remediated branch they
authenticate by globally unique collector document ID plus password. Passwords
are hashed with Node `scrypt` using a random salt. The HMAC-signed HTTP-only
cookie contains issue/expiry/version claims, expires after 12 hours, and is
accepted only after `requireActiveCollectorPrincipal()` reloads the active
collector by both collector and lender ID and matches `session_version`.

Evidence:

- `src/backend/services/collector-auth-service.ts`
- `src/backend/actions/collector-actions.ts`
- `src/app/api/collector/loan/route.ts`

## What currently works in the intended application flow

### Lender reads are usually scoped

The principal lender-facing services first call `getPrimaryLender()` and then
filter lender-owned collections with the active lender ID. Reviewed examples
include:

- Dashboard loans, counts, borrowers, and daily payment totals.
- Borrower lists and borrower profiles.
- Loan lists and loan payment details.
- Payment history, daily collections, and CSV exports.
- Collector lists.
- SMS borrower search and bulk-recipient selection.
- QR-code authorization.

Relevant files:

- `src/backend/services/dashboard-service.ts`
- `src/backend/services/lending-service.ts`
- `src/backend/services/sms-recipient-service.ts`

### Lender writes usually verify ownership

Update and delete actions call `getRequiredLender()` and, for an existing
resource, commonly call `getOwnedDocument(collection, lender.id, documentId)`.
Creation actions set `lender_id` from the authenticated server-side lender
rather than trusting a submitted lender ID.

Relevant file:

- `src/backend/actions/lending-actions.ts`

### Collector payment recording checks lender membership

`collectScannedPaymentAction()` performs these checks before writing:

1. Requires a valid signed collector session.
2. Re-loads the collector by both `collectorId` and session `lenderId`.
3. Requires the collector to still be active.
4. Loads the scanned loan.
5. Compares the loan's `lender_id` with the collector session's `lenderId`.
6. Passes both lender IDs through payment-domain validation.

Under this specific server action, a collector for lender A should not be able
to record a payment for lender B's loan.

There is also one domain test asserting that mismatched lender IDs are rejected:

- `src/backend/modules/payments/__tests__/payments.test.ts`

This is a positive control, but it does not compensate for the database
permission failure or replace an end-to-end two-tenant test.

## Critical finding: live Appwrite permissions defeat tenant isolation

Finding ID: `TENANT-001`

Severity: **Critical**

At the original assessment, the provisioning source defined:

```js
const collectionPermissions = [
  Permission.read(Role.users()),
  Permission.create(Role.users()),
  Permission.update(Role.users()),
  Permission.delete(Role.users()),
];
```

It creates every collection with:

```js
documentSecurity: false
```

Original evidence:

- `scripts/setup-appwrite.mjs`

The July 10 live metadata check confirmed the same state for `lenders`, `borrowers`,
`collectors`, `loans`, and `payments`:

- `read("users")`
- `create("users")`
- `update("users")`
- `delete("users")`
- `documentSecurity: false`

According to Appwrite's permissions documentation, collection-level permission
applies to every document. Document-level permission is only enforced when
document security is enabled. Appwrite also states that server SDK requests
using an API key ignore user permissions.

Official references:

- <https://appwrite.io/docs/products/databases/legacy/permissions>
- <https://appwrite.io/docs/advanced/security/permissions>
- <https://appwrite.io/docs/products/auth/security>
- <https://appwrite.io/docs/advanced/security/api-keys>

### Practical attack path

The Appwrite endpoint, project ID, database ID, and collection IDs are
intentionally public `NEXT_PUBLIC_*` values. They are identifiers, not secrets.
A malicious user does not need the server API key to exploit overly broad
client permissions.

A plausible path is:

1. Obtain any valid Appwrite user session for this project.
2. Call the Appwrite REST API or client SDK directly instead of using the
   MortgagePro UI.
3. List a collection without the application's `lender_id` filter.
4. Read or modify any returned document because `Role.users()` has collection-
   wide CRUD permission.

Consequences include:

- Reading borrowers' names, phone numbers, addresses, and financial records.
- Reading collector password hashes and attempting offline password cracking.
- Reading or changing another lender's loans and payment history.
- Creating forged loans or payments.
- Deleting financial records.
- Modifying a lender profile's `appwrite_user_id`, potentially allowing the
  attacker to make the normal application resolve a victim lender profile.

If anonymous Appwrite sessions or open account creation are enabled in the
project, the pool of possible attackers may be wider. Those console settings
were not assessed here.

### Required immediate correction

Because the current frontend does not require direct database access, the
safest immediate model is server-only database access:

1. Remove collection-level `read`, `update`, and `delete` permissions for
   `Role.users()` from all five collections.
2. Remove client `create` permission as well unless a documented client-side
   flow genuinely needs it.
3. Keep all database operations behind authenticated Next.js routes/actions.
4. Update `scripts/setup-appwrite.mjs`; changing only the live console is not
   enough.
5. Add a migration/reconciliation command. The current `ensureCollection()`
   returns when a collection exists and does not repair existing permissions.
6. Verify the live metadata after deployment.

An alternative defense-in-depth design is Appwrite document security with
per-lender user/team permissions on every document. That is more complex and
must be applied consistently to existing and new documents. Application-layer
`lender_id` checks should remain even after platform permissions are fixed.

### Remediation update

Source remediation is complete in `0976933` and `b9cbf2a`:

- collection permissions are empty and existing collections are reconciled;
- `documentSecurity` remains false because normal sessions receive no database
  access at all;
- `appwrite:permissions:check` is read-only and prints only metadata;
- `appwrite:permissions:apply` backs up, applies, and verifies metadata;
- runtime and setup keys no longer have a generic fallback; and
- tenant-aware helpers cover lender-owned records.

`TENANT-001` remains open for the live project until the apply command and
`appwrite:isolation:verify` both pass and the prior broad key is revoked.

## Collector authorization assessment

### What is enforced

- Password hashes use salted `scrypt` and timing-safe hash comparison.
- Collector cookies are HTTP-only, SameSite Lax, and Secure in production.
- Collector payment recording re-checks that the collector exists, belongs to
  the session lender, and is active.
- The loan lender must equal the collector lender before payment creation.
- The borrower lookup after a scan is filtered by the collector lender ID.

### Gaps

#### `COLLECTOR-001`: login identity is ambiguous

Severity: **High**

Collector login searches globally by `name`, takes at most 20 matches, and then
finds the first password match. It does not ask for a lender identifier.

If two lenders create collectors with the same name and password, login can
resolve the wrong collector. The 20-record limit also makes authentication
behavior dependent on database ordering when names are common.

Required change: use a globally unique collector login ID, or require a lender
code plus collector username. Enforce uniqueness with an index or another
authoritative identity store.

Remediation status: **Implemented in source, pending deployment.** The globally
unique collector username is stored as the collector document `$id`, login no
longer searches by name, and the lender collector table has a dedicated
username column with a copy control. Newly created usernames are validated and
checked for availability; Appwrite's `$id` uniqueness rejects creation races.
Existing legacy collector IDs remain valid usernames.

#### `COLLECTOR-002`: no login rate limiting or lockout

Severity: **High**

No application rate limiter, progressive delay, failed-attempt counter, IP
control, or temporary lockout was found for collector login. The query is made
through the server API-key client, so the application should not assume normal
client API rate limits will protect it.

Required change: implement distributed rate limiting by IP and collector/lender
identifier, alert on abuse, and define lockout/recovery behavior.

#### `COLLECTOR-003`: sessions are long-lived and weakly revocable

Severity: **Medium**

Collector cookies last 30 days. The signed payload has no issued-at time,
explicit expiry, unique session ID, or session version stored server-side.
Changing a collector password does not revoke an already-issued session while
the collector remains active. Deactivation blocks the payment action because it
re-loads the active collector, which is good.

Required change: use a dedicated mandatory `COLLECTOR_SESSION_SECRET`, add
issued-at/expiry/session ID/version claims, store revocable session state, and
invalidate sessions on password or role changes.

The current signing secret falls back from the Appwrite API key to the public
project ID and finally to a hard-coded development value. Production must fail
closed when a dedicated high-entropy session secret is absent.

Remediation status: **Implemented in source, pending deployment.** The cookie
now expires after 12 hours and carries `issuedAt`, `expiresAt`, and
`sessionVersion`. `COLLECTOR_SESSION_SECRET` is mandatory and validated at a
minimum of 32 bytes with no fallback. Password/status changes increment the
collector's database version.

#### `COLLECTOR-004`: read route does not revalidate collector status

Severity: **Medium**

`GET /api/collector/loan` validates the signed cookie and compares the loan's
`lender_id`, but it does not re-load the collector or require it to be active.
An inactive/deleted collector with an old cookie may continue viewing loan
summaries until the cookie expires, although payment recording is blocked.

Required change: centralize collector-principal resolution and revalidate the
collector for every protected collector page, route, and action.

Remediation status: **Implemented in source, pending deployment.** The scan
page, loan route, and payment action use one active-principal resolver. Deleted,
inactive, expired, tampered, tenant-mismatched, and version-mismatched sessions
fail; mutable request contexts clear invalid cookies.

## Payment integrity assessment

### `PAYMENT-001`: payment write and loan totals are not atomic

Severity: **High**

Payment recording currently:

1. Reads the loan's current total.
2. Calculates a new total in application memory.
3. Creates a payment document.
4. Updates the loan document.

These are separate operations. If payment creation succeeds and the loan update
fails, the ledger and loan balance disagree. If two collectors submit at nearly
the same time, both can read the same old total and one update can overwrite the
other.

Appwrite provides transactions and atomic numeric operations specifically for
this class of consistency/concurrency problem:

- <https://appwrite.io/docs/products/databases/transactions>
- <https://appwrite.io/docs/products/databases/atomic-numeric-operations>

Required change: record the payment and update loan totals in one transaction,
handle transaction conflicts, and derive/reconcile totals from the payment
ledger.

### `PAYMENT-002`: duplicate submission protection is absent

Severity: **High**

There is no idempotency key, collection-event ID, device nonce, or uniqueness
constraint to prevent a retry/double tap from creating two payments.

Required change: issue a server-recognized idempotency key per collection
attempt, persist it with a unique constraint/design, and return the original
result for safe retries.

### `PAYMENT-003`: overpayment is accepted

Severity: **Medium**

The payment service allows a payment larger than the remaining balance. It can
store `total_paid` greater than the loan amount while clamping `remaining` to
zero. This behavior is explicitly covered by the current unit test, so it is
present behavior rather than an accidental edge case.

Required change: define the business rule. Reject overpayment, allocate excess
to a credit ledger, or record a controlled adjustment. Do not silently mix
policies.

### `PAYMENT-004`: money is stored and calculated as floating point

Severity: **Medium**

Amounts use Appwrite float fields and JavaScript `Number`. Floating-point
rounding is inappropriate for authoritative financial balances.

Required change: store integer minor units (for example cents) or use a decimal
type with explicit currency precision and rounding policy.

### `PAYMENT-005`: financial history can be hard-deleted

Severity: **High**

Deleting a loan or borrower permanently deletes related payments. There is no
append-only audit trail, reversal record, approval workflow, or immutable event
log. Deleting a collector can also remove the name source used to display old
payments.

Required change: treat recorded payments as immutable ledger entries. Use
reversal/correction entries, retain historical actor snapshots, and restrict
destructive operations through an audited administrative workflow.

## Authentication and session observations

Positive controls:

- Lender authentication is delegated to Appwrite Auth.
- Lender session cookies are HTTP-only, SameSite Lax, and Secure in production.
- Password reset returns the same initial response whether an account exists,
  reducing enumeration.
- `.env.local` and other environment files are excluded from Git; only
  `.env.example` is tracked.

Gaps requiring enterprise hardening:

- No application requirement for lender MFA, verified email, re-authentication
  for destructive actions, or step-up authentication was found.
- No explicit application security headers/CSP configuration was found in
  `next.config.ts`.
- Password-recovery origin construction trusts request host/proxy headers. The
  deployment must guarantee those headers, or the app should use one configured
  canonical public origin.
- API-key scopes and rotation policy were not documented or verified. Grant
  only the minimum scopes needed.
- No centralized security event log, anomaly detection, or alerting was found.

## Authorization test coverage

The remediated local suite has 20 test files and 52 passing tests. New critical
coverage proves:

- all four tenant-owned collection helpers prepend lender ownership;
- creates overwrite caller tenant IDs and updates strip tenant changes;
- cross-tenant IDs cannot reach update/delete SDK calls;
- collector login queries `$id`, not `name`;
- tampered and expired collector cookies fail;
- inactive, deleted, tenant-mismatched, and version-mismatched collectors fail;
- password/status changes increment the revocation version;
- collector A receives not-found and cannot collect lender B's loan; and
- the collector loan API returns `404` for lender B's loan ID.

`appwrite:isolation:verify` adds a live post-deployment test. It uses a normal
Appwrite session to attempt list/create/update/delete on all five collections,
checks runtime-key CRUD, uses only throwaway records, and cleans up. This live
test has not yet run because permission deployment is intentionally left to the
guided rollout.

Still missing from this critical release are real two-tenant end-to-end tests
for every UI/export path and the deferred payment concurrency/transaction tests.

Required test matrix:

1. Create lender A and lender B with borrowers, collectors, loans, and payments.
2. Exercise every lender page, route, export, and server action using A while
   passing B's IDs; require `404`/denial and no mutation.
3. Exercise collector A against loan B for lookup and collection; require
   denial.
4. Deactivate/delete/rotate collector A and verify all old sessions stop working.
5. Use an Appwrite client user session directly and prove collections cannot be
   listed or modified.
6. Submit the same payment idempotency key twice and prove one ledger entry.
7. Submit concurrent payments and verify exact totals with no lost update.
8. Force a mid-transaction failure and prove neither payment nor balance is
   committed.
9. Verify authorization with randomized IDs and malformed payloads.

Run these tests against an isolated Appwrite project in CI, not only mocked SDK
calls.

## Dependency audit snapshot

`npm audit --omit=dev` on July 10, 2026 reported:

- 0 critical vulnerabilities.
- 0 high vulnerabilities.
- 2 moderate vulnerabilities.
- The reported chain is `next` through its bundled `postcss`, associated with
  `GHSA-qx2v-qp2m-jg93`.

The npm suggested fix metadata points to an inappropriate major downgrade and
must not be applied blindly. Track a supported Next.js release containing the
fixed PostCSS version, assess whether untrusted CSS can reach stringification in
this application, and record the remediation decision.

Dependency audit results are time-sensitive and must be rerun in CI.

## Prioritized remediation plan

### P0: immediate containment before adding real data

1. **Live pending:** remove `Role.users()` collection-wide CRUD permissions from
   all five collections.
2. **Source complete:** setup reconciliation plus safe check/apply commands.
3. **Tool complete, live pending:** run normal-session direct CRUD denial tests.
4. **Assumption confirmed:** current records are demo-only; reset/reseed is
   acceptable if rollout validation fails.
5. **Procedure documented, live pending:** create least-privilege runtime/setup
   keys, verify, and revoke the prior broad key.

### P1: required before a controlled pilot

1. **Source complete:** introduce a single tenant-aware data-access layer.
2. **Partially complete:** critical mocked isolation tests and a live direct-
   client verifier exist; exhaustive end-to-end route/export tests remain.
3. **Source complete:** replace collector name-only login with unique collector
   ID login.
4. **Partially complete:** session revocation/versioning is implemented; login
   rate limiting remains deferred.
5. **Source complete:** revalidate the active collector on every protected
   collector route/page/action.
6. Make payment creation and balance update transactional.
7. Add idempotency and a defined overpayment policy.
8. Store money in integer minor units or an exact decimal representation.
9. Replace hard deletion of financial history with reversals and audit events.

### P2: required for an enterprise claim

1. MFA/step-up authentication and privileged administrative roles.
2. Append-only security and financial audit logs with actor, tenant, timestamp,
   request ID, previous value, and reason.
3. Centralized monitoring, abuse detection, and incident alerting.
4. Security headers/CSP, canonical origin configuration, and automated security
   tests.
5. Backup, restore, retention, disaster-recovery, and reconciliation drills.
6. Key/secret rotation, least-privilege API scopes, and documented access
   reviews.
7. Independent penetration testing and remediation verification.
8. Privacy, financial-record retention, and regulatory review for every target
   jurisdiction.
9. Capacity, pagination, and failure testing beyond the current hard-coded
   5,000-record lookup/cascade limits.
10. A written threat model and release security sign-off process.

## Release gates

The application should not be called enterprise-ready until all of these are
true:

- [ ] Normal Appwrite user sessions have no collection-wide access to tenant
  records. Source is ready; live apply/verification is pending.
- [ ] Two-tenant direct API and application tests pass for all resources.
  Critical unit coverage exists; exhaustive live/end-to-end coverage remains.
- [ ] Collector identities are lender-scoped, rate-limited, and revocable.
  Unique ID and revocation are implemented; rate limiting remains deferred.
- [ ] Disabled collectors cannot view or record any loan data. Source tests
  pass; deployed smoke verification remains.
- [ ] Payments are atomic, idempotent, exact-precision, and concurrency-safe.
- [ ] Payment corrections use auditable reversals instead of deletion.
- [ ] Security events and financial mutations are attributable and monitored.
- [ ] MFA, privileged-action controls, backups, restore tests, and incident
  response are operational.
- [ ] Dependency and penetration-test findings are resolved or formally accepted.
- [ ] A security owner has approved the system for the intended data and risk.

## Final assessment

MortgagePro now has a substantially stronger critical-release source design:
deny-by-default provisioning, server-only credential separation, centralized
tenant helpers, collector ID login, short-lived revocable collector sessions,
and focused isolation verification. The implemented branch is suitable for a
controlled security rollout using demo data.

It is **not currently safe to trust as an enterprise lending/payment system**.
First, the last observed live Appwrite configuration remains a release-blocking
critical issue until the guided permission apply and direct-client verifier
pass. Second, successful critical rollout would still leave the intentionally
deferred financial-ledger and enterprise-operations blockers.

The accurate current label is: **critical isolation code complete; live
remediation pending; enterprise readiness not achieved.** Do not add real
financial or personal data until live isolation evidence is recorded, and do
not make an enterprise claim until transactional/idempotent exact-money
payments, auditable corrections, rate limiting, MFA, monitoring, backups,
incident response, penetration testing, and compliance review are complete.
