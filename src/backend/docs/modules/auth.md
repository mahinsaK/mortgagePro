# Auth Module

Paths:

- `src/backend/modules/auth/dto.ts`
- `src/backend/modules/auth/controller.ts`
- `src/backend/modules/auth/service.ts`
- `src/backend/modules/auth/__tests__/auth.test.ts`
- `src/backend/actions/auth-actions.ts`
- `src/backend/services/auth-session-service.ts`
- `src/app/auth/google/route.ts`
- `src/app/auth/google/callback/route.ts`
- `src/app/auth/google/failure/route.ts`

## Purpose

Validates and prepares login, lender registration, and password reset input.

## Current behavior

The pure module files validate and shape auth input. The server actions call Appwrite and handle browser redirects/cookies.

Lenders can also choose Google on the login page. Google sign-in is optional;
email/password login, registration, and password reset remain available.

The current Appwrite Auth seed user is created by:

- `scripts/seed-appwrite-demo-data.mjs`

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
Admin Account.createEmailPasswordSession(email, password)
Query.equal("appwrite_user_id", session.userId)
Query.equal("status", "active")
set mortgagepro_session = session.secret
```

Google login:

```txt
Account.createOAuth2Token(google, fixed success URL, fixed failure URL)
validate short-lived mortgagepro_lender_oauth_state cookie
Account.createSession(userId, one-time secret)
Query.equal("appwrite_user_id", session.userId)
Query.equal("status", "active")
set mortgagepro_session = session.secret
```

Google authentication never accepts a lender ID from the browser. Appwrite
must return the same user ID already stored in the lender's
`appwrite_user_id`. A Google user without an active lender record is rejected,
the new session is revoked, and no application cookie is set.

Registration:

```txt
Users.create(userId, email, password, companyName)
databases.createDocument(lenders, status = "inactive", ...)
redirect to login with "awaiting approval"
```

Registration creates no application session. The owner must review the lender
and change its status to `active` in Appwrite Console before email/password or
Google login is accepted. If lender-document creation fails after the Appwrite
user was created, the action attempts to remove that orphaned user.

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
- Creates one Appwrite session per successful lender login.
- Resolves sessions as anonymous, authenticated, invalid, or unavailable without
  modifying cookies during page rendering.
- Invalid or inactive sessions redirect through `/auth/session/clear`, which
  expires the cookie and returns the lender to login.
- Active lender sessions renew through `/auth/session/refresh` at most once per
  day. Appwrite remains the source of truth for the expiry, with a configured
  maximum of 90 days after the latest renewal.
- Normal logout revokes only the current Appwrite device session. The settings
  action can revoke all lender sessions, and password changes also sign out all
  devices.
- Appwrite outages preserve the cookie and display `/auth/unavailable`.
- `resolvePrimaryLender()` maps the current Appwrite user to
  `lenders.appwrite_user_id`; `getPrimaryLender()` remains the service-level
  compatibility helper.

Collector authentication is separate from Appwrite Auth. See
`modules/collectors.md` for collector username login and rolling 90-day sessions.

## Authentication abuse controls

These controls are currently frozen to avoid Appwrite operation costs.
`AUTH_SECURITY_CONTROLS_ENABLED` defaults to `false`; in that state every
authentication attempt is allowed past this optional layer and security-event
recording returns immediately without database reads, writes, or structured
event logs. The collections and implementation remain available for later use.

The behavior below applies only when `AUTH_SECURITY_CONTROLS_ENABLED=true` and
a valid `SECURITY_MONITORING_SECRET` is configured.

Authentication attempts use shared Appwrite counters rather than per-server
memory, so separate Vercel instances see the same windows:

- lender and collector login: 8 attempts per identity and 30 per IP in 15
  minutes, followed by a 15-minute block;
- Google OAuth start: 30 requests per IP per hour;
- password reset: 5 requests per identity and IP per hour; and
- lender registration: 5 requests per IP per hour.

A successful password or collector login clears the identity counter but keeps
the IP window. Authentication fails closed when the counter store is
unavailable. Event recording is best effort and cannot block a valid login.
Raw IP addresses, emails, and usernames are never stored in the security
collections; `SECURITY_MONITORING_SECRET` HMAC-hashes them before persistence.

## Google provider setup

1. Set `APP_BASE_URL=http://localhost:3000` locally. In Vercel, set it to the
   canonical production HTTPS origin with no trailing path, query, or fragment.
2. In Google Cloud Console, configure the OAuth consent screen and create an
   OAuth 2.0 Client ID with application type **Web application**.
3. In the Appwrite console, open **Auth**, enable the **Google** OAuth provider,
   and copy the Appwrite callback URL shown there.
4. Add that exact Appwrite callback URL to Google's **Authorized redirect
   URIs**, then store the Google client ID and client secret in the Appwrite
   provider settings. Do not add the Google client secret to `.env.local` or
   Vercel.
5. In Appwrite project platforms, register `localhost` for local development
   and the hostname from `APP_BASE_URL` for production. Register a preview
   hostname separately before testing OAuth on a Vercel preview deployment.
6. Sign in using a Google account with the same email as an existing lender's
   Appwrite Auth account. Appwrite links the OAuth identity to that existing
   user; the application does not create lender profiles from Google logins.

The success callback receives a one-time Appwrite token, exchanges it on the
server, clears the OAuth state cookie, and redirects to a clean dashboard URL.
The token and resulting session secret must never be logged.
