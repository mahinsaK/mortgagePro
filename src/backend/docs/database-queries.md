# Database Queries

This file lists the Appwrite database queries and writes currently used by the backend.

## Appwrite client

Path: `src/backend/appwrite/server-client.ts`

Creates one server-side Appwrite client:

```ts
export const databases = new Databases(client);
export { Query };
```

All services import this client and use env values from `src/backend/appwrite/config.ts`.

## Lender lookup

Path: `src/backend/services/lender-service.ts`

Function: `getPrimaryLender()`

Collection: `lenders`

Query:

```txt
Query.limit(1)
```

How it works:

- Reads the first lender document.
- Returns a simple lender profile object.
- Returns `null` if there is no Appwrite API key or no lender document.

Important:

- This is temporary for development.
- Production should query `lenders` by `appwrite_user_id` for the currently logged-in Appwrite user.

## Dashboard data

Path: `src/backend/services/dashboard-service.ts`

Function: `getLenderDashboardData(options)`

### Dashboard loans list

Collection: `loans`

Query:

```txt
Query.equal("lender_id", lender.id)
Query.search("search_text", normalizedQuery) // only when q exists
Query.orderDesc("created_at")
Query.limit(pageSize)
Query.offset((page - 1) * pageSize)
Query.select(["$id", "borrower_id", "amount", "daily_payment", "status", "end_date"])
```

How it works:

- Retrieves only loans that belong to the active lender.
- Uses database fulltext search when the user searches.
- Retrieves one page only, default 15 loans.
- Retrieves only the fields needed for the dashboard table.

After this, it fetches matching borrowers by the returned `borrower_id` values:

```txt
Query.equal("lender_id", lender.id)
Query.equal("$id", borrowerIds)
Query.limit(borrowerIds.length)
Query.select(["$id", "name", "contact_info"])
```

That second query is used only to show borrower name and phone/contact beside each loan.

### Active loan count

Collection: `loans`

Query:

```txt
Query.equal("lender_id", lender.id)
Query.equal("status", "active")
Query.limit(1)
Query.select(["$id"])
```

How it works:

- Appwrite returns `total`.
- The dashboard uses `activeLoans.total`.
- It does not load all active loans into memory.

### Today's collection card

Collection: `payments`

Query:

```txt
Query.equal("lender_id", lender.id)
Query.greaterThanEqual("date", todayStartIso)
Query.lessThan("date", tomorrowStartIso)
Query.limit(5000)
Query.select(["amount"])
```

How it works:

- Retrieves only today's payment amounts for the active lender.
- Sums those returned amounts in the service.

Note:

- Appwrite Databases does not provide a SQL-style `SUM(amount)` aggregate in this code path.
- Because we are keeping only the five core tables, this is the simple current approach.
- If daily payment volume becomes very high, add a summary field or summary collection later.

## Borrowers page

Path: `src/backend/services/lending-service.ts`

Function: `getBorrowersPageData(options)`

Collection: `borrowers`

Query through `listForLender()`:

```txt
Query.equal("lender_id", lender.id)
Query.orderDesc("created_at")
Query.select(["$id", "$createdAt", "name", "business_name", "contact_info", "status", "created_at"])
Query.limit(pageSize)
Query.offset((page - 1) * pageSize)
```

How it works:

- Lists only borrowers for the active lender.
- Uses pagination.
- Retrieves only fields shown on the borrower list.
- It does not load loan counts for each borrower on the list.

## Borrower profile

Path: `src/backend/services/lending-service.ts`

Function: `getBorrowerProfileData(borrowerId)`

### Borrower profile lookup

Collection: `borrowers`

Query:

```txt
Query.equal("lender_id", lender.id)
Query.equal("$id", borrowerId)
Query.limit(1)
Query.select(["$id", "$createdAt", "name", "business_name", "contact_info", "status", "created_at"])
```

How it works:

- Checks the borrower belongs to the active lender.
- Returns `null` when another lender's borrower ID is requested.

### Borrower's loans

Collection: `loans`

Query:

```txt
Query.equal("lender_id", lender.id)
Query.equal("borrower_id", borrowerId)
Query.limit(8)
Query.offset((page - 1) * 8)
Query.select(["$id", "borrower_id", "amount", "interest_rate", "daily_payment", "start_date", "end_date", "status"])
```

How it works:

