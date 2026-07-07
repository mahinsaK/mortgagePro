# SMS Module

Paths:

- `src/backend/modules/sms/dto.ts`
- `src/backend/modules/sms/controller.ts`
- `src/backend/modules/sms/service.ts`
- `src/backend/modules/sms/__tests__/sms.test.ts`
- `src/backend/actions/sms-actions.ts`
- `src/app/(portal)/sms/page.tsx`

## Purpose

Handles SMS message validation and first-phase sending flow.

## DTO/controller/service layer

The module files validate and prepare SMS sends:

- `toSendSmsDto(input)` validates lender ID, phone number, message, and purpose.
- `SmsController.send(input)` returns success or failure.
- `SmsService.send(dto)` returns a temporary queued result.

The service does not call an external SMS provider yet.

## Current SMS send flow

Path: `src/backend/actions/sms-actions.ts`

Function: `sendManualSmsAction(formData)`

How it works:

- Reads the active lender with `getPrimaryLender()`.
- Sends `lenderId`, `phoneNumber`, `message`, and `purpose: "manual"` to `SmsController`.
- Redirects back to `/sms` with a success or error status.

## Future loan messages

Path: `src/backend/modules/sms/service.ts`

Template helpers:

- `createLoanWelcomeMessage(...)`
- `createLoanCompletedMessage(...)`

These are ready for the next phase where loan creation and loan completion actions can call SMS automatically.

## Current limitation

Phase one does not store SMS logs and does not call a real SMS gateway. Replace the temporary provider result inside `SmsService.send()` when the SMS provider is chosen.
