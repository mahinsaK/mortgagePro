# Payments Module

Paths:

- `src/backend/modules/payments/dto.ts`
- `src/backend/modules/payments/controller.ts`
- `src/backend/modules/payments/service.ts`
- `src/backend/modules/payments/__tests__/payments.test.ts`
- `src/backend/services/lending-service.ts`
- `src/backend/services/payment-validation-service.ts`
- `src/app/api/exports/payments/route.ts`

## Purpose

Manages payment validation, payment display, daily collections, and CSV exports.

## DTO/controller/service layer

The module files validate and prepare payment payloads:

- `toRecordPaymentDto(input)` validates lender ID, loan ID, loan lender ID, collector ID, collector lender ID, date, amount, and method.
- `PaymentController.record(input)` returns success or failure.
- `PaymentService.prepareRecord(dto)` rejects a collector when `loanLenderId !== collectorLenderId`.

These files do not call Appwrite directly.

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
Query.orderDesc("date")
Query.select(["$id", "loan_id", "collector_id", "amount", "method", "date", "created_at"])
Query.limit(pageSize)
Query.offset((page - 1) * pageSize)
```

How it works:

- Retrieves one page of payments for the active lender.
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
Query.orderDesc("date")
Query.limit(5000)
Query.select(["$id", "loan_id", "collector_id", "amount", "method", "date", "created_at"])
```

How it works:

- Retrieves payments only for one selected day.
- No pagination is used because this is a daily detail page.

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
Query.orderDesc("date")
Query.limit(5000)
Query.select(["$id", "loan_id", "collector_id", "amount", "method", "date", "created_at"])
Query.greaterThanEqual("date", startDateStartIso)
Query.lessThan("date", endDateNextDayIso)
```

Route:

- `src/app/api/exports/payments/route.ts`

How it works:

- Route validates `start` and `end` query params.
- Service retrieves lender-scoped payments in the range.
- Route converts rows to CSV.
