# Lenders Module

Paths:

- `src/features/lenders/domain/dto.ts`
- `src/features/lenders/domain/controller.ts`
- `src/features/lenders/domain/service.ts`
- `src/features/lenders/domain/__tests__/lenders.test.ts`
- `src/features/settings/server/lender-settings-actions.ts`
- `src/server/services/lender-service.ts`

## Purpose

Manages lender profile information.

## DTO/controller/service layer

The module files validate and prepare lender profile updates:

- `toUpdateLenderProfileDto(input)` validates company name, email, phone, address, status, and currency.
- `LenderController.updateProfile(input)` returns success or failure.
- `LenderService.prepareProfileUpdate(dto)` creates the document-shaped update payload.

These files do not call Appwrite directly.

## Current lender lookup

Path: `src/server/services/lender-service.ts`

Function: `getPrimaryLender()`

Query:

```txt
Query.equal("appwrite_user_id", currentAppwriteUser.$id)
Query.equal("status", "active")
Query.limit(1)
```

How it works:

- Reads the current Appwrite user from the HTTP-only session cookie.
- Reads the active lender document linked by `appwrite_user_id`.
- Returns `{ id, appwriteUserId, companyName, email, contactInfo, status, currency }`.
- Returns `null` when no API key, valid session, or active linked lender document exists.

## Update lender profile write

Path: `src/features/settings/server/lender-settings-actions.ts`

Function: `updateLenderProfileAction(formData)`

Writes to the `lenders` collection:

```txt
documentId: active lender ID
company_name
email
contact_info: JSON string with phone/address
status
currency
```

After update, it revalidates `/settings` and `/dashboard/lender`.

## Change lender password

Path: `src/features/settings/server/lender-settings-actions.ts`

Function: `updateLenderPasswordAction(formData)`

How it works:

- Reads the active lender profile.
- Uses `lender.appwriteUserId` to call Appwrite Auth.
- Calls `users.updatePassword({ userId, password })`.
- Requires password confirmation and a minimum length of 8 characters.
