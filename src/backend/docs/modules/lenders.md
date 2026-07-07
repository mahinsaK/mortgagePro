# Lenders Module

Paths:

- `src/backend/modules/lenders/dto.ts`
- `src/backend/modules/lenders/controller.ts`
- `src/backend/modules/lenders/service.ts`
- `src/backend/modules/lenders/__tests__/lenders.test.ts`
- `src/backend/actions/lending-actions.ts`
- `src/backend/services/lender-service.ts`

## Purpose

Manages lender profile information.

## DTO/controller/service layer

The module files validate and prepare lender profile updates:

- `toUpdateLenderProfileDto(input)` validates company name, email, phone, address, and status.
- `LenderController.updateProfile(input)` returns success or failure.
- `LenderService.prepareProfileUpdate(dto)` creates the document-shaped update payload.

These files do not call Appwrite directly.

## Current lender lookup

Path: `src/backend/services/lender-service.ts`

Function: `getPrimaryLender()`

Query:

```txt
Query.limit(1)
```

How it works:

- Reads the first lender document.
- Returns `{ id, companyName, email, contactInfo, status }`.
- Returns `null` when no API key or lender document exists.

Production note:

- Replace this with a lookup by `appwrite_user_id` from the logged-in Appwrite Auth user.

## Update lender profile write

Path: `src/backend/actions/lending-actions.ts`

Function: `updateLenderProfileAction(formData)`

Writes to the `lenders` collection:

```txt
documentId: active lender ID
company_name
email
contact_info: JSON string with phone/address
status
```

After update, it revalidates `/settings` and `/dashboard/lender`.
