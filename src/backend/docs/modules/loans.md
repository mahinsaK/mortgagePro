# Loans Module

Paths:

- `src/backend/modules/loans/dto.ts`
- `src/backend/modules/loans/controller.ts`
- `src/backend/modules/loans/service.ts`
- `src/backend/modules/loans/__tests__/loans.test.ts`
- `src/backend/actions/lending-actions.ts`
- `src/backend/services/lending-service.ts`
- `src/backend/services/qr-code-service.ts`
- `src/backend/services/search-text-service.ts`

## Purpose

Manages loan creation, loan listing, borrower loan cards, QR codes, and dashboard search data.

## DTO/controller/service layer

The module files validate and prepare loan payloads:

- `toCreateLoanDto(input)` validates lender ID, borrower ID, amount, interest rate, daily payment, start date, and end date.
- It rejects an end date that is not after the start date.
- `LoanController.create(input)` requires QR payload data and returns success or failure.
- `LoanService.prepareCreate(dto, qrCode)` creates the document-shaped payload.

These files do not call Appwrite directly.

## Create loan flow

Path: `src/backend/actions/lending-actions.ts`

Function: `createLoanForBorrowerAction(formData)`

Step 1: confirm borrower ownership.

```txt
Collection: borrowers
Query.equal("lender_id", lender.id)
Query.equal("$id", borrowerId)
Query.limit(1)
Query.select(["$id", "name", "contact_info"])
```

Step 2: generate data.

- New runtime loan creation stores the loan ID as the lightweight QR payload.
- `createLoanSearchText(...)` creates searchable text from borrower name/contact/address.

Step 3: create the loan document.

```txt
Collection: loans
lender_id
borrower_id
amount
interest_rate
daily_payment
start_date
end_date
status: active
qr_code: loan ID payload
search_text
created_at
```

## Update loan flow

Path: `src/backend/actions/lending-actions.ts`

Function: `updateLoanAction(formData)`

How it works:

- Verifies the loan belongs to the active lender.
- Updates amount, interest rate, daily payment, dates, and status.

## Delete loan flow

Path: `src/backend/actions/lending-actions.ts`

Function: `deleteLoanAction(formData)`

How it works:

- Verifies the loan belongs to the active lender.
- Deletes payments attached to that lender-owned loan.
- Deletes the loan.

## Loans page query

Path: `src/backend/services/lending-service.ts`

Function: `getLoansPageData(options)`

Query:

```txt
Query.equal("lender_id", lender.id)
Query.orderDesc("created_at")
Query.select(["$id", "borrower_id", "amount", "interest_rate", "daily_payment", "start_date", "end_date", "status"])
Query.limit(pageSize)
Query.offset((page - 1) * pageSize)
```

Then borrower names are fetched:

```txt
Query.equal("lender_id", lender.id)
Query.equal("$id", borrowerIds)
Query.limit(borrowerIds.length)
Query.select(["$id", "name"])
```

## Loan payments in popup

Path: `src/app/api/loans/[loanId]/payments/route.ts`

Function: `getLoanPaymentDetails(loanId)`

How it works:

- The dashboard and loans page do not load payment rows by default.
- When `View payments` is clicked, the client calls `/api/loans/{loanId}/payments`.
- The backend verifies `lender_id` and `loan_id`.
- The response includes payment rows, `totalPaid`, and `remaining`.

## Borrower profile loans query

Path: `src/backend/services/lending-service.ts`

Function: `getBorrowerProfileData(borrowerId)`

Query:

```txt
Query.equal("lender_id", lender.id)
Query.equal("borrower_id", borrowerId)
Query.limit(8)
Query.offset((page - 1) * 8)
Query.select(["$id", "borrower_id", "amount", "interest_rate", "daily_payment", "start_date", "end_date", "status"])
```

This profile query is paginated separately from the main loans page so one borrower profile does not load too many loan cards at once.

## Dashboard loan search query

Path: `src/backend/services/dashboard-service.ts`

Function: `getLenderDashboardData(options)`

Query:

```txt
Query.equal("lender_id", lender.id)
Query.search("search_text", normalizedQuery)
Query.orderDesc("created_at")
Query.limit(15)
Query.offset((page - 1) * 15)
Query.select(["$id", "borrower_id", "amount", "daily_payment", "status", "end_date"])
```

This is how the search bar finds loans by borrower name/contact/address without loading all loans.

## QR code

Path: `src/backend/services/qr-code-service.ts`

`generateLoanQrPng(loanId)` uses `QRCode.toBuffer(loanId)` when the user downloads the QR.

The app does not load `loans.qr_code` for loan lists or borrower profile cards anymore. New loans store the loan ID in `loans.qr_code`, and `GET /api/loans/{loanId}/qr` validates lender access before generating the PNG download.

## Search text

Path: `src/backend/services/search-text-service.ts`

`createLoanSearchText(...)`:

- Parses borrower contact JSON.
- Combines borrower name, phone, address, and other contact values.
- Normalizes text to lowercase letters/numbers.
- Adds middle fragments of words and numbers from length 3 to 12.
- Stores the final string in `loans.search_text`.

Example:

```txt
Avery Johnson, +1 555 0101
```

can match searches like:

```txt
avery
ver
john
555
0101
```