- Retrieves loans for that one borrower and one lender.
- Retrieves only one page of loans, 8 loans per page.
- Does not select `qr_code`; the QR download route generates a PNG from the loan ID only when clicked.
- Uses Appwrite `loans.total` for the total loan count.

Active loan count query:

```txt
Query.equal("lender_id", lender.id)
Query.equal("borrower_id", borrowerId)
Query.equal("status", "active")
Query.limit(1)
Query.select(["$id"])
```

How it works:

- Uses Appwrite `activeLoans.total` for the active loan count.
- Does not load all active borrower loans into memory.

## Loans page

Path: `src/backend/services/lending-service.ts`

Function: `getLoansPageData(options)`

### Loans list

Collection: `loans`

Query through `listForLender()`:

```txt
Query.equal("lender_id", lender.id)
Query.orderDesc("created_at")
Query.select(["$id", "borrower_id", "amount", "interest_rate", "daily_payment", "start_date", "end_date", "status"])
Query.limit(pageSize)
Query.offset((page - 1) * pageSize)
```

How it works:

- Lists only loans for the active lender.
- Uses pagination.
- Retrieves only loan table/modal fields.

### Borrower names for loans

Collection: `borrowers`

Query:

```txt
Query.equal("lender_id", lender.id)
Query.equal("$id", borrowerIds)
Query.limit(borrowerIds.length)
Query.select(["$id", "name"])
```

How it works:

- Fetches borrower names only for loans already returned on the current page.
- Does not scan all borrowers.

## Payments page

Path: `src/backend/services/lending-service.ts`

Function: `getPaymentsPageData(options)`

### Payments list

Collection: `payments`

Query through `listForLender()`:

```txt
Query.equal("lender_id", lender.id)
Query.orderDesc("date")
Query.select(["$id", "loan_id", "collector_id", "amount", "method", "date", "created_at"])
Query.limit(pageSize)
Query.offset((page - 1) * pageSize)
```

How it works:

- Lists one page of payments for the active lender.
- Retrieves only fields needed for the payments table.

### Payment row mapping

Path: `src/backend/services/lending-service.ts`

Function: `mapPaymentDocuments(lenderId, payments)`

After payments are loaded, this helper fetches related data:

Loans:

```txt
Query.equal("lender_id", lenderId)
Query.equal("$id", loanIds)
Query.limit(loanIds.length)
Query.select(["$id", "borrower_id"])
```

Collectors:

```txt
Query.equal("lender_id", lenderId)
Query.equal("$id", collectorIds)
Query.limit(collectorIds.length)
Query.select(["$id", "name"])
```

Borrowers:

```txt
Query.equal("lender_id", lenderId)
Query.equal("$id", borrowerIds)
Query.limit(borrowerIds.length)
Query.select(["$id", "name"])
```

How it works:

- Finds borrower and collector names for only the visible payments.
- Every related lookup is still lender-scoped.
- If a payment points to another lender's loan or collector, that related document will not be returned.

## Loan payments on demand

Path: `src/app/api/loans/[loanId]/payments/route.ts`

Service path: `src/backend/services/lending-service.ts`

Function: `getLoanPaymentDetails(loanId)`

Route: `GET /api/loans/{loanId}/payments`

### Loan ownership and amount query

Collection: `loans`

```txt
Query.equal("lender_id", lender.id)
Query.equal("$id", loanId)
Query.limit(1)
Query.select(["$id", "amount"])
```

How it works:

- Confirms the loan belongs to the active lender.
- Retrieves only the loan amount so remaining balance can be calculated.
- Returns 404 if another lender's loan ID is requested.

### Loan payments query

Collection: `payments`

```txt
Query.equal("lender_id", lender.id)
Query.equal("loan_id", loanId)
Query.orderDesc("date")
Query.limit(5000)
Query.select(["$id", "collector_id", "amount", "method", "date"])
```

How it works:

- Runs only when the user clicks `View payments` in a loan details popup.
- Retrieves payments only for the selected lender-owned loan.
- Sums returned payment amounts for `Total paid`.
- Calculates `Remaining` as `loan.amount - totalPaid`.

Collector name lookup:

```txt
Query.equal("lender_id", lender.id)
Query.equal("$id", collectorIds)
Query.limit(collectorIds.length)
Query.select(["$id", "name"])
```

How it works:

- Retrieves collector names only for collectors attached to that loan's payments.
- Keeps the normal dashboard and loans list queries light.

## Payment CSV export

Path: `src/app/api/exports/payments/route.ts`

