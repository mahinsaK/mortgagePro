# Backend Docs

This folder explains how the backend side of this Next.js app is organized and how it talks to Appwrite.

The project is one Next.js project. Backend code lives under `src/backend`, frontend code lives under `src/frontend`, and route pages live under `src/app`.

## Folder map

```txt
src/backend
  actions/              Server actions used by forms.
  appwrite/             Appwrite server config and SDK client.
  auth/                 Role constants.
  modules/              DTO, controller, service wrappers for each business module.
  services/             Real Appwrite read/query services and shared domain services.
  utils/                Shared backend helpers.
  docs/                 Backend documentation.
```

## Important files

- `src/backend/appwrite/config.ts`
  Reads Appwrite endpoint, project, database, collection IDs, and the server-only
  `APPWRITE_RUNTIME_API_KEY` from env. There is no generic key fallback.
- `src/backend/appwrite/server-client.ts`
  Creates server-side Appwrite clients and exports `Databases`, `Users`, `Account`, `ID`, and `Query` helpers.
- `src/backend/actions/auth-actions.ts`
  Handles login, lender registration, password reset, and logout form submissions.
- `src/app/auth/google/*`
  Starts and completes server-side Google sign-in for existing lenders.
- `src/backend/actions/lending-actions.ts`
  Handles form writes: create borrower, create loan, create collector, update lender.
- `src/backend/services/dashboard-service.ts`
  Reads dashboard stats and dashboard loan search data.
- `src/backend/services/lending-service.ts`
  Reads borrowers, borrower profile, loans, payments, collectors, daily collections, and export data.
- `src/backend/services/lender-service.ts`
  Finds the active lender record from the current Appwrite session.
- `src/backend/services/tenant-data-service.ts`
  Centralizes lender-owned reads and mutations. It always prepends the trusted
  server-derived `lender_id`, overwrites tenant IDs on create, and strips tenant
  ID changes on update.
- `src/backend/services/collector-auth-service.ts`
  Resolves active collectors from signed 12-hour sessions and revalidates the
  collector record for every protected collector operation.
- `src/backend/services/authentication-rate-limit-service.ts`
  Applies shared Appwrite-backed login, OAuth, registration, and password-reset limits.
- `src/backend/services/security-event-service.ts`
  Stores sanitized authentication/security events and emits structured server logs.
- `src/backend/services/search-text-service.ts`
  Builds searchable text for borrowers and loans from borrower name, phone, and address.
- `src/backend/services/qr-code-service.ts`
  Generates QR code images for download from a loan ID.
- `src/backend/modules/sms/service.ts`
  Handles first-phase SMS validation, templates, and provider-backed send results.
- `scripts/create-appwrite-tables-and-attributes.mjs`
  Creates/reconciles the Appwrite database, collections, and attributes using the local setup key.
- `scripts/create-appwrite-indexes.mjs`
  Creates/reconciles collection indexes after attributes are available.
- `scripts/seed-appwrite-demo-data.mjs`
  Seeds demo users, borrowers, collectors, loans, payments, and search text.

## Current backend flow

1. A page in `src/app` calls a backend service function.
2. The backend service calls `getPrimaryLender()`.
3. If a lender exists, the shared tenant data service prepends
   `Query.equal("lender_id", lender.id)` to every lender-owned query.
4. The service returns display-ready rows to the frontend.

For form submissions:

1. A frontend form calls a server action from `src/backend/actions/lending-actions.ts`.
2. The action validates the current lender.
3. The action writes through tenant-aware helpers that derive `lender_id` on
   the server and verify ownership before update/delete.
4. The action revalidates affected pages.

## Auth flow

1. Login creates an Appwrite email/password session, or Google returns a
   one-time token that the callback exchanges for an Appwrite session.
2. The session secret is stored in an HTTP-only cookie.
3. `getPrimaryLender()` reads the current Appwrite user from that cookie.
4. The lender document is loaded with `Query.equal("appwrite_user_id", currentUser.$id)`.
5. Portal routes redirect to `/auth/login` when no active lender session exists.

## Important security note

The critical-release source now uses server-only Appwrite database access,
empty client collection permissions, shared tenant-aware helpers, collector
username login, signed collector sessions, distributed authentication limits,
and sanitized security events. Live Appwrite permission and direct-session
verification passed on July 20, 2026. Preview deployment/configuration smoke
testing remains a merge gate, and the app remains approved for demo/testing
only.

## More docs

- `security-tenant-isolation-assessment.md`: current tenant isolation,
  collector authorization, payment integrity, and enterprise-readiness audit.
- `critical-tenant-isolation-rollout.md`: exact key, migration, permission,
  verification, rotation, and rollback procedure for this release.
- `internal-security-test-report.md`: July 20 internal test scope, evidence,
  findings, limitations, deferred risks, and current merge decision.
- `database-schema.md`: collections, attributes, and indexes.
- `database-queries.md`: every Appwrite query/write currently used by the app.
- `modules/*.md`: module-by-module explanation.
