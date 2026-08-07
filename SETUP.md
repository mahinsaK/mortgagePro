# MortgagePro Setup Guide

Follow this guide after cloning MortgagePro onto a new computer or when setting
up a new Appwrite project. Complete the steps in order.

## 1. Requirements

Install or create:

- Git.
- Node.js 20 or newer.
- An Appwrite Cloud account and project.
- A Text.lk account only if SMS sending will be used.
- A Google Cloud OAuth client only if Google lender login will be used.

Check the installed versions:

```bash
node --version
npm --version
git --version
```

## 2. Clone and install the project

```bash
git clone <repository-url>
cd MortgagePro
npm install
```

Create the private local environment file:

```bash
cp .env.example .env.local
```

Never commit `.env.local`. It is already excluded by `.gitignore`.

## 3. Create the Appwrite project

1. Sign in to the Appwrite Console.
2. Create a new project or select the project for this installation.
3. Add a Web platform for `localhost` during local development.
4. Copy the Appwrite endpoint and project ID into `.env.local`.
5. Choose a database ID. The setup script creates the database if it does not
   exist.

Use simple IDs containing letters, numbers, underscores, hyphens, or periods.
The collection IDs below are the recommended defaults:

```dotenv
NEXT_PUBLIC_APPWRITE_ENDPOINT="https://<region>.cloud.appwrite.io/v1"
NEXT_PUBLIC_APPWRITE_PROJECT_ID="your_project_id"
NEXT_PUBLIC_APPWRITE_DATABASE_ID="mortgagepro"
NEXT_PUBLIC_APPWRITE_LENDERS_COLLECTION_ID="lenders"
NEXT_PUBLIC_APPWRITE_BORROWERS_COLLECTION_ID="borrowers"
NEXT_PUBLIC_APPWRITE_COLLECTORS_COLLECTION_ID="collectors"
NEXT_PUBLIC_APPWRITE_LOANS_COLLECTION_ID="loans"
NEXT_PUBLIC_APPWRITE_PAYMENTS_COLLECTION_ID="payments"
APPWRITE_AUTH_RATE_LIMITS_COLLECTION_ID="auth_rate_limits"
APPWRITE_SECURITY_EVENTS_COLLECTION_ID="security_events"
```

The final two collections are reserved for optional authentication monitoring.
Monitoring is currently disabled, but the setup and permission scripts still
create and verify these collections so they are ready if the feature is enabled
later.

## 4. Create two Appwrite API keys

Create separate keys in the Appwrite Console. Never place either key in a
`NEXT_PUBLIC_*` variable.

### Runtime key

This key is used by the running application. Give it only these scopes:

- `users.read`
- `users.write`
- `sessions.write`
- `documents.read`
- `documents.write`

Store it locally and in the deployed application as:

```dotenv
APPWRITE_RUNTIME_API_KEY="your_runtime_key"
```

### Setup key

This key is used only by local setup, index, seed, and permission scripts. Give
it the available administration read/write scopes for:

- databases
- collections
- attributes
- indexes
- documents
- users
- project policies

Store it only in the local `.env.local` file:

```dotenv
APPWRITE_SETUP_API_KEY="your_setup_key"
```

Do not add `APPWRITE_SETUP_API_KEY` to Vercel or another production host. Do
not reuse the setup key as the runtime key.

## 5. Generate the collector session secret

Run this command:

```bash
openssl rand -base64 32
```

Copy the generated value into `.env.local`:

```dotenv
COLLECTOR_SESSION_SECRET="paste_the_generated_value_here"
```

If OpenSSL is unavailable, use Node.js:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Use one secret for the whole MortgagePro installation. It signs every collector
session; it is not a collector password. Each collector still has a separate
username and password. Changing this secret immediately signs out all existing
collector sessions.

Add the same `COLLECTOR_SESSION_SECRET` to every deployed environment that runs
this installation. Never share it publicly or commit it.

## 6. Complete the environment configuration

