# Database Schema

The app uses five core business collections and two server-only security
collections in Appwrite Database.

The schema sources are `scripts/appwrite-schema-definition.mjs`,
`scripts/create-appwrite-tables-and-attributes.mjs`, and
`scripts/create-appwrite-indexes.mjs`.

All seven collections are provisioned with empty collection permissions,
`documentSecurity: false`, and server-only access through the runtime API key.
Normal Appwrite user sessions must not access database documents directly.

## Lenders

Purpose: stores one lender business profile per Appwrite Auth user.

Attributes:

- `appwrite_user_id`: Appwrite Auth user ID.
- `company_name`: lender business name.
- `email`: lender email.
- `contact_info`: JSON string with phone/address.
- `status`: `active` or `inactive`.
- `currency`: lender display currency, such as `USD` or `LKR`.
- `created_at`: creation date.

Indexes:

- `idx_appwrite_user_id`: helps find a lender by Appwrite Auth user later.
- `idx_lender_status`: helps filter lenders by status.

## Borrowers

Purpose: stores borrower profiles owned by a lender.

Attributes:

- `lender_id`: owning lender document ID.
- `name`: borrower name.
- `business_name`: optional business name.
- `contact`: borrower phone/contact number.
- `address`: borrower address.
- `search_text`: indexed helper text for borrower-name/contact/address search.
- `status`: `active` or `inactive`.
- `created_at`: creation date.

Indexes:

- `idx_borrower_lender_id`: helps list borrowers for one lender.
- `idx_borrower_status`: helps filter by status.
- `idx_borrower_lender_created`: helps list one lender's borrowers ordered by creation date.
- `idx_borrower_name`: fulltext index for borrower name search.
- `idx_borrower_business_name`: fulltext index for borrower business name search.
- `idx_borrower_contact`: fulltext index for borrower contact search.
- `idx_borrower_address`: fulltext index for borrower address search.
- `idx_borrower_search_text`: fulltext index for generated borrower search text.

## Collectors

Purpose: stores collectors owned by a lender.

The collector document `$id` is also the permanent, globally unique login
username. New IDs use a friendly lowercase name-and-digits format. Existing
legacy IDs remain valid usernames.

Attributes:

- `lender_id`: owning lender document ID.
- `name`: collector name.
- `contact_info`: JSON string with phone/area.
- `password_hash`: salted `scrypt` password hash.
- `session_version`: session generation used to revoke older device sessions.
- `status`: `active` or `inactive`.
- `created_at`: creation date.

Indexes:

- `idx_collector_lender_id`: helps list collectors for one lender.
- `idx_collector_status`: helps filter by status.
- `idx_collector_lender_status`: helps count/list active collectors for one lender.
- `idx_collector_lender_created`: helps list one lender's collectors ordered by creation date.

## Loans

Purpose: stores loans owned by a lender and attached to a borrower.

Attributes:

- `lender_id`: owning lender document ID.
- `borrower_id`: borrower document ID.
- `amount`: loan amount.
- `interest_rate`: interest rate.
- `daily_payment`: planned daily payment amount.
- `total_paid`: stored total amount paid against the loan.
- `remaining_amount`: stored remaining balance for the loan.
- `start_date`: loan start date.
- `end_date`: loan end date.
- `status`: `active`, `completed`, `overdue`, or `cancelled`.
- `qr_code`: QR payload string. New loans store the loan ID here; the PNG is generated only when downloading.
- `search_text`: indexed helper text for borrower-name/contact/address search.
- `created_at`: creation date.

Indexes:

- `idx_loan_lender_id`: helps list loans for one lender.
- `idx_loan_borrower_id`: helps find loans for a borrower.
- `idx_loan_status`: helps filter loans by status.
- `idx_loan_lender_status`: helps count active loans for one lender.
- `idx_loan_lender_status_end`: helps count overdue loans for one lender by status and end date.
- `idx_loan_lender_borrower`: helps list loans for one lender and one borrower.
- `idx_loan_lender_created`: helps list one lender's loans ordered by creation date.
- `idx_loan_search_text`: fulltext index used by dashboard loan search.

## Payments

Purpose: stores repayment records.

Attributes:

- `lender_id`: owning lender document ID.
- `loan_id`: loan document ID.
- `collector_id`: collector document ID.
- `date`: payment date.
- `amount`: payment amount.
- `method`: `cash`, `transfer`, `card`, `check`, or `other`.
- `created_at`: creation date.

Indexes:

- `idx_payment_lender_id`: helps list payments for one lender.
- `idx_payment_loan_id`: helps find payments for one loan.
- `idx_payment_collector_id`: helps find payments for one collector.
- `idx_payment_date`: helps date filtering.
- `idx_payment_lender_date`: helps daily collections and exports for one lender.
- `idx_payment_lender_collector`: helps collector-based payment queries later.

## Authentication Rate Limits

Purpose: stores shared authentication attempt windows and temporary blocks so
limits remain effective across concurrent server instances.

Runtime use is currently frozen by the default-off
`AUTH_SECURITY_CONTROLS_ENABLED` switch. The dormant collection remains
server-only and receives no application operations while the switch is off.

The collection stores only an HMAC subject hash, scope, counter, timestamps,
and optional block expiry. It never stores raw IP addresses, emails, usernames,
passwords, or session values. Records older than 7 days are removed by
`npm run security:cleanup`.

## Security Events

Purpose: stores sanitized lender, collector, Google-login, invalid-session, and
authorization-denial events for operational review.

Runtime use is currently frozen by the same default-off switch, so the
application does not insert events while disabled.

Raw login identifiers and IP addresses are HMAC-hashed. Event records include
an event type, outcome, principal type, optional lender ID, request ID, reason
code, safe metadata, and timestamp. Records older than 90 days are removed by
`npm run security:cleanup`; aggregate counts are available through
`npm run security:report -- --hours 24`.

## Why `search_text` exists

Appwrite fulltext search works on a field in the same collection. The dashboard searches loans by borrower name, phone, and address, but those values live in Borrowers.

To avoid loading all loans and filtering in memory, loan creation stores a generated `search_text` value inside the loan document. It is created from the borrower name, contact, and address at loan creation time and indexed with `idx_loan_search_text`.

The SMS page searches borrowers directly by indexed borrower fields: name, business name, and contact. Borrower `search_text` is still kept for compatibility and broader generated search text.

Source:

- `src/backend/services/search-text-service.ts`
- `src/backend/actions/lending-actions.ts`
- `scripts/appwrite-schema-definition.mjs`
- `scripts/create-appwrite-tables-and-attributes.mjs`
- `scripts/create-appwrite-indexes.mjs`
