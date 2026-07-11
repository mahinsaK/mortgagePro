# Auth Module

Paths:

- `src/backend/modules/auth/dto.ts`
- `src/backend/modules/auth/controller.ts`
- `src/backend/modules/auth/service.ts`
- `src/backend/modules/auth/__tests__/auth.test.ts`
- `src/backend/actions/auth-actions.ts`
- `src/backend/services/auth-session-service.ts`

## Purpose

Validates and prepares login, lender registration, and password reset input.

## Current behavior

The pure module files validate and shape auth input. The server actions call Appwrite and handle browser redirects/cookies.

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

Login:

```txt
Account.createEmailPasswordSession(email, password)
Query.equal("appwrite_user_id", session.userId)
Query.equal("status", "active")
```

Registration:

```txt
Users.create(userId, email, password, companyName)
databases.createDocument(lenders, ...)
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

Session handling:

- Stores the Appwrite session secret in an HTTP-only `mortgagepro_session` cookie.
- `getPrimaryLender()` maps the current Appwrite user to `lenders.appwrite_user_id`.

Collector authentication is separate from Appwrite Auth. See
`modules/collectors.md` for collector ID login and 12-hour revocable sessions.
