# Notifications Module

Paths:

- `src/backend/modules/notifications/dto.ts`
- `src/backend/modules/notifications/controller.ts`
- `src/backend/modules/notifications/service.ts`
- `src/backend/modules/notifications/__tests__/notifications.test.ts`

## Purpose

Prepares notification data for a future notification feature.

## Current behavior

This module does not write to Appwrite yet. The project currently keeps only five core collections:

- `lenders`
- `borrowers`
- `collectors`
- `loans`
- `payments`

## DTO/controller/service layer

- `toCreateNotificationDto(input)` validates lender ID, title, body, and channel.
- Channel defaults to `in_app` unless it is `email`, `sms`, or `in_app`.
- `NotificationController.create(input)` returns success or failure.
- `NotificationService.prepareCreate(dto)` returns a draft notification payload.

## Database queries

No runtime database query is used by this module yet.

When notification storage is added later, create a separate collection only if the product needs saved notification history or templates.
