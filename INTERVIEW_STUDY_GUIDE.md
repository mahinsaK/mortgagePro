# MortgagePro Interview Study Guide

This guide is for learning and defending MortgagePro in a software engineering
internship interview. It is based on the repository as it exists, not on an
idealized architecture.

The study process is intentionally progressive. Phase 1 is completed below.
Later phases are listed as a roadmap and should be studied one subsystem at a
time instead of memorizing labels without understanding the execution flow.

## How to use this guide

For every topic:

1. Open the referenced files.
2. follow one real execution path;
3. explain what data enters and leaves each step;
4. explain why the step exists;
5. identify limitations honestly; and
6. practise answering follow-up questions without reading the source.

Do not claim that every folder represents a fully applied design pattern. This
codebase mixes Next.js framework conventions, procedural application services,
and a smaller class-based domain/module layer.

---

# Phase 1 — Mental model

## 1. What MortgagePro does

MortgagePro is a multi-tenant web application for a small lending operation. A
lender uses it to manage borrowers, collectors, loans, payments, exports,
notifications, and SMS communication. A field collector uses a separate mobile
workflow to scan a loan QR code and record a payment.

The most important business rule is ownership isolation: a lender or collector
must only access records belonging to the correct lender. That rule is visible
in `src/backend/services/tenant-data-service.ts`, where tenant-aware queries
always include `Query.equal("lender_id", lenderId)`.

This is not a public borrower self-service application. Borrowers are business
records managed by lenders; there is no active borrower login/dashboard route
in `src/app`.

## 2. Actual users

### Lender

The lender is the primary portal user. A lender can:

- sign in with email/password or Google;
- manage borrowers and collectors;
- create and review loans;
- review and export payments;
- view dashboard and overdue information;
- configure and use SMS features; and
- manage profile and password settings.

Relevant entry points include:

- `src/app/auth/login/page.tsx` — lender login page;
- `src/backend/actions/auth-actions.ts` — lender authentication server actions;
- `src/app/(portal)/layout.tsx` — protects all lender portal pages; and
- `src/frontend/components/layout/portal-shell.tsx` — lender portal shell.

### Collector

The collector is a separate, mobile-focused user. A collector can:

- sign in using a collector username and password;
- scan a loan QR code;
- see the limited payment information needed for collection; and
- record a scheduled or custom payment.

Relevant entry points include:

- `src/app/collector/login/page.tsx`;
- `src/backend/actions/collector-actions.ts`;
- `src/app/collector/scan/page.tsx`; and
- `src/frontend/components/collector/collector-scanner.tsx`.

### Administrator

There is no active administrator application on `main`. Approving a lender or
an SMS sender ID is currently an operational task performed in Appwrite
Console. An `admin` Git branch exists, but code on another branch is not a
feature of the deployed `main` application.

## 3. Main features

| Feature | Main files |
| --- | --- |
| Lender authentication and registration | `src/backend/actions/auth-actions.ts`, `src/backend/services/auth-session-service.ts`, `src/backend/services/lender-service.ts` |
| Google lender sign-in | `src/app/auth/google/route.ts`, `src/app/auth/google/callback/route.ts`, `src/backend/services/lender-google-oauth-service.ts` |
| Collector authentication | `src/backend/actions/collector-actions.ts`, `src/backend/services/collector-auth-service.ts`, `src/backend/services/collector-session-codec.ts` |
| Borrower, collector, and loan management | `src/backend/actions/lending-actions.ts`, `src/backend/services/lending-service.ts` |
| Tenant isolation | `src/backend/services/tenant-data-service.ts`, `src/app/(portal)/layout.tsx` |
| Safe payment recording | `src/backend/services/payment-recording-service.ts`, `src/backend/modules/payments/controller.ts`, `src/backend/modules/payments/service.ts` |
| QR generation and scanning | `src/backend/services/qr-code-service.ts`, `src/frontend/lib/loan-qr-file.ts`, `src/frontend/components/collector/collector-scanner.tsx` |
| Local lender notifications | `src/backend/services/local-notification-service.ts`, `src/app/api/notifications/route.ts`, `src/frontend/components/notifications/local-notifications.tsx` |
| SMS management and Text.lk delivery | `src/backend/services/sms-management-service.ts`, `src/backend/services/sms-sending-service.ts`, `src/backend/services/textlk-sms-provider.ts` |
| CSV exports | `src/app/api/exports/borrowers/route.ts`, `src/app/api/exports/payments/route.ts`, `src/backend/lib/csv.ts` |