Use this local configuration as a checklist:

```dotenv
APPWRITE_RUNTIME_API_KEY="your_runtime_key"
APPWRITE_SETUP_API_KEY="your_setup_key"
COLLECTOR_SESSION_SECRET="your_generated_secret"

AUTH_SECURITY_CONTROLS_ENABLED="false"
SECURITY_MONITORING_SECRET=""

APP_BASE_URL="http://localhost:3000"

APPWRITE_AUTH_RATE_LIMITS_COLLECTION_ID="auth_rate_limits"
APPWRITE_SECURITY_EVENTS_COLLECTION_ID="security_events"

NEXT_PUBLIC_APPWRITE_ENDPOINT="https://<region>.cloud.appwrite.io/v1"
NEXT_PUBLIC_APPWRITE_PROJECT_ID="your_project_id"
NEXT_PUBLIC_APPWRITE_DATABASE_ID="mortgagepro"
NEXT_PUBLIC_APPWRITE_LENDERS_COLLECTION_ID="lenders"
NEXT_PUBLIC_APPWRITE_BORROWERS_COLLECTION_ID="borrowers"
NEXT_PUBLIC_APPWRITE_COLLECTORS_COLLECTION_ID="collectors"
NEXT_PUBLIC_APPWRITE_LOANS_COLLECTION_ID="loans"
NEXT_PUBLIC_APPWRITE_PAYMENTS_COLLECTION_ID="payments"
```

Keep `AUTH_SECURITY_CONTROLS_ENABLED="false"`. In this mode the optional login
rate-limit and security-event system performs no database reads or writes, and
`SECURITY_MONITORING_SECRET` may remain empty.

### Optional Text.lk SMS configuration

SMS pages require:

```dotenv
TEXTLK_API_TOKEN="your_textlk_token"
TEXTLK_SENDER_ID="your_approved_sender_id"
TEXTLK_API_URL="https://app.text.lk/api/v3/sms/send"
```

The rest of MortgagePro can run without Text.lk credentials, but SMS sending
will fail until they are configured.

## 7. Create Appwrite tables and attributes

Run the table script first:

```bash
npm run appwrite:tables
```

This creates or reconciles:

- the MortgagePro database;
- lenders, borrowers, collectors, loans, and payments collections;
- the two reserved security collections;
- all required attributes; and
- server-only collection permissions.

Wait for the command to finish successfully before creating indexes.

## 8. Create Appwrite indexes

```bash
npm run appwrite:indexes
```

The index script waits for Appwrite attributes to become available and then
creates any missing indexes.

For a new installation, steps 7 and 8 can also be run together:

```bash
npm run appwrite:setup
```

Then apply the lender session policy:

```bash
npm run appwrite:auth:configure
```

This sets Appwrite lender sessions to a 90-day maximum and makes password
changes invalidate existing lender sessions. The setup key needs the
`project.policies.write` scope for this command. The running application does
not need that scope.

The scripts are designed to be safely rerun when a collection, attribute, or
index already exists.

## 9. Verify server-only permissions

Run the read-only permission check:

```bash
npm run appwrite:permissions:check
```

Every collection should report:

- `permissions=[]`
- `documentSecurity=false`
- `enabled=true`
- `compliant=true`

If any collection is not compliant, apply the hardened permissions:

```bash
npm run appwrite:permissions:apply
```

The apply command saves the previous metadata under the ignored
`.security-backups/` directory before changing permissions. Run the check again
afterward.

Do not give normal Appwrite users direct collection permissions. MortgagePro
accesses financial data through its authenticated server so lender ownership is
checked on every operation.

## 10. Add demo data (optional)

Only run this for development or demonstration environments:

```bash
npm run appwrite:seed
```

The seed script creates two demo lenders, collectors, borrowers, loans, and
payments. The demo login credentials are listed in `scripts/README.md` and at
the top of `scripts/seed-appwrite-demo-data.mjs`.

