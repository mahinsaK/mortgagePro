# MortgagePro

Single Next.js app for lender business management.

## Structure

- `src/app` - Next.js routes and pages
- `src/frontend/components` - reusable UI and layout components
- `src/frontend/context` - global React context
- `src/frontend/hooks` - shared frontend hooks
- `src/frontend/lib` - frontend Appwrite config and utilities
- `src/frontend/mock-data` - temporary mock data until Appwrite is connected
- `src/frontend/styles` - global and theme styles
- `src/backend` - server-side Appwrite helpers, services, auth, and backend utilities

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Appwrite

Copy `.env.example` to `.env.local` and add your Appwrite project/database/collection IDs when ready.

Run the Appwrite schema and seed setup with:

```bash
npm run appwrite:setup
```

The setup creates `lenders`, `borrowers`, `collectors`, `loans`, and `payments`, then seeds one lender flow with a QR code stored on the sample loan.
