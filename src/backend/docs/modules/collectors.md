# Collectors Module

Paths:

- `src/backend/modules/collectors/dto.ts`
- `src/backend/modules/collectors/controller.ts`
- `src/backend/modules/collectors/service.ts`
- `src/backend/modules/collectors/__tests__/collectors.test.ts`
- `src/backend/actions/lending-actions.ts`
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
status
created_at
```

After create, it revalidates `/collectors`.

## Update collector write

Path: `src/backend/actions/lending-actions.ts`

Function: `updateCollectorAction(formData)`

How it works:

- Verifies the collector belongs to the active lender.
- Updates collector name, phone, area, and status.

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
