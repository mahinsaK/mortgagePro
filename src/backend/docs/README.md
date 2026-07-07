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
  Reads Appwrite endpoint, project, database, collection IDs, and API key from env.
- `src/backend/appwrite/server-client.ts`
  Creates the server-side Appwrite `Databases` client and exports `Query`.
- `src/backend/actions/lending-actions.ts`
  Handles form writes: create borrower, create loan, create collector, update lender.
- `src/backend/services/dashboard-service.ts`
  Reads dashboard stats and dashboard loan search data.
- `src/backend/services/lending-service.ts`
  Reads borrowers, borrower profile, loans, payments, collectors, daily collections, and export data.
- `src/backend/services/lender-service.ts`
  Finds the active lender record.
- `src/backend/services/search-text-service.ts`
  Builds searchable text for loans from borrower name, phone, and address.
- `src/backend/services/qr-code-service.ts`
  Generates QR code images for download from a loan ID.
- `scripts/setup-appwrite.mjs`
  Creates Appwrite collections, attributes, indexes, seed data, and backfills loan search text.

## Current backend flow

1. A page in `src/app` calls a backend service function.
2. The backend service calls `getPrimaryLender()`.
3. If a lender exists, the service queries Appwrite with `Query.equal("lender_id", lender.id)` where the collection stores lender-owned data.
4. The service returns display-ready rows to the frontend.

For form submissions:

1. A frontend form calls a server action from `src/backend/actions/lending-actions.ts`.
2. The action validates the current lender.
3. The action writes one document to Appwrite.
4. The action revalidates affected pages.

## Important security note

Most lender-owned reads and writes are scoped with `lender_id`, so borrower, collector, loan, and payment data stays separated by lender.

Right now `getPrimaryLender()` returns the first lender in Appwrite because full Appwrite Auth session mapping is not connected yet. Before production, this must be changed to:

```txt
current Appwrite user -> lenders.appwrite_user_id -> lender document
```

After that change, the existing `lender_id` filters will separate each lender account correctly.

## More docs

- `database-schema.md`: collections, attributes, and indexes.
- `database-queries.md`: every Appwrite query/write currently used by the app.
- `modules/*.md`: module-by-module explanation.
