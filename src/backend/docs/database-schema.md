# Database Schema

The app uses Appwrite Database with five core collections only.

The setup source is `scripts/setup-appwrite.mjs`.

## Lenders

Purpose: stores one lender business profile per Appwrite Auth user.

Attributes:

- `appwrite_user_id`: Appwrite Auth user ID.
- `company_name`: lender business name.
- `email`: lender email.
- `contact_info`: JSON string with phone/address.
- `status`: `active` or `inactive`.
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
- `contact_info`: JSON string with phone/address.
- `status`: `active` or `inactive`.
- `created_at`: creation date.

Indexes:

- `idx_borrower_lender_id`: helps list borrowers for one lender.
- `idx_borrower_status`: helps filter by status.
- `idx_borrower_lender_created`: helps list one lender's borrowers ordered by creation date.

## Collectors

Purpose: stores collectors owned by a lender.

Attributes:

- `lender_id`: owning lender document ID.
- `name`: collector name.
- `contact_info`: JSON string with phone/area.
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

## Why `search_text` exists

Appwrite fulltext search works on a field in the same collection. The dashboard searches loans by borrower name, phone, and address, but those values live in Borrowers.

To avoid loading all loans and filtering in memory, loan creation stores a generated `search_text` value inside the loan document. It is created from the borrower name/contact/address at loan creation time and indexed with `idx_loan_search_text`.

Source:

- `src/backend/services/search-text-service.ts`
- `src/backend/actions/lending-actions.ts`
- `scripts/setup-appwrite.mjs`