Do not seed a production database containing real customer data.

## 11. Verify the installation

Run the complete local checks:

```bash
npm run lint
npx tsc --noEmit
npm test -- --run
npm run build
```

For a demo-only Appwrite project, an additional isolation test is available:

```bash
npm run appwrite:isolation:verify
```

This command logs in with a configured demo lender, creates temporary probe
records, verifies normal Appwrite sessions cannot access the collections,
verifies the runtime key can access them, and then removes the probes. Do not
run it against real customer data without reviewing the script and approving
the temporary writes.

## 12. Start the application

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Test these flows before continuing:

1. Register a lender and confirm the account is shown as awaiting approval.
2. In Appwrite Console, review the new lender document and change `status`
   from `inactive` to `active`.
3. Sign in as that lender and open the dashboard, borrowers, loans, collectors,
   and payments pages.
4. Create a collector and copy its username.
5. Sign in at `/collector/login` using that username and password.
6. Scan a loan QR code and record a test payment.
7. Confirm the payment and remaining loan balance update together.

## 13. Optional Google lender login

Email/password login works without Google. To enable Google login:

1. Set `APP_BASE_URL` to the application origin. Use
   `http://localhost:3000` locally and the canonical HTTPS origin in production.
   Do not include `/auth/login` or another path.
2. Create a Web Application OAuth client in Google Cloud.
3. Enable the Google OAuth provider in Appwrite Auth.
4. Copy the exact Appwrite callback URL shown in the Appwrite Console into
   Google's authorized redirect URIs.
5. Store the Google client ID and secret in Appwrite, not in `.env.local`.
6. Register localhost and the production hostname as Appwrite Web platforms.

Google login only works for an existing active lender whose Google email is
linked to the same Appwrite Auth account. It does not automatically create a
lender profile.

## 14. Production or Vercel configuration

Add these values to the production environment:

- `APPWRITE_RUNTIME_API_KEY`
- `COLLECTOR_SESSION_SECRET`
- `AUTH_SECURITY_CONTROLS_ENABLED=false`
- `APP_BASE_URL=https://your-canonical-domain.example`
- both server-only security collection IDs
- all `NEXT_PUBLIC_APPWRITE_*` identifiers
- Text.lk values if SMS is enabled

Do not deploy:

- `APPWRITE_SETUP_API_KEY`
- demo passwords
- isolation-test credentials

Add the production hostname as an Appwrite Web platform. Camera QR scanning
requires HTTPS when accessed from a phone.

After deployment, repeat lender login, collector login, QR scanning, payment,
and cross-lender access smoke tests.

## Common setup errors

### `The current user is not authorized`

Confirm `APPWRITE_RUNTIME_API_KEY` exists in the environment running Next.js
and has the runtime scopes listed in step 4. Restart the development server
after changing `.env.local`.

### `Unknown attribute`

The Appwrite schema is older than the application. Run:

```bash
npm run appwrite:tables
npm run appwrite:indexes
```

### `Collection ... could not be found`

Check that all collection IDs in `.env.local` match the Appwrite project, then
run `npm run appwrite:tables` again. The permission checker expects all seven
configured collections to exist.

### `Authentication is temporarily unavailable`

Check the Appwrite endpoint, project ID, runtime key, key scopes, and Appwrite
service status. Do not solve this by reopening direct user collection
permissions.

### Collector session secret error

Generate a fresh value with `openssl rand -base64 32`, update
`COLLECTOR_SESSION_SECRET`, and restart the application. Existing collector
sessions will be signed out.

### Camera does not start

Allow camera permission and use `localhost` during local development or an
HTTPS URL on a phone or deployed environment.

## After pulling future updates

Run:

```bash
npm install
npm run appwrite:tables
npm run appwrite:indexes
npm test -- --run
npm run build
```

Schema scripts reconcile missing resources, so running them after pulling a
version that introduces new attributes or indexes prevents runtime
`Unknown attribute` errors.