## 4. Technology stack

The exact dependency versions are declared in `package.json`.

- **Next.js 16 App Router** provides pages, layouts, Route Handlers, Server
  Components, and Server Actions.
- **React 19** builds interactive client components and forms.
- **TypeScript** provides static types across frontend and backend code.
- **Appwrite** provides user authentication, sessions, a document database,
  queries, indexes, and transactions.
- **node-appwrite** is the server SDK used to access Appwrite. There is no ORM.
- **Tailwind CSS 4** supplies utility-based styling.
- **Radix UI** supplies accessible dialog, popover, and tooltip primitives.
- **qrcode** generates loan QR images.
- **qr-scanner** reads QR codes from the collector's camera.
- **Text.lk** is the external SMS provider, accessed through `fetch` in
  `TextlkSmsProvider.send()`.
- **Vitest** runs unit and service tests.
- **Playwright and Axe** run browser, responsive, and accessibility tests.
- **Lighthouse** checks selected performance and accessibility targets.

## 5. Major directories

### `src/app`

This is the Next.js App Router boundary.

- `src/app/layout.tsx` is the root layout for every page.
- `src/app/page.tsx` is the root request entry and redirects users according to
  device type and existing lender/collector authentication.
- `src/app/(portal)` contains authenticated lender pages. Parentheses make
  `portal` a route group, so it organizes files without adding `/portal` to the
  URL.
- `src/app/api` contains HTTP Route Handlers such as QR lookup, exports, and
  notifications.
- `src/app/auth` contains lender authentication pages and OAuth/session routes.
- `src/app/collector` contains collector login, session refresh, and scanning.

The folder structure here is a **Next.js framework convention**, not proof that
the application implements classical MVC.

### `src/frontend/components`

This contains reusable React UI grouped by feature: authentication, borrowers,
collectors, loans, payments, SMS, notifications, layout, and general UI.

Some components are Server Components by default. Files containing
`"use client"` are Client Components and may use state, effects, browser APIs,
and event handlers. For example, `collector-scanner.tsx` needs camera access and
therefore runs in the browser.

### `src/backend/actions`

These are Next.js Server Actions. Forms can call them without the project
manually creating a REST endpoint for every mutation. They are an application
boundary: they read form data, resolve the authenticated user, invoke business
logic/services, revalidate pages, and redirect or return form state.

Important examples:

- `loginAction()` in `auth-actions.ts`;
- `createBorrowerAction()` and `createLoanForBorrowerAction()` in
  `lending-actions.ts`;
- `collectScannedPaymentAction()` in `collector-actions.ts`; and
- `sendSelectedSmsAction()` in `sms-actions.ts`.

### `src/backend/services`

This is the main application/service layer. These files coordinate business
workflows, Appwrite queries, authentication state, transactions, provider
calls, and mapping database documents into UI-facing objects.

Examples:

- `resolvePrimaryLender()` validates a lender session and loads its lender
  profile;
- `recordTenantLoanPayment()` coordinates payment validation and a database
  transaction;
- `listTenantDocuments()` centralizes tenant-scoped data access; and
- `sendTenantSmsBatch()` coordinates sender approval, quota, provider calls,
  and batch status.

### `src/backend/modules`

