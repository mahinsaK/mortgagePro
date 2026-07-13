# Critical Tenant-Isolation Rollout

Implementation branch: `security/critical-tenant-isolation`

This guide deploys the critical tenant-isolation release. It does not claim
that the deferred financial-ledger and enterprise-operations work is complete.
Keep the security assessment private until the live permission denial tests
pass.

## Before starting

- Schedule a short maintenance window.
- Confirm the current Appwrite data is still demo-only.
- Keep the previous Appwrite API key active until the final verification step.
- Do not put the setup key in Vercel, any `NEXT_PUBLIC_*` variable, logs, chat,
  or source control.
- Do not restore `Role.users()` collection permissions as a rollback.

## 1. Create least-privilege Appwrite keys

Create two new keys in the Appwrite Console.

Runtime key, stored as `APPWRITE_RUNTIME_API_KEY` locally and in Vercel:

- `users.read`
- `users.write`
- `sessions.write`
- `documents.read`
- `documents.write`

Setup key, stored as `APPWRITE_SETUP_API_KEY` locally only:

- database read/write administration
- collection read/write administration
- attribute read/write administration
- index read/write administration
- document read/write administration
- user read/write administration

In Appwrite scope names, enable the corresponding `databases.*`,
`collections.*`, `attributes.*`, `indexes.*`, `documents.*`, and `users.*`
administration scopes available in the console. The setup key is intentionally
broader because it provisions and verifies schema. It must not be available to
the deployed application.

Remove any old generic `API_KEY` or `APPWRITE_API_KEY` variable after rollout.
The hardened code does not use those fallback names.

## 2. Generate the collector session secret

Generate a dedicated random 32-byte secret:

```bash
openssl rand -base64 32
```

Store it as `COLLECTOR_SESSION_SECRET` locally and in every Vercel environment
that runs the app. Do not reuse an Appwrite key, project ID, password, or public
identifier. Changing this secret invalidates all collector sessions.

## 3. Prepare local and Vercel configuration

Local `.env.local` must contain:

```txt
APPWRITE_RUNTIME_API_KEY=...
APPWRITE_SETUP_API_KEY=...
COLLECTOR_SESSION_SECRET=...
```

Vercel must contain only:

```txt
APPWRITE_RUNTIME_API_KEY=...
COLLECTOR_SESSION_SECRET=...
```

Keep all existing `NEXT_PUBLIC_APPWRITE_*` identifiers unchanged unless the
Appwrite project itself changed. Confirm no secret uses a `NEXT_PUBLIC_*` name.

## 4. Deploy the hardened application

Deploy this branch with the new runtime key and collector secret. Keep the old
Appwrite key active but unused during verification. Smoke-test lender login,
dashboard loading, and collector login by username.

The deployed app must not use the setup key.

## 5. Capture the pre-change permission state

Run:

```bash
npm run appwrite:permissions:check
```

Before remediation, this command is expected to return a non-zero exit status
and show non-empty permission arrays. It prints only collection IDs and
permission metadata. Save the output in the private remediation evidence.

## 6. Apply deny-by-default permissions

Run:

```bash
npm run appwrite:permissions:apply
```

The command:

1. stores the prior metadata under ignored `.security-backups/` with restrictive
   file permissions;
2. applies empty collection permissions;
3. sets `documentSecurity: false` and keeps each collection enabled; and
4. re-reads all five collections and fails if any remains noncompliant.

Run the check again:

```bash
npm run appwrite:permissions:check
```

All five collections must show empty permissions, disabled document security,
enabled state, and `compliant: true`.

## 7. Run direct-client and runtime verification

Set dedicated demo credentials if the seeded defaults are not being used:

```txt
ISOLATION_TEST_LENDER_EMAIL=...
ISOLATION_TEST_LENDER_PASSWORD=...
```

Then run:

```bash
npm run appwrite:isolation:verify
```

The verifier creates uniquely named throwaway records, proves a normal
Appwrite user session cannot list, create, update, or delete documents in any
of the five collections, proves the runtime key can perform document CRUD, and
cleans up in a `finally` block. It prints collection IDs/operation results, not
records, passwords, session secrets, or API keys.

Do not continue if any normal-session operation succeeds.

## 8. Run two-tenant application smoke tests

Using lender A, lender B, collector A, and collector B demo records, verify:

- lender A cannot open, export, update, delete, or download a QR code for
  lender B's borrower, collector, loan, or payment IDs;
- cross-tenant resource IDs behave as not found and do not reveal existence;
- collector A receives `404` when scanning lender B's loan ID;
- collector A cannot create a payment for lender B's loan;
- collector login accepts the copied username, not the collector name;
- changing a collector password invalidates its existing cookie;
- changing a collector to inactive invalidates its existing cookie; and
- deleted, expired, or tampered collector cookies cannot view or collect.

Also run:

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

## 9. Retire the previous key

Only after all checks pass:

1. rotate or revoke the previous generic Appwrite API key;
2. remove `API_KEY` and `APPWRITE_API_KEY` from local/Vercel environments;
3. confirm the app still works using only `APPWRITE_RUNTIME_API_KEY`;
4. retain `APPWRITE_SETUP_API_KEY` locally in an approved secret store; and
5. update the private assessment with dates, command results, deployment ID,
   Appwrite project ID, and reviewer sign-off.

## Rollback

Rollback the application or its server configuration without reopening client
database access.

- Redeploy the prior application build if needed.
- If its key wiring is incompatible, temporarily place the retained previous
  server key value in `APPWRITE_RUNTIME_API_KEY` while correcting the deploy.
- Keep all collection permissions empty.
- Reset/reseed demo data if schema or smoke tests reveal inconsistent records.

Never restore `Role.users()` database access to make a rollback build work.

## Remaining non-critical-release blockers

Even after this rollout passes, the application is not enterprise-ready until
the deferred roadmap is completed: exact minor-unit money storage,
transactional/idempotent payments, overpayment rejection, auditable voids,
financial-history retention, rate limiting, MFA/step-up controls, CSP/security
headers, monitoring, backup/restore drills, incident response, penetration
testing, and applicable compliance review.