Route: `GET /api/exports/payments?start=YYYY-MM-DD&end=YYYY-MM-DD`

Service path: `src/backend/services/lending-service.ts`

Function: `getPaymentsExportData({ startDate, endDate })`

Collection: `payments`

Query:

```txt
Query.equal("lender_id", lender.id)
Query.orderDesc("date")
Query.limit(5000)
Query.select(["$id", "loan_id", "collector_id", "amount", "method", "date", "created_at"])
Query.greaterThanEqual("date", startDateStartIso) // when startDate exists
Query.lessThan("date", endDateNextDayIso)         // when endDate exists
```

How it works:

- Validates date params in the route.
- Retrieves payments for the active lender and selected date range.
- Maps loan/collector/borrower names using `mapPaymentDocuments()`.
- Returns a CSV response.

## Collectors page

Path: `src/backend/services/lending-service.ts`

Function: `getCollectorsPageData(options)`

### Collectors list

Collection: `collectors`

Query through `listForLender()`:

```txt
Query.equal("lender_id", lender.id)
Query.orderDesc("created_at")
Query.select(["$id", "$createdAt", "name", "contact_info", "status", "created_at"])
Query.limit(pageSize)
Query.offset((page - 1) * pageSize)
```

How it works:

- Lists one page of collectors for the active lender.
- Retrieves only list fields.
- Parses `contact_info` into separate Contact phone and Area values for display.

### Active collector count

Collection: `collectors`

Query through `listForLender()`:

```txt
Query.equal("lender_id", lender.id)
Query.equal("status", "active")
Query.limit(1)
Query.select(["$id"])
```

How it works:

- Uses Appwrite `total` for the active count.
- It does not load all active collectors into memory.

## Daily collections page

Path: `src/backend/services/lending-service.ts`

Function: `getDailyCollectionsData(date)`

Collection: `payments`

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

- Retrieves only payments for the selected day and active lender.
- Does not use pagination because this screen is a single-day collection view.
- Maps names using `mapPaymentDocuments()`.

## Create borrower

Path: `src/backend/actions/lending-actions.ts`

Function: `createBorrowerAction(formData)`

Collection: `borrowers`

Write:

```txt
databases.createDocument({
  lender_id: lender.id,
  name,
  business_name,
  contact_info,
  status: "active",
  created_at
})
```

How it works:

- Creates a borrower under the active lender.
- Stores phone/address as JSON in `contact_info`.
- Redirects to the new borrower profile.

## Update borrower

Path: `src/backend/actions/lending-actions.ts`

Function: `updateBorrowerAction(formData)`

Ownership check:

```txt
Collection: borrowers
Query.equal("lender_id", lender.id)
Query.equal("$id", borrowerId)
Query.limit(1)
Query.select(["$id"])
```

Write:

```txt
databases.updateDocument({
  documentId: borrowerId,
  name,
  business_name,
  contact_info,
  status
})
```

Search text refresh:

```txt
Collection: loans
Query.equal("lender_id", lender.id)
Query.equal("borrower_id", borrowerId)
Query.limit(5000)
Query.select(["$id", "search_text"])
```

How it works:

- Confirms the borrower belongs to the active lender.
- Updates borrower profile fields.
- Rebuilds `search_text` for every lender-owned loan attached to that borrower.
- This prevents dashboard loan search from becoming stale after borrower name/contact/address changes.

## Delete borrower

Path: `src/backend/actions/lending-actions.ts`

Function: `deleteBorrowerAction(formData)`

How it works:

- Confirms the borrower belongs to the active lender.
- Finds lender-owned loans for that borrower.
- Deletes lender-owned payments attached to those loans.
- Deletes those loans.
- Deletes the borrower.

Main queries:

```txt
Loans:
Query.equal("lender_id", lender.id)
Query.equal("borrower_id", borrowerId)
Query.limit(5000)
Query.select(["$id"])

Payments:
Query.equal("lender_id", lender.id)
Query.equal("loan_id", loanIds)
Query.limit(5000)
Query.select(["$id"])
```

## Create loan

Path: `src/backend/actions/lending-actions.ts`

Function: `createLoanForBorrowerAction(formData)`

### Borrower ownership check

Collection: `borrowers`

Query:

```txt
Query.equal("lender_id", lender.id)
Query.equal("$id", borrowerId)
Query.limit(1)
Query.select(["$id", "name", "contact_info"])
```

How it works:

- Confirms the borrower belongs to the active lender before creating a loan.
- Stops the write if borrower ownership is wrong.

