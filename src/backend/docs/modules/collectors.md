# Collectors Module

Paths:

- `src/backend/modules/collectors/dto.ts`
- `src/backend/modules/collectors/controller.ts`
- `src/backend/modules/collectors/service.ts`
- `src/backend/modules/collectors/__tests__/collectors.test.ts`
- `src/backend/actions/lending-actions.ts`
- `src/backend/actions/collector-actions.ts`
- `src/backend/services/collector-auth-service.ts`
- `src/backend/services/lending-service.ts`

## Purpose

Manages collectors owned by a lender.

## DTO/controller/service layer

The module files validate and prepare collector payloads:

- `toCreateCollectorDto(input)` validates lender ID, name, phone, area, and status.
- `CollectorController.create(input)` returns success or failure.
- `CollectorService.prepareCreate(dto)` creates the document-shaped payload.

These files do not call Appwrite directly.

## Create collector write

Path: `src/backend/actions/lending-actions.ts`

Function: `createCollectorAction(formData)`

Writes to the `collectors` collection:

```txt
lender_id: active lender ID
name
contact_info: JSON string with phone/area
password_hash: salted scrypt hash
session_version: 1
status
created_at
```

After create, it revalidates `/collectors`.

## Update collector write

Path: `src/backend/actions/lending-actions.ts`

Function: `updateCollectorAction(formData)`

How it works:

- Verifies the collector belongs to the active lender.
- Updates collector name, phone, area, status, and optional password.
- Increments `session_version` after password or status changes, immediately
  invalidating previously issued collector sessions.

## Delete collector write

Path: `src/backend/actions/lending-actions.ts`

Function: `deleteCollectorAction(formData)`

How it works:

- Verifies the collector belongs to the active lender.
- Deletes the collector document.
- Payment history can keep the old collector ID, but the collector name can become unknown after deletion.

## Collectors list query

Path: `src/backend/services/lending-service.ts`

Function: `getCollectorsPageData(options)`

Query:

```txt
Query.equal("lender_id", lender.id)
Query.orderDesc("created_at")
Query.select(["$id", "$createdAt", "name", "contact_info", "status", "created_at"])
Query.limit(pageSize)
Query.offset((page - 1) * pageSize)
```

How it works:

- Retrieves only collectors for the active lender.
- Uses pagination.
- Fetches only list fields.
- Displays phone and area as separate columns by parsing `contact_info`.
- Displays the collector document ID with a copy control because the ID is the
  collector login identifier.

## Active collector count query

Path: `src/backend/services/lending-service.ts`

Function: `getCollectorsPageData(options)`

Query:

```txt
Query.equal("lender_id", lender.id)
Query.equal("status", "active")
Query.limit(1)
Query.select(["$id"])
```

How it works:

- Uses Appwrite `total` to count active collectors.
- Avoids loading all active collector rows.

## Collector login and protected access

Collectors sign in with the globally unique collector document ID plus their
password. Name-based login is not supported.

The `mortgagepro_collector_session` cookie is HTTP-only, SameSite Lax, Secure in
production, signed with the mandatory `COLLECTOR_SESSION_SECRET`, and expires
after 12 hours. Claims include collector ID, lender ID, issue time, expiry, and
`sessionVersion`.

`requireActiveCollectorPrincipal()` verifies the HMAC with a timing-safe
comparison, checks expiry, reloads the collector by both collector ID and
lender ID, requires active status, and compares the database session version.
The scan page, loan lookup route, and payment action all use this resolver.

Scanned loan lookup is a combined loan-ID/lender-ID query. Another lender's
loan is returned as `404`, just like an unknown loan ID.
