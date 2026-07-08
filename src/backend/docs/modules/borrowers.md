# Borrowers Module

Paths:

- `src/backend/modules/borrowers/dto.ts`
- `src/backend/modules/borrowers/controller.ts`
- `src/backend/modules/borrowers/service.ts`
- `src/backend/modules/borrowers/__tests__/borrowers.test.ts`
- `src/backend/actions/lending-actions.ts`
- `src/backend/services/lending-service.ts`

## Purpose

Manages borrower data owned by a lender.

## DTO/controller/service layer

The module files validate and prepare borrower payloads:

- `toCreateBorrowerDto(input)` validates lender ID, name, business name, phone, address, and status.
- `BorrowerController.create(input)` returns success or failure.
- `BorrowerService.prepareCreate(dto)` creates the document-shaped payload.

These files do not call Appwrite directly.

## Create borrower write

Path: `src/backend/actions/lending-actions.ts`

Function: `createBorrowerAction(formData)`

Writes to the `borrowers` collection:

```txt
lender_id: active lender ID
name
business_name
contact: phone/contact number
address
search_text: generated searchable text for SMS borrower search
status: active
created_at
```

After create, it revalidates `/borrowers` and redirects to `/borrowers/{borrowerId}`.

## Update borrower write

Path: `src/backend/actions/lending-actions.ts`

Function: `updateBorrowerAction(formData)`

How it works:

- Verifies the borrower belongs to the active lender.
- Updates borrower name, business name, phone, address, and status.
- Rebuilds `borrowers.search_text`.
- Rebuilds `loans.search_text` for every loan owned by this lender and this borrower.

This fixes stale dashboard search results when borrower details change.

## Delete borrower write

Path: `src/backend/actions/lending-actions.ts`

Function: `deleteBorrowerAction(formData)`

How it works:

- Verifies lender ownership.
- Deletes related payments for the borrower's loans.
- Deletes the borrower's loans.
- Deletes the borrower.

## Borrowers list query

Path: `src/backend/services/lending-service.ts`

Function: `getBorrowersPageData(options)`

Query:

```txt
Query.equal("lender_id", lender.id)
Query.orderDesc("created_at")
Query.select(["$id", "$createdAt", "name", "business_name", "contact", "address", "status", "created_at"])
Query.limit(pageSize)
Query.offset((page - 1) * pageSize)
```

How it works:

- Retrieves only the active lender's borrowers.
- Uses pagination.
- Does not fetch loan data for the list.

## Borrower profile query

Path: `src/backend/services/lending-service.ts`

Function: `getBorrowerProfileData(borrowerId)`

Borrower query:

```txt
Query.equal("lender_id", lender.id)
Query.equal("$id", borrowerId)
Query.limit(1)
Query.select(["$id", "$createdAt", "name", "business_name", "contact", "address", "status", "created_at"])
```

Loan query:

```txt
Query.equal("lender_id", lender.id)
Query.equal("borrower_id", borrowerId)
Query.limit(8)
Query.offset((page - 1) * 8)
Query.select(["$id", "borrower_id", "amount", "interest_rate", "daily_payment", "start_date", "end_date", "status"])
```

How it works:

- First confirms the borrower belongs to the active lender.
- Then retrieves that borrower's loans, 8 loans per page.
- Uses Appwrite `loans.total` for total loan count.
- Uses a separate lender-scoped active-loan count query for active loan count.
- Does not retrieve the heavy QR image value; QR PNG downloads are generated only when clicked.
- If the borrower does not belong to the lender, the profile returns no borrower.
