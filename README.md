# MortgagePro

MortgagePro is a Next.js application for managing a small lending operation end to end. It brings together borrower records, loans, repayments, collector workflows, SMS notifications, and analytics in one portal.

## What It Does

- Manages lenders, borrowers, collectors, loans, and payments in Appwrite.
- Supports lender, collector, and borrower dashboard views.
- Sends SMS notifications through the TextLK API.
- Provides username-based collector login and QR loan lookup flows.
- Includes export endpoints for borrowers and payments.

## Project Structure

- `src/app` - App Router pages, layouts, and route handlers.
- `src/backend` - Appwrite clients, server-side services, business logic, and auth helpers.
- `src/frontend/components` - reusable UI, layouts, forms, charts, and feature components.
- `src/frontend/context` - global React context providers.
- `src/frontend/hooks` - shared frontend hooks.
- `src/frontend/lib` - client-side API helpers and utilities.
- `src/frontend/styles` - global styles and theme tokens.
- `scripts` - Appwrite setup and demo data seeding scripts.

## Key Routes

- `/auth/login` - lender sign-in.
- `/auth/register` - account registration.
- `/auth/password-reset` - password recovery.
- `/collector/login` - collector username and password sign-in.
- `/collector/scan` - camera-based QR workflow with a payment-details popup and daily/custom amount entry.
- `/dashboard/*` - role-specific dashboards.
- `/borrowers` - borrower management.
- `/loans` - loan management.
- `/payments` - payment recording and review.
- `/notifications` - notification activity.
- `/sms` - SMS tooling.
- `/analytics` - operational reporting.
- `/settings` - application settings.

## Requirements

- Node.js 20 or newer.
- An Appwrite project with the database and collections configured.
- A TextLK API token for SMS sending.

## Getting Started

1. Install dependencies.

```bash
npm install
```

2. Copy `.env.example` to `.env.local` and fill in the required secrets.

3. Start the development server.

```bash
npm run dev
```

4. Open `http://localhost:3000`.

## Environment Variables

The app expects these core variables in `.env.local`:

- `APPWRITE_RUNTIME_API_KEY` - server-only application key with user, session, and document runtime scopes.
- `APPWRITE_SETUP_API_KEY` - local-only administration key used by setup, seed, and permission commands; do not add this key to Vercel.
- `COLLECTOR_SESSION_SECRET` - a dedicated random secret containing at least 32 bytes; collector sessions expire after 12 hours.
- `APP_BASE_URL` - fixed application origin used for authentication callbacks, such as `http://localhost:3000` locally and the canonical HTTPS URL in production.
- `NEXT_PUBLIC_APPWRITE_ENDPOINT`
- `NEXT_PUBLIC_APPWRITE_PROJECT_ID`
- `NEXT_PUBLIC_APPWRITE_DATABASE_ID`
- `NEXT_PUBLIC_APPWRITE_LENDERS_COLLECTION_ID`
- `NEXT_PUBLIC_APPWRITE_BORROWERS_COLLECTION_ID`
- `NEXT_PUBLIC_APPWRITE_COLLECTORS_COLLECTION_ID`
- `NEXT_PUBLIC_APPWRITE_LOANS_COLLECTION_ID`
- `NEXT_PUBLIC_APPWRITE_PAYMENTS_COLLECTION_ID`
- `TEXTLK_API_TOKEN`
- `TEXTLK_SENDER_ID`
- `TEXTLK_API_URL`
- `DEMO_LENDER_EMAIL`
- `DEMO_LENDER_PASSWORD`
- `DEMO_SECOND_LENDER_EMAIL`
- `DEMO_SECOND_LENDER_PASSWORD`
- `DEMO_COLLECTOR_ID`
- `DEMO_COLLECTOR_PASSWORD`
- `DEMO_SECOND_COLLECTOR_ID`
- `DEMO_SECOND_COLLECTOR_PASSWORD`

Google lender login also requires the Google provider to be enabled in the
Appwrite console. The Google client secret is stored in Appwrite, not in this
project's environment variables. See `src/backend/docs/modules/auth.md` for the
complete setup procedure.

## Appwrite Setup

Create the database, collections, attributes, and indexes with:

```bash
npm run appwrite:setup
```

You can also run the schema steps separately:

```bash
npm run appwrite:tables
npm run appwrite:indexes
```

To load demo lenders, collectors, borrowers, loans, and payments, run:

```bash
npm run appwrite:seed
```

Demo lender logins:

- `demo.northstar@mortgagepro.local` / `DemoPassword123!`
- `demo.rivercity@mortgagepro.local` / `RiverDemo123!`

Demo collector logins:

- `seed_collector_jordan` / `CollectorPass123!`
- `seed_collector_maya` / `MayaCollect123!`
- `seed_collector_nina` / `NinaCollect123!`

The table script creates or reconciles the `lenders`, `borrowers`, `collectors`, `loans`, and `payments` collections with empty client permissions and `documentSecurity` disabled. Database access is server-only.

Inspect collection permission metadata without changing it:

```bash
npm run appwrite:permissions:check
```

Save the existing metadata locally, apply deny-by-default permissions, and verify the result:

```bash
npm run appwrite:permissions:apply
```

## Available Scripts

- `npm run dev` - start the development server.
- `npm run build` - build the production app.
- `npm run start` - start the production server.
- `npm run lint` - run ESLint.
- `npm run test` - run the Vitest test suite.
- `npm run appwrite:setup` - create Appwrite collections, attributes, and indexes.
- `npm run appwrite:tables` - create Appwrite database, collections, and attributes.
- `npm run appwrite:indexes` - create Appwrite collection indexes.
- `npm run appwrite:seed` - seed the demo Appwrite data only.
- `npm run appwrite:permissions:check` - inspect collection permission metadata without changing it.
- `npm run appwrite:permissions:apply` - back up, harden, and verify collection permissions.
- `npm run appwrite:isolation:verify` - verify normal-session CRUD denial and runtime-key CRUD using throwaway records.

## Technology Stack

- Next.js 16
- React 19
- TypeScript
- Appwrite
- Tailwind CSS 4
- Radix UI
- Lucide icons

## Notes

- The app redirects the root route to the login flow.
- The portal layout requires an authenticated lender session before rendering protected routes.
- Keep secrets out of version control and store them only in local environment files.