This folder contains DTO conversion, validation, small controllers, and domain
logic grouped by feature. It looks like a controller/service/DTO architecture,
but it is **not applied uniformly to every request**.

Real usages include:

- `AuthController` from `modules/auth/controller.ts`, used by
  `actions/auth-actions.ts`;
- `PaymentController` and `PaymentService`, used by
  `services/payment-recording-service.ts`; and
- `NotificationController`, used by
  `services/local-notification-service.ts`.

By contrast, many application services query Appwrite directly. Do not claim
that all requests follow Controller → Service → Repository.

### `src/backend/appwrite`

- `config.ts` maps environment configuration and collection IDs.
- `server-client.ts` creates server-only Appwrite clients for database, user,
  admin-account, and session-account operations.

The runtime API key is attached only to the server client. Client-side code
does not receive the database API key.

### `src/shared`

Small utilities shared across layers, such as phone-number normalization and
feature availability.

### `scripts`

Operational scripts create Appwrite collections and indexes, seed demo data,
configure authentication policy, verify permissions/isolation, and run security
maintenance. The database schema source is
`scripts/appwrite-schema-definition.mjs`.

### `tests` and colocated `*.test.ts`

Unit tests are colocated with modules and services. `tests/e2e` contains
Playwright workflows. The commands and release gate are defined in
`package.json`, `playwright.config.ts`, and `TESTING.md`.

## 6. Where the application starts

There are several useful meanings of “start”:

1. `npm run dev` runs `next dev`, as defined in `package.json`.
2. `src/app/layout.tsx` is the root UI layout and imports global styles.
3. `src/app/page.tsx` handles a visit to `/`. It checks the device and existing
   sessions, then redirects to the lender portal, collector scanner, or the
   appropriate login page.
4. `src/app/(portal)/layout.tsx` is the authenticated lender boundary. It calls
   `resolvePrimaryLender()` before rendering any protected lender page.
5. A user mutation normally enters through a Server Action in
   `src/backend/actions`; an explicit HTTP request enters through a `route.ts`
   file under `src/app/api` or `src/app/auth`.

Next.js performs the framework bootstrapping, so this project does not have a
traditional `main()` function.

## 7. Architecture diagram that matches this project

```text
Lender browser                        Collector phone
      |                                     |
      v                                     v
Next.js pages + React components      Collector scan/login components
      |                                     |
      +----------- Server Actions ----------+
      |              or API Route Handlers   |
      v                                     v
Application services in src/backend/services
      |
      +--> selected DTO/controller/domain logic in src/backend/modules
      |
      +--> tenant-aware helpers in tenant-data-service.ts
      |
      v
node-appwrite server client
      |
      +------------------> Appwrite Auth and Database
      |
      +------------------> Appwrite Transactions

Separate external path:
SMS service --> SmsProvider contract --> TextlkSmsProvider --> Text.lk API

Authentication provider path:
Browser --> Next.js Google routes --> Appwrite OAuth --> Google
```

## 8. Architecture in plain English

The browser displays React components. Read-heavy pages are usually rendered
on the server and call a backend service directly. When the user submits a
form, a Next.js Server Action receives the form data. Browser features that
need JSON or files use Route Handlers under `src/app/api`.

The backend service resolves the current lender or collector instead of
trusting a lender ID sent by the browser. It then performs validation and calls
Appwrite through the server SDK. Tenant-aware helper functions add the lender
constraint to sensitive queries.

Appwrite stores both authentication accounts and database documents, but they
are distinct concepts. For lenders, `lenders.appwrite_user_id` links the
Appwrite Auth user to the lender business profile. Collectors do not use
Appwrite Auth; the application verifies their `scrypt` password hashes and
creates its own signed cookie.

For SMS delivery, business code depends on the `SmsProvider` contract. The
Text.lk adapter translates the application's SMS input into Text.lk's HTTP
request format. This is one of the clearest examples of abstraction and
polymorphism in the repository.

