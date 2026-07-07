# SMS Module

Paths:

- `src/backend/modules/sms/dto.ts`
- `src/backend/modules/sms/controller.ts`
- `src/backend/modules/sms/service.ts`
- `src/backend/modules/sms/__tests__/sms.test.ts`
- `src/backend/actions/sms-actions.ts`
- `src/backend/services/sms-recipient-service.ts`
- `src/backend/services/textlk-sms-provider.ts`
- `src/app/api/sms/borrowers/search/route.ts`
- `src/app/(portal)/sms/page.tsx`
- `src/frontend/components/sms/sms-workbench.tsx`

## Purpose

Handles SMS message validation, templates, and Text.lk-backed sending.

## DTO/controller/service layer

The module files validate and prepare SMS sends:

- `toSendSmsDto(input)` validates lender ID, phone number, message, and purpose.
- `SmsController.send(input)` returns success or failure.
- `SmsService.send(dto)` delegates delivery to an injected `SmsProvider`.

The module does not know Text.lk request details. The Text.lk gateway lives in `src/backend/services/textlk-sms-provider.ts`.

## Text.lk configuration

Path: `.env.local`

Required variables:

```txt
TEXTLK_API_TOKEN
TEXTLK_SENDER_ID
TEXTLK_API_URL
```

Only placeholders should be committed in `.env.example`.

## Current SMS send flow

Path: `src/backend/actions/sms-actions.ts`

Functions:

- `sendManualSmsAction(formData)`
- `sendSelectedSmsAction(formData)`
- `sendAllBorrowersSmsAction(formData)`

How it works:

- Reads the active lender with `getPrimaryLender()`.
- Creates `SmsController(new SmsService(new TextlkSmsProvider()))`.
- Sends `lenderId`, `phoneNumber`, `message`, and `purpose: "manual"` to the controller.
- Sends in batches of 20 numbers so bulk sends do not create one large provider burst.
- Redirects back to `/sms` with a success or error status.

## Borrower recipient search

Paths:

- `src/app/api/sms/borrowers/search/route.ts`
- `src/backend/services/sms-recipient-service.ts`

Query:

```txt
Query.equal("lender_id", lender.id)
Query.search("search_text", normalizedQuery)
Query.limit(8)
Query.select(["$id", "name", "business_name", "contact_info"])
```

How it works:

- The SMS page does not load all borrowers.
- The lender types borrower name/contact/address and clicks Search.
- The API returns only matching borrower recipients for the active lender.
- The browser keeps selected borrowers in a temporary array until `Send selected`.
- `Send all borrowers` does not use the browser array. It asks the backend for all borrower phone numbers under the active lender when clicked.

## Frontend behavior

Path: `src/frontend/components/sms/sms-workbench.tsx`

How it works:

- The SMS page does not list all borrowers/customers.
- Borrower search results can be added to a temporary browser array.
- The selected array is posted only when the lender clicks `Send selected`.
- `Send all borrowers` retrieves lender-owned borrower phone numbers on the server only when clicked.
- Quick SMS sends one typed number directly.
- Templates only fill the message text in the browser.

## Future loan messages

Path: `src/backend/modules/sms/service.ts`

Template helpers:

- `createLoanWelcomeMessage(...)`
- `createLoanCompletedMessage(...)`

These are ready for the next phase where loan creation and loan completion actions can call SMS automatically.

## Current limitation

Phase one does not store SMS logs. Add an `sms_logs` collection or notification log later if sent-message audit history becomes required.
