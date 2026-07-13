# Database Queries

This file lists the Appwrite database queries and writes currently used by the backend.

All borrower, collector, loan, and payment operations described below run
through `tenant-data-service.ts`. That layer always prepends
`Query.equal("lender_id", lenderId)`, overwrites caller-supplied tenant IDs on
create, verifies ownership before update/delete, and removes `lender_id` from
update payloads. Direct SDK snippets below are conceptual operation details;
they do not bypass that shared boundary.

## Appwrite client

Path: `src/backend/appwrite/server-client.ts`

Creates one server-side Appwrite client:

```ts
export const databases = new Databases(client);
export const users = new Users(client);
export function createAccountClient(session?: string) { ... }
export { ID, Query };
```

All services import this client and use env values from `src/backend/appwrite/config.ts`.

## Lender lookup

Path: `src/backend/services/lender-service.ts`

Function: `getPrimaryLender()`

Collection: `lenders`

Query:

```txt
Query.equal("appwrite_user_id", currentAppwriteUser.$id)
Query.equal("status", "active")
Query.limit(1)
```

How it works:

- Reads the current Appwrite user from the HTTP-only session cookie.
- Finds the active lender document linked to that Appwrite user.
- Returns a simple lender profile object including display currency.
- Returns `null` if there is no Appwrite API key, no valid session, or no active linked lender document.

## Auth writes

Path: `src/backend/actions/auth-actions.ts`

Login:

```txt
Account.createEmailPasswordSession(email, password)
Query.equal("appwrite_user_id", session.userId)
Query.equal("status", "active")
```

Stores the returned Appwrite session secret in an HTTP-only cookie.

Registration:

```txt
Users.create(userId, email, password, companyName)
databases.createDocument(lenders, {
  appwrite_user_id,
  company_name,
  email,
  contact_info,
  status: "active",
  currency: "USD",
  created_at
})
Account.createEmailPasswordSession(email, password)
```

Password reset:

```txt
Account.createRecovery(email, resetUrl)
Account.updateRecovery(userId, secret, password)
```

Logout:

```txt
Account.deleteSession("current")
```

Then clears the local HTTP-only session cookie.

## Dashboard CSV exports

Path: `src/app/api/exports/payments/route.ts`

Function: `GET(request)`

Collection: `payments`

Query through `getPaymentsExportData()`:

```txt
Query.equal("lender_id", lender.id)
Query.orderDesc("date")
Query.orderDesc("$createdAt")
Query.limit(5000)
Query.select(["$id", "loan_id", "collector_id", "amount", "method", "date", "created_at"])
Query.greaterThanEqual("date", selectedStartIso)
Query.lessThan("date", selectedEndTomorrowIso)
```

How it works:

- Exports only payments for the active lender and selected date range.
- Looks up borrower and collector names for only the returned payment rows.
- Adds a `TOTAL` row using the raw numeric payment amount values.

Path: `src/app/api/exports/borrowers/route.ts`

Function: `GET(request)`

Collection: `borrowers`

Query through `getBorrowersExportData()`:

```txt
Query.equal("lender_id", lender.id)
Query.orderDesc("created_at")
Query.limit(5000)
Query.select(["$id", "$createdAt", "name", "business_name", "contact", "address", "status", "created_at"])
Query.greaterThanEqual("created_at", selectedStartIso)
Query.lessThan("created_at", selectedEndTomorrowIso)
```

How it works:

- Exports only borrowers created by the active lender in the selected date range.
- Retrieves contact fields needed for the report only.

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
Query.select(["$id", "borrower_id", "amount", "total_paid", "remaining_amount", "daily_payment", "status", "end_date"])
```

How it works:

- Retrieves only loans that belong to the active lender.
- Uses loan `search_text` fulltext search first when the user searches.
- If that search returns no matches, searches borrower `name`, `address`, and `contact`, then lists loans for matching borrower IDs.
- Retrieves one page only, default 15 loans.
- Retrieves only the fields needed for the dashboard table.

After this, it fetches matching borrowers by the returned `borrower_id` values:

```txt
Query.equal("lender_id", lender.id)
Query.equal("$id", borrowerIds)
Query.limit(borrowerIds.length)
Query.select(["$id", "name", "contact", "address"])
```

That second query is used only to show borrower name and phone/contact beside each loan.

### Total borrower count

Collection: `borrowers`

Query:

```txt
Query.equal("lender_id", lender.id)
Query.limit(1)
Query.select(["$id"])
```

How it works:

- Appwrite returns `total`.
- The dashboard uses `totalBorrowers.total`.
- It does not load all borrowers into memory.

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
Query.select(["$id", "$createdAt", "name", "business_name", "contact", "address", "status", "created_at"])
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
Query.select(["$id", "$createdAt", "name", "business_name", "contact", "address", "status", "created_at"])
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
Query.select(["$id", "borrower_id", "amount", "interest_rate", "daily_payment", "total_paid", "remaining_amount", "start_date", "end_date", "status"])
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
Query.select(["$id", "borrower_id", "amount", "interest_rate", "daily_payment", "total_paid", "remaining_amount", "start_date", "end_date", "status"])
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
Query.orderDesc("$createdAt")
Query.select(["$id", "loan_id", "collector_id", "amount", "method", "date", "created_at"])
Query.limit(pageSize)
Query.offset((page - 1) * pageSize)
```

How it works:

- Lists one page of payments for the active lender.
- Uses creation time as a secondary descending sort so same-day payments stay
  newest-first.
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
Query.select(["$id", "amount", "total_paid", "remaining_amount"])
```

How it works:

- Confirms the loan belongs to the active lender.
- Retrieves the loan amount and stored totals for the payment summary.
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
- Reads `totalPaid` and `remaining` from the loan document totals.

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
- The collector dropdown on the page is a local/client filter over the already-loaded day payments.
- The daily CSV export uses the currently filtered rows and does not run a second database query.
- Filtered CSV filenames include the collector name, for example `daily_collections_2026-07-07_Jordan_Lee.csv`.

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
  contact,
  address,
  search_text,
  status: "active",
  created_at
})
```

How it works:

- Creates a borrower under the active lender.
- Stores phone/contact number in `contact` and address in `address`.
- Builds borrower `search_text` from name, contact, and address.
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
  contact,
  address,
  search_text,
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
Query.select(["$id", "name", "contact", "address"])
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
  total_paid: 0,
  remaining_amount: amount,
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
Query.select(["$id", "borrower_id", "total_paid"])
```

Write:

```txt
databases.updateDocument({
  documentId: loanId,
  amount,
  interest_rate,
  daily_payment,
  remaining_amount,
  start_date,
  end_date,
  status
})
```

How it works:

- Confirms the loan belongs to the active lender.
- Updates loan fields and recalculates `remaining_amount` from stored `total_paid`.
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

## Record payment and update loan totals

Path: `src/backend/services/payment-recording-service.ts`

Function: `recordLoanPayment(input)`

Loan ownership query:

```txt
Query.equal("lender_id", lender.id)
Query.equal("$id", loanId)
Query.limit(1)
Query.select(["$id", "amount", "total_paid", "status"])
```

Collector ownership query:

```txt
Query.equal("lender_id", lender.id)
Query.equal("$id", collectorId)
Query.limit(1)
Query.select(["$id"])
```

Writes:

```txt
payments: create payment document
loans: update total_paid, remaining_amount, status
```

How it works:

- Confirms both loan and collector belong to the active lender.
- Creates the payment document.
- Uses `PaymentService.calculateLoanTotals(...)`.
- Updates the loan totals and marks the loan completed when the remaining balance is zero.

## Create collector

Path: `src/backend/actions/lending-actions.ts`

Function: `createCollectorAction(previousState, formData)`

Collection: `collectors`

Write:

```txt
databases.createDocument({
  documentId: username,
  lender_id: lender.id,
  name,
  contact_info,
  password_hash,
  status,
  created_at
})
```

How it works:

- Validates the new lowercase username and checks `$id` globally.
- Uses the globally unique username as the permanent collector document ID.
- Returns an inline username error for pre-existing IDs and Appwrite `409`
  creation races.
- Creates a collector under the active lender.
- Stores phone/area as JSON in `contact_info`.
- Hashes only the password with salted `scrypt`; the username is not part of
  the password hash.

Availability query used by the authenticated lender form:

```txt
Query.equal("$id", username)
Query.limit(1)
Query.select(["$id"])
```

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
- Does not update the permanent username/document ID.

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

## SMS borrower search

Path: `src/backend/services/sms-recipient-service.ts`

Function: `searchBorrowerSmsRecipients(query)`

Collection: `borrowers`

Query:

```txt
Query.equal("lender_id", lender.id)
Query.or([
  Query.search("name", normalizedQuery),
  Query.search("business_name", normalizedQuery),
  Query.search("contact", normalizedQuery)
])
Query.limit(8)
Query.select(["$id", "name", "business_name", "contact"])
```

How it works:

- Runs only after the lender types a search and clicks Search.
- Retrieves only matching borrowers under the active lender.
- Reads only the fields needed to show a recipient result and send SMS.
- Uses indexed borrower fields, avoiding a full borrower list read in the browser.

## SMS all borrowers send

Path: `src/backend/services/sms-recipient-service.ts`

Function: `getAllBorrowerSmsRecipients()`

Collection: `borrowers`

Query:

```txt
Query.equal("lender_id", lender.id)
Query.limit(5000)
Query.select(["$id", "name", "business_name", "contact"])
```

How it works:

- Runs only when the lender clicks `Send all borrowers`.
- Retrieves lender-owned borrower phone/contact data on the server.
- Does not list all borrowers on the SMS page.
- The SMS action sends provider requests in batches of 20.

## Appwrite setup and seed queries

Path: `scripts/setup-appwrite.mjs`

This script runs outside the app to prepare Appwrite.

Main operations:

- `databases.get()` checks if the database exists.
- `databases.create()` creates the database when missing.
- `databases.getCollection()` checks each collection.
- `databases.createCollection()` creates missing collections.
- `databases.updateCollection()` reconciles existing collections to empty
  client permissions with `documentSecurity: false`.
- `databases.getAttribute()` checks each attribute.
- `databases.createStringAttribute()`, `createIntegerAttribute()`,
  `createFloatAttribute()`, `createEnumAttribute()`, and
  `createDatetimeAttribute()` create missing attributes.
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
Query.select(["$id", "name", "contact", "address", "search_text"])

Loans:
Query.equal("lender_id", lenderId)
Query.limit(5000)
```

How it works:

- Loads seed lender borrowers and loans.
- Rebuilds `borrowers.search_text` from borrower name, contact, and address.
- Rebuilds `loans.search_text` from borrower name, contact, and address.
- Updates only documents where the value changed.