## 9. Important data model

The core Appwrite collections are:

- `lenders` — business profile linked to an Appwrite Auth user;
- `borrowers` — lender-owned borrower profiles;
- `collectors` — lender-owned collector login profiles;
- `loans` — lender-owned loans linked to borrowers; and
- `payments` — lender-owned payment records linked to loans and collectors.

The SMS subsystem adds accounts, sender requests, templates, monthly usage,
and send-log collections. The complete attributes and indexes are documented
in `src/backend/docs/database-schema.md` and defined by
`scripts/appwrite-schema-definition.mjs`.

Appwrite document `$id` is the primary document identifier. Relationships such
as `borrower_id`, `loan_id`, `collector_id`, and `lender_id` are stored as
string IDs; this is a document-database design rather than ORM-managed foreign
keys.

## 10. Security model to remember

- Lender login uses Appwrite Auth sessions. The session secret is stored in the
  HTTP-only `mortgagepro_session` cookie by
  `setAuthSessionSecret()` in `auth-session-service.ts`.
- Collector login uses `scrypt` password hashes and an HMAC-signed HTTP-only
  cookie implemented by `collector-auth-service.ts` and
  `collector-session-codec.ts`.
- Protected lender pages are guarded in `src/app/(portal)/layout.tsx`.
- Collector routes call `requireActiveCollectorPrincipal()`.
- Tenant-sensitive database operations should include the lender ID through
  `tenant-data-service.ts` or an equivalent explicit query.
- Appwrite collections use server-only access; normal browser sessions should
  not directly read/write database documents.
- Payment creation and loan-balance updating are committed in one Appwrite
  transaction in `recordTenantLoanPayment()`.

## 11. Important honesty checks for an interview

- **Not classical MVC:** Next.js pages, Route Handlers, Server Actions, and
  services do not form a strict MVC implementation.
- **No general repository layer:** `tenant-data-service.ts` resembles a small
  repository/data gateway, but several services call `databases` directly.
- **No ORM:** data is accessed through `node-appwrite` queries.
- **No DI container:** dependency injection is manual. `SmsService` accepts an
  `SmsProvider`; controllers use constructor defaults; there is no framework
  container wiring dependencies.
- **No active Redux/global auth store:** authentication is resolved on the
  server. `AuthContext.tsx`, `ThemeContext.tsx`, and hooks such as `useAuth.ts`
  are currently unused placeholders and should not be presented as active
  architecture.
- **No active borrower dashboard or analytics page:** directories may exist,
  but there is no corresponding `page.tsx` on `main`.
- **Payment deletion is not an immutable accounting correction:** it uses a
  transaction to restore the balance safely, but an auditable void/reversal
  workflow is still a known improvement.
- **Money is stored as numeric values:** exact minor-unit integer migration is
  a known future hardening item.

## 12. Phase 1 interview answer

> MortgagePro is a multi-tenant lending operations application built with
> Next.js, React, TypeScript, and Appwrite. Lenders manage borrowers, loans,
> collectors, payments, notifications, exports, and SMS. Collectors use a
> separate mobile QR workflow to record payments. Next.js Server Components
> render most pages, Server Actions handle form mutations, and Route Handlers
> provide JSON, OAuth, export, and QR endpoints. Backend services enforce
> business workflows and use the server-only Appwrite SDK. Tenant-aware queries
> scope sensitive records by lender ID, and payment creation plus balance
> updates use an Appwrite transaction. Text.lk is isolated behind an SMS
> provider interface. The project has a service-oriented layered structure,
> but it is not a strict MVC or repository architecture.

## 13. Recommended first subsystem

Study **lender authentication and tenant isolation first**.

Why:

1. Every protected lender feature depends on the authenticated lender.
2. It explains the difference between an Appwrite Auth user and a lender
   business profile.
3. It is the foundation for answering “How do you prevent one lender from
   seeing another lender's data?”
