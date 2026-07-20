# Appwrite Scripts

Demo lender logins created by `seed-appwrite-demo-data.mjs`:

- `demo.northstar@mortgagepro.local` / `DemoPassword123!`
- `demo.rivercity@mortgagepro.local` / `RiverDemo123!`

Demo collector logins created by `seed-appwrite-demo-data.mjs`:

- `seed_collector_jordan` / `CollectorPass123!`
- `seed_collector_maya` / `MayaCollect123!`
- `seed_collector_nina` / `NinaCollect123!`

Script jobs:

- `create-appwrite-tables-and-attributes.mjs` creates the database, collections, and attributes.
- `create-appwrite-indexes.mjs` creates the collection indexes after attributes are ready.
- `seed-appwrite-demo-data.mjs` creates demo users and demo records.
- `manage-appwrite-permissions.mjs` checks or applies deny-by-default collection permissions.
- `verify-appwrite-isolation.mjs` verifies direct client access is blocked and server runtime access still works.
- `security-report.mjs` prints aggregate security-event counts for a selected time window without exposing hashed subjects.
- `security-cleanup.mjs` removes rate-limit state older than 7 days and security events older than 90 days.

All scripts load configuration in the same order: `.env.example` defaults,
then `.env.local`, then non-empty process environment values. Empty process
variables never overwrite populated local values.
