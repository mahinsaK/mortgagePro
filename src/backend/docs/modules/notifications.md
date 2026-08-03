# Local Notifications Module

## Purpose

The lender notification bell calculates actionable advice from existing loans,
payments, and borrowers. It does not create notification documents or perform
database writes.

## Current workflows

- Unfinished loans past their end date.
- Unfinished loans ending today.
- Unfinished loans ending within the next seven days.
- No collection recorded during the lender browser's local day while active
  loans exist.
- Active borrowers with a missing or unusable phone number.

The API returns aggregate counts and filtered destinations. It does not expose
borrower names, loan IDs, or lender IDs.

## Request and data access

`GET /api/notifications` requires:

- `localDate` in valid `YYYY-MM-DD` format.
- `timezoneOffsetMinutes` as an integer from `-840` to `840`.

The lender is always derived from the authenticated Appwrite session. Every
record query uses the tenant data helper, and the response is `private,
no-store`.

The generator performs four reads only when requested: relevant loans, the
active-loan count, the newest payment, and active borrower contacts. The result
is not polled or persisted in Appwrite.

## Browser state

The browser stores a five-minute aggregate cache and read identities under an
opaque lender-specific key. Cached advice may be used for up to 24 hours when
Appwrite is unavailable, and read identities are removed after 30 days.

This state is only a user-interface convenience. It never authorizes access and
does not follow the lender to another browser or device.

## Deferred scaling

Saved history, cross-device read state, preferences, scheduled generation,
email, SMS, and push delivery require a later database-backed workflow. No new
collection, attribute, index, environment variable, or setup step is required
for the current local workflow.
