# Payments Module

Paths:

- `src/backend/modules/payments/dto.ts`
- `src/backend/modules/payments/controller.ts`
- `src/backend/modules/payments/service.ts`
- `src/backend/modules/payments/__tests__/payments.test.ts`
- `src/backend/services/lending-service.ts`
- `src/backend/services/payment-recording-service.ts`
- `src/backend/services/payment-validation-service.ts`
- `src/app/api/exports/payments/route.ts`

## Purpose

Manages payment validation, payment display, daily collections, and CSV exports.

## DTO/controller/service layer

The module files validate and prepare payment payloads:

- `toRecordPaymentDto(input)` validates lender ID, loan ID, loan lender ID, collector ID, collector lender ID, date, amount, and method.
- `PaymentController.record(input)` returns success or failure.
- `PaymentService.prepareRecord(dto)` rejects a collector when `loanLenderId !== collectorLenderId`.
- `PaymentService.calculateLoanTotals(input)` calculates stored `total_paid`,
  `remaining_amount`, and status, rounds currency values to two decimal places,
  and rejects payments above the remaining balance.

These files do not call Appwrite directly.

## Record payment and update loan totals

Path: `src/backend/services/payment-recording-service.ts`

Function: `recordLoanPayment(input)`

How it works:

- Requires a unique request token generated when the collector scans a loan.
- Derives the payment document ID from the lender, collector, loan, and request
  token. Retrying the same request returns the existing result instead of
  creating another payment.
- Opens an Appwrite transaction and verifies the active loan and collector
  belong to the same lender inside that transaction.
- Rejects an amount above the transaction's current remaining balance.
- Stages the payment document and the loan `total_paid`, `remaining_amount`,
  and `status` update in the same transaction, then commits both together.
- Retries a transaction conflict up to three times, re-reading the latest loan
  balance before each attempt.
- Marks the loan `completed` when remaining balance reaches zero.

No new payment attribute or database migration is needed because the unique,
deterministic Appwrite document ID is the idempotency boundary.

## Delete a mistaken payment

Paths:

- `src/backend/actions/payment-actions.ts`
- `src/backend/services/payment-recording-service.ts`
- `src/frontend/components/payments/delete-payment-button.tsx`

How it works:

- Only an authenticated lender can request deletion, and the payment lookup is
  restricted to that lender.
- The payments page, daily collections page, and loan payment drawer show the
  delete control.
- A confirmation warning explains that deletion is permanent, should only be
  used for a mistaken entry, changes the loan balance, and cannot be undone.
- The payment deletion and restoration of the loan's `total_paid`,
  `remaining_amount`, and `status` are committed in one Appwrite transaction.
- Deleting the payment that completed a loan changes the loan back to `active`.
- A mismatched or invalid stored balance is rejected instead of being silently
  recalculated.

This is a permanent correction mechanism, not an audit-preserving reversal.
Enterprise financial use still requires immutable reversal records, actors,
reasons, timestamps, and an approval policy.

## Collector loan ownership validation

Path: `src/backend/services/payment-validation-service.ts`

Function: `validateCollectorCanCollectLoan(input)`

How it works:

- Compares `collectorLenderId` and `loanLenderId`.
- Returns failure when a collector tries to collect another lender's loan.

## Payments page query

Path: `src/backend/services/lending-service.ts`

Function: `getPaymentsPageData(options)`

Query:

```txt
Query.equal("lender_id", lender.id)
Query.orderDesc("$createdAt")
Query.select(["$id", "$createdAt", "loan_id", "collector_id", "amount", "method", "date", "created_at"])
Query.limit(pageSize)
Query.offset((page - 1) * pageSize)
```

How it works:

- Retrieves one page of payments for the active lender.
- Sorts by the full Appwrite creation timestamp, so the latest collection time
  appears first across both dates and times.
- Displays that timestamp in the lender's browser timezone, making morning and
  evening collections distinguishable.
- Then maps loan, borrower, and collector names.

## Payment row mapping queries

Path: `src/backend/services/lending-service.ts`

Function: `mapPaymentDocuments(lenderId, payments)`

Loans lookup:

```txt
Query.equal("lender_id", lenderId)
Query.equal("$id", loanIds)
Query.limit(loanIds.length)
Query.select(["$id", "borrower_id"])
```

Collectors lookup:

```txt
Query.equal("lender_id", lenderId)
Query.equal("$id", collectorIds)
Query.limit(collectorIds.length)
Query.select(["$id", "name"])
```

Borrowers lookup:

```txt
Query.equal("lender_id", lenderId)
Query.equal("$id", borrowerIds)
Query.limit(borrowerIds.length)
Query.select(["$id", "name"])
```

How it works:

- Finds names only for the visible/exported payments.
- All lookups remain scoped by lender.

## Daily collections query

Path: `src/backend/services/lending-service.ts`

Function: `getDailyCollectionsData(date)`

Query:

```txt
Query.equal("lender_id", lender.id)
Query.greaterThanEqual("date", dayStartIso)
Query.lessThan("date", nextDayStartIso)
Query.orderDesc("$createdAt")
Query.limit(5000)
Query.select(["$id", "$createdAt", "loan_id", "collector_id", "amount", "method", "date", "created_at"])
```

How it works:

- Retrieves payments only for one selected day.
- No pagination is used because this is a daily detail page.
- Collector filtering on this page is local/client-side after the selected day's payments are loaded.
- The CSV export downloads the currently filtered rows with a `collected_at`
  timestamp.

## Dashboard today's collection query

Path: `src/backend/services/dashboard-service.ts`

Function: `getLenderDashboardData(options)`

Query:

```txt
Query.equal("lender_id", lender.id)
Query.greaterThanEqual("date", todayStartIso)
Query.lessThan("date", tomorrowStartIso)
Query.limit(5000)
Query.select(["amount"])
```

How it works:

- Retrieves only today's amounts for the active lender.
- Sums those amounts for the dashboard card.

## Payment CSV export query

Path: `src/backend/services/lending-service.ts`

Function: `getPaymentsExportData({ startDate, endDate })`

Query:

```txt
Query.equal("lender_id", lender.id)
Query.orderDesc("$createdAt")
Query.limit(5000)
Query.select(["$id", "$createdAt", "loan_id", "collector_id", "amount", "method", "date", "created_at"])
Query.greaterThanEqual("date", startDateStartIso)
Query.lessThan("date", endDateNextDayIso)
```

Route:

- `src/app/api/exports/payments/route.ts`

How it works:

- Route validates `start` and `end` query params.
- Service retrieves lender-scoped payments in the range.
- Route converts rows to CSV.
- Route adds a `TOTAL` row using raw payment amount values.