4. It introduces pages, Server Actions, cookies, services, Appwrite queries,
   redirects, error states, and security boundaries in one manageable flow.

Open these files in order:

1. `src/app/auth/login/page.tsx`
2. `src/frontend/components/auth/login-form.tsx`
3. `src/backend/actions/auth-actions.ts` — focus on `loginAction()`
4. `src/backend/services/auth-session-service.ts`
5. `src/backend/services/lender-login-service.ts`
6. `src/backend/services/lender-service.ts`
7. `src/app/(portal)/layout.tsx`
8. `src/backend/services/tenant-data-service.ts`

Stop after understanding that flow before moving to collector authentication or
payment transactions.

---

# Progressive study roadmap

Only Phase 1 is completed in this document. Expand the following phases after
you can explain the previous phase without notes.

## Phase 2 — Trace real requests

Trace these five flows with exact inputs and outputs:

1. lender email/password login;
2. borrower creation;
3. loan creation and QR generation;
4. collector QR lookup and payment collection; and
5. SMS batch sending.

## Phase 3 — OOP in the actual code

Study classes/objects, interfaces, encapsulation, abstraction, composition,
polymorphism, and dependency relationships. Explicitly identify inheritance
and abstract classes as absent unless new code adds them.

## Phase 4 — SOLID analysis

Evaluate each principle rather than assuming compliance. Focus first on the
SMS provider abstraction, tenant data helper, large application services, and
Server Action responsibilities.

## Phase 5 — Patterns

Investigate only evidence-backed patterns: Service Layer, Adapter/Strategy-like
SMS provider, DTO mapping, dependency injection by constructor, data gateway,
and Next.js middleware-like layout boundaries. Separate framework conventions
from intentional GoF patterns.

## Phase 6 — Database and CRUD

Study the schema, indexes, tenant relationships, direct SDK queries, mappings,
transactions, and one create/read/update/delete flow.

## Phase 7 — API design

Study Route Handlers, Server Actions, request validation, status codes, JSON
responses, downloads, and where the application is or is not RESTful.

## Phase 8 — Authentication and security

Trace lender sessions, collector signed sessions, Google OAuth state, cookie
properties, password hashing, tenant authorization, environment secrets, and
known limitations.

## Phase 9 — Frontend architecture

Study Server versus Client Components, routing, forms, local state, browser
fetch calls, loading/error feedback, dialogs, responsive behavior, and why the
project does not require a large client state library.

## Phase 10 — Dependencies and coupling

Draw dependencies for authentication, payment recording, and SMS. Identify
which dependencies can be replaced in tests and which code is tightly coupled
to Appwrite.

## Phase 11 — Errors and edge cases

Trace invalid login, unavailable Appwrite, cross-tenant QR lookup, duplicate
payment, overpayment, transaction conflict, SMS provider failure, and UI retry
behavior.

## Phase 12 — Testing

Study Vitest unit/service tests, mocks and fakes, Playwright end-to-end tests,
tenant-isolation checks, coverage gates, and important remaining gaps.

## Phase 13 — Code quality review

Prepare balanced observations about good decisions, large services, mixed
architectural styles, unused placeholder hooks/contexts, duplicated mapping,
financial limitations, and scaling considerations.

## Phase 14 — Interview “why?” questions

Build strong and weak answers for the project's real decisions: Appwrite,
server-only access, tenant filters, two authentication systems, transactions,
idempotency, provider abstraction, pagination, and local notifications.

## Phase 15 — Dangerous knowledge gaps

Rank the areas you cannot yet defend. Authentication, tenant isolation, payment
transactions, schema relationships, and failure behavior should be critical.

## Phase 16 — Final cheat sheet

Produce a one-page summary only after the deeper phases are understood.

## Phase 17 — Mock interview tutoring

For each subsystem: explain it, open the real files, trace it, answer three
questions, receive critique, and then attempt harder follow-ups.

