# MortgagePro Security

MortgagePro is designed with practical security controls for a multi-lender
application. This document summarizes the public security architecture and its
current limitations without publishing internal attack paths, deployment
evidence, or remediation procedures.

## Security Architecture

### Server-only database access

Application data is accessed through server-side Appwrite clients. Collections
are provisioned with empty client permissions, so a normal browser session
cannot directly read or modify database documents. Runtime and setup
credentials are separate, server-only secrets and are never exposed through
`NEXT_PUBLIC_*` variables.

### Tenant isolation

The lender identity is derived from the authenticated server session rather
than browser-submitted values. Shared tenant-aware data helpers scope borrower,
collector, loan, and payment operations to that lender. Ownership-sensitive
lookups use the lender boundary and return a generic not-found result for
records outside it.

Collector loan lookup and payment collection also verify that the collector
and loan belong to the same lender. QR payloads identify a loan but do not
bypass authorization.

### Session handling

Lender sessions use Appwrite authentication and protected HTTP-only cookies.
Collector sessions are signed on the server and are revalidated against the
active collector record. Production cookies use the secure flag and
`SameSite=Lax` protection. Account suspension, collector password changes, and
session-version changes invalidate affected access.

Google lender sign-in uses a short-lived state cookie and fixed callback origin
to protect the OAuth flow. It connects only to an existing active lender
account; it does not automatically create lender access.

### Password hashing

Appwrite manages lender passwords. Collector passwords are stored as salted
`scrypt` hashes and compared using timing-safe operations. Plain-text passwords
are not stored in collector records.

### Transaction integrity

Payment creation and the corresponding loan-balance update are staged and
committed in one Appwrite transaction. The payment service rechecks ownership,
loan status, and the latest remaining balance inside the transaction, rejects
overpayments, and retries bounded transaction conflicts.

### Idempotency

Payment submissions use a validated request identifier to derive a
deterministic payment document ID. Repeating the same submission returns the
existing result rather than creating a second payment or balance change.

### Security testing

The repository includes automated coverage for authentication lifecycle,
collector-session validation, tenant ownership, cross-tenant denial, QR access,
payment transactions, duplicate prevention, overpayment protection, and CSV
formula neutralization. Release checks also include TypeScript, lint, unit and
browser tests, accessibility checks, dependency auditing, tracked-file/history
secret scanning, and guarded Appwrite permission/isolation verification.

## Known Limitations

- Mandatory MFA and step-up authentication are planned but not implemented.
- Monetary values still require migration to exact minor-unit integer storage.
- Payment correction still requires an immutable, auditable void/reversal
  workflow instead of hard deletion.
- Database-backed login rate limiting and security-event persistence exist but
  are disabled by default while operational cost is evaluated.
- Backup restoration drills, external alerting, independent penetration
  testing, and jurisdiction-specific compliance review remain outstanding.

These limitations mean the project should be evaluated as a controlled
pilot/demo application, not as an enterprise certification or authoritative
financial ledger.

## Reporting a Security Issue

Please report suspected security issues privately to the repository owner. Do
not include credentials, borrower information, exploit details, or other
sensitive evidence in a public issue. Allow time for investigation and a
coordinated fix before public disclosure.
