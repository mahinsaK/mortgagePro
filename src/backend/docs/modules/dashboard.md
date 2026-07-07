# Dashboard Module

Paths:

- `src/backend/modules/dashboard/dto.ts`
- `src/backend/modules/dashboard/controller.ts`
- `src/backend/modules/dashboard/service.ts`
- `src/backend/modules/dashboard/__tests__/dashboard.test.ts`
- `src/backend/services/dashboard-service.ts`
- `src/app/(portal)/dashboard/lender/page.tsx`

## Purpose

Shows lender overview data:

- Total borrower count.
- Active loan count.
- Today's collection amount.
- Searchable/paginated loan list.
- Date-range CSV exports for payments and borrowers.

## DTO/controller/service layer

The module files contain pure helper logic:

- `toDashboardSearchDto(input)` normalizes search input.
- `DashboardController.searchLoans(...)` supports in-memory filtering tests.
- `DashboardController.exportPaymentsByDateRange(...)` supports date-range filtering tests.

The live dashboard page uses database-backed search in `src/backend/services/dashboard-service.ts`.

## Main dashboard query

Path: `src/backend/services/dashboard-service.ts`

Function: `getLenderDashboardData(options)`

The service runs four main queries in parallel:

1. Dashboard loans list from `loans`.
2. Total borrower count from `borrowers`.
3. Active loan count from `loans`.
4. Today's payment amounts from `payments`.

## Dashboard loans list query

Collection: `loans`

```txt
Query.equal("lender_id", lender.id)
Query.search("search_text", normalizedQuery) // only when q exists
Query.orderDesc("created_at")
Query.limit(pageSize)
Query.offset((page - 1) * pageSize)
Query.select(["$id", "borrower_id", "amount", "daily_payment", "status", "end_date"])
```

Then it loads borrower names/contact for the returned loan rows:

```txt
Query.equal("lender_id", lender.id)
Query.equal("$id", borrowerIds)
Query.limit(borrowerIds.length)
Query.select(["$id", "name", "contact_info"])
```

## Total borrowers query

Collection: `borrowers`

```txt
Query.equal("lender_id", lender.id)
Query.limit(1)
Query.select(["$id"])
```

The dashboard card reads `totalBorrowers.total`.

## Active loans query

Collection: `loans`

```txt
Query.equal("lender_id", lender.id)
Query.equal("status", "active")
Query.limit(1)
Query.select(["$id"])
```

The dashboard card reads `activeLoans.total`.

## Today's collection query

Collection: `payments`

```txt
Query.equal("lender_id", lender.id)
Query.greaterThanEqual("date", todayStartIso)
Query.lessThan("date", tomorrowStartIso)
Query.limit(5000)
Query.select(["amount"])
```

The service sums only the payment amounts returned for today.

## Search behavior

Dashboard search is submitted with:

```txt
/dashboard/lender?q=searchValue
```

The backend normalizes the query and uses `Query.search("search_text", value)`.

The `search_text` value is created when a loan is created. It contains searchable borrower name/contact/address fragments.

## Dashboard CSV behavior

Path: `src/frontend/components/dashboard/lender-dashboard-loans-panel.tsx`

The dashboard export button opens a date-range popover with two server-backed exports:

- `Export payments`: calls `src/app/api/exports/payments/route.ts`.
- `Export borrowers`: calls `src/app/api/exports/borrowers/route.ts`.

Both exports query Appwrite by lender and date range instead of filtering already-loaded dashboard rows.
