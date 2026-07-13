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
- `/collector/scan` - QR-based collector workflow.
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

## Appwrite Setup

Initialize the database schema and seed the demo data with:

```bash
npm run appwrite:setup
```

To load the sample lender flow separately, run:

```bash
npm run appwrite:seed
```

The setup creates or reconciles the `lenders`, `borrowers`, `collectors`, `loans`, and `payments` collections with empty client permissions and `documentSecurity` disabled, then seeds a demo loan workflow with QR code data. Database access is server-only.

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
- `npm run appwrite:setup` - provision Appwrite collections and seed demo data.
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
