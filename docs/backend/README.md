# Backend Docs

This folder explains how the backend side of this Next.js app is organized and how it talks to Appwrite.

The project is one Next.js application. `src/app` owns pages and HTTP routes; feature code is grouped in `src/features`. Shared UI is in `src/components`, while shared server infrastructure remains in `src/server`.

## Folder map

```txt
src/app/                 App Router pages, layouts, and route handlers.
src/features/<name>/     Feature-specific components, domain rules, and server actions/services.
src/components/          Shared UI and providers.
src/server/appwrite/     Shared Appwrite configuration and SDK clients.
src/server/services/     Cross-feature auth, tenant, and query infrastructure.
src/server/actions/      Shared server-action helpers.
src/shared/              Cross-feature validation and types.
docs/backend/            Backend and Appwrite documentation.
```

## Important files

- `src/server/appwrite/config.ts`
  Reads Appwrite endpoint, project, database, collection IDs, and the server-only
  `APPWRITE_RUNTIME_API_KEY` from env. There is no generic key fallback.
- `src/server/appwrite/server-client.ts`
  Creates server-side Appwrite clients and exports `Databases`, `Users`, `Account`, `ID`, and `Query` helpers.
- `src/features/auth/server/auth-actions.ts`
  Handles login, lender registration, password reset, and logout form submissions.
- `src/app/auth/google/*`
  Starts and completes server-side Google sign-in for existing lenders.
- `src/features/borrowers/server/borrower-actions.ts`, `src/features/loans/server/loan-actions.ts`, `src/features/collectors/server/collector-management-actions.ts`, and `src/features/settings/server/lender-settings-actions.ts`
  Handle lender-owned form writes by feature.
- `src/features/dashboard/server/dashboard-service.ts`
  Reads dashboard stats and dashboard loan search data.
- `src/features/{borrowers,loans,payments,collectors}/server/*-query-service.ts`
  Read the corresponding lender-owned records. `src/server/services/lending-service.ts` remains a compatibility re-export for existing callers.
- `src/server/services/lender-service.ts`
  Finds the active lender record from the current Appwrite session.
- `src/server/services/tenant-data-service.ts`
  Centralizes lender-owned reads and mutations. It always prepends the trusted
  server-derived `lender_id`, overwrites tenant IDs on create, and strips tenant
  ID changes on update.
- `src/server/services/collector-auth-service.ts`
  Resolves active collectors from rolling 90-day sessions and revalidates the
  collector record for every protected collector operation.
- `src/server/services/authentication-rate-limit-service.ts`
  Applies shared Appwrite-backed login, OAuth, registration, and password-reset limits.
- `src/server/services/security-event-service.ts`
  Stores sanitized authentication/security events and emits structured server logs.
- `src/server/services/search-text-service.ts`
  Builds searchable text for borrowers and loans from borrower name, phone, and address.
- `src/features/loans/server/qr-code-service.ts`
  Generates QR code images for download from a loan ID.
- `src/features/sms/domain/service.ts`
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

1. A form calls the action in its feature's `server` folder.
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

## Security

The public security architecture, implemented controls, responsible disclosure
guidance, and known limitations are documented in
[`SECURITY.md`](../../SECURITY.md). Detailed attack-path analysis, rollout
evidence, and internal remediation records are intentionally kept outside the
public repository.

## More docs

- `database-schema.md`: collections, attributes, and indexes.
- `database-queries.md`: every Appwrite query/write currently used by the app.
- `modules/*.md`: module-by-module explanation.