### Loan create

Collection: `loans`

Write:

```txt
databases.createDocument({
  lender_id: lender.id,
  borrower_id,
  amount,
  interest_rate,
  daily_payment,
  start_date,
  end_date,
  status: "active",
  qr_code,
  search_text,
  created_at
})
```

How it works:

- Stores the loan ID in `qr_code` as a lightweight QR payload.
- The downloadable QR PNG is generated by `GET /api/loans/{loanId}/qr`.
- Generates `search_text` from borrower name/contact/address.
- Saves everything in one loan document.

## Update loan

Path: `src/backend/actions/lending-actions.ts`

Function: `updateLoanAction(formData)`

Ownership check:

```txt
Collection: loans
Query.equal("lender_id", lender.id)
Query.equal("$id", loanId)
Query.limit(1)
Query.select(["$id", "borrower_id"])
```

Write:

```txt
databases.updateDocument({
  documentId: loanId,
  amount,
  interest_rate,
  daily_payment,
  start_date,
  end_date,
  status
})
```

How it works:

- Confirms the loan belongs to the active lender.
- Updates only loan fields.
- Borrower search text does not need to change because borrower fields are unchanged.

## Delete loan

Path: `src/backend/actions/lending-actions.ts`

Function: `deleteLoanAction(formData)`

How it works:

- Confirms the loan belongs to the active lender.
- Deletes lender-owned payments attached to that loan.
- Deletes the loan.

Payment cleanup query:

```txt
Query.equal("lender_id", lender.id)
Query.equal("loan_id", loanId)
Query.limit(5000)
Query.select(["$id"])
```

## Create collector

Path: `src/backend/actions/lending-actions.ts`

Function: `createCollectorAction(formData)`

Collection: `collectors`

Write:

```txt
databases.createDocument({
  lender_id: lender.id,
  name,
  contact_info,
  status,
  created_at
})
```

How it works:

- Creates a collector under the active lender.
- Stores phone/area as JSON in `contact_info`.

## Update collector

Path: `src/backend/actions/lending-actions.ts`

Function: `updateCollectorAction(formData)`

Ownership check:

```txt
Collection: collectors
Query.equal("lender_id", lender.id)
Query.equal("$id", collectorId)
Query.limit(1)
Query.select(["$id"])
```

Write:

```txt
databases.updateDocument({
  documentId: collectorId,
  name,
  contact_info,
  status
})
```

How it works:

- Confirms the collector belongs to the active lender.
- Updates collector name, phone, area, and status.

## Delete collector

Path: `src/backend/actions/lending-actions.ts`

Function: `deleteCollectorAction(formData)`

How it works:

- Confirms the collector belongs to the active lender.
- Deletes the collector document.
- Existing payment history can still keep the collector ID, but the collector name may show as unknown after deletion.

## Update lender profile

Path: `src/backend/actions/lending-actions.ts`

Function: `updateLenderProfileAction(formData)`

Collection: `lenders`

Write:

```txt
databases.updateDocument({
  documentId: lender.id,
  company_name,
  email,
  contact_info,
  status
})
```

How it works:

- Updates the active lender profile.
- Stores phone/address as JSON in `contact_info`.

## Appwrite setup and seed queries

Path: `scripts/setup-appwrite.mjs`

This script runs outside the app to prepare Appwrite.

Main operations:

- `databases.get()` checks if the database exists.
- `databases.create()` creates the database when missing.
- `databases.getCollection()` checks each collection.
- `databases.createCollection()` creates missing collections.
- `databases.getAttribute()` checks each attribute.
- `databases.createStringAttribute()`, `createFloatAttribute()`, `createEnumAttribute()`, `createDatetimeAttribute()` create missing attributes.
- `databases.getIndex()` checks each index.
- `databases.createIndex()` creates missing indexes.
- `users.list(Query.equal("email", user.email))` checks if the seed Appwrite Auth user exists.
- `users.create(user)` creates the seed user when missing.
- `databases.createDocument()` creates seed documents.
- `databases.updateDocument()` updates seed documents when they already exist.

Backfill query:

```txt
Borrowers:
Query.equal("lender_id", lenderId)
Query.limit(5000)

Loans:
Query.equal("lender_id", lenderId)
Query.limit(5000)
```

How it works:

- Loads seed lender borrowers and loans.
- Rebuilds `loans.search_text` from borrower name/contact.
- Updates only loans where the value changed.
