# Auth Module

Paths:

- `src/backend/modules/auth/dto.ts`
- `src/backend/modules/auth/controller.ts`
- `src/backend/modules/auth/service.ts`
- `src/backend/modules/auth/__tests__/auth.test.ts`

## Purpose

Validates and prepares login, lender registration, and password reset input.

## Current behavior

This module does not call Appwrite directly yet. It shapes data for the future auth flow.

The current Appwrite Auth seed user is created by:

- `scripts/setup-appwrite.mjs`

## DTOs

- `toLoginDto(input)`: requires email and password.
- `toRegisterLenderDto(input)`: requires email, password, and company name.
- `toPasswordResetDto(input)`: requires email.

## Controller

`AuthController` catches validation errors and returns a shared result object:

- `login(input)`
- `registerLender(input)`
- `requestPasswordReset(input)`

## Service

`AuthService` returns clean auth payloads:

- login payload
- lender registration payload
- password reset payload

## Database queries

No runtime database query is used by this module yet.

Future production flow should use Appwrite Auth for login/register, then create or fetch a matching document in the `lenders` collection by `appwrite_user_id`.
