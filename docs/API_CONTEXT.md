# API Context

## Overview

The platform uses an **Express 5 REST API Backend** (`apps/api`) running in Node.js ESM mode, serving JSON endpoints to the **Next.js App Router Frontend** (`apps/web`) and external clients.

- **Backend Entry File:** [`apps/api/src/server.ts`](file:///d:/nfc-new/nfc-card-platform/apps/api/src/server.ts)
- **Backend App Config:** [`apps/api/src/app.ts`](file:///d:/nfc-new/nfc-card-platform/apps/api/src/app.ts)
- **Frontend API Base URL:** Configured via `NEXT_PUBLIC_API_URL` (e.g. `http://localhost:4000`)

---

## Route Structure (`apps/api/src/`)

```
apps/api/src/
├── app.ts                 ← App mounting & top-level middleware
├── server.ts              ← HTTP server binding & job workers
├── auth/                  ← Auth routes (/auth/send-otp, /auth/verify-otp, /auth/recover) [F-002, F-003]
├── routes/
│   ├── cards.ts           ← Public token lookup & claiming (/cards/*) [F-007, F-015]
│   ├── profile.ts         ← Customer profile CRUD & lifecycle (/profile/*) [F-008, F-015]
│   ├── templates.ts       ← Template listing (/templates) [F-009]
│   ├── analytics.ts       ← Customer & event analytics (/analytics/*) [F-014]
│   ├── upload.ts          ← S3 File upload (/upload/*) [F-016]
│   └── admin/
│       ├── cards.ts       ← Admin card CRUD, generation, lifecycle [F-005, F-006]
│       ├── cardTypes.ts   ← Admin card type management [F-004]
│       ├── templates.ts   ← Admin template management [F-009]
│       └── analytics.ts   ← Admin platform analytics [F-014]
└── services/              ← Business logic layer called by routes
```

---

## Controller / Service Pattern

Express route handlers process HTTP requests, run Zod validations, enforce security middleware, and delegate to service functions:

```typescript
// Pattern Example: src/routes/profile.ts
router.put('/', requireAuth, async (req, res) => {
  const input = updateProfileSchema.parse(req.body);
  const profile = await profileService.updateProfile(req.user.id, input);
  res.json({ success: true, profile });
});
```

---

## Request & Response Format

### Request Format
- All mutating endpoints expect `Content-Type: application/json`.
- File uploads use `multipart/form-data` handled by `multer` (in-memory buffer).

### Standard Success Response
```json
{
  "success": true,
  "data": { ... } // or named key like "profile", "cards", "job"
}
```

### Standard Error Response
```json
{
  "error": {
    "code": "CARD_NOT_AVAILABLE",
    "message": "This card is no longer available for claiming."
  }
}
```

---

## HTTP Status Conventions

| Code | Usage |
|---|---|
| `200 OK` | Successful GET, PUT, or POST action |
| `201 Created` | Successful creation (claim, generation enqueue, upload) |
| `202 Accepted` | Async job accepted (bulk card generation) |
| `400 Bad Request` | Validation failure, missing required fields |
| `401 Unauthorized` | Missing or invalid JWT token |
| `403 Forbidden` | Valid JWT but insufficient permissions or wrong resource owner |
| `404 Not Found` | Resource does not exist |
| `409 Conflict` | Business rule violation (e.g. card already claimed, invalid lifecycle transition) |
| `415 Unsupported Media Type` | File upload fails magic-byte validation |
| `429 Too Many Requests` | Rate limit exceeded |
| `500 Internal Error` | Unhandled server error |

---

## Request Validation

Handled using **Zod** (`zod` package).
- Schemas run at the start of the route handler.
- Validation failures return `400 Bad Request` with `code: "VALIDATION_ERROR"`.

---

## Authentication & Authorization

- **Header:** `Authorization: Bearer <accessToken>`
- `requireAuth`: Verifies access token, populates `req.user = { id: string, role: Role }`.
- `requireAdmin`: Asserts `req.user.role === 'ADMIN'`.

---

## Endpoint Summary (PRD Mapping)

| Method | Endpoint | Auth | Feature PRD |
|---|---|---|---|
| `GET` | `/health` | None | Existing |
| `POST` | `/auth/send-otp` | Rate-limited | [F-002](file:///d:/nfc-new/nfc-card-platform/docs/features/F-002-authentication-otp-jwt.md) |
| `POST` | `/auth/verify-otp` | Rate-limited | [F-002](file:///d:/nfc-new/nfc-card-platform/docs/features/F-002-authentication-otp-jwt.md) |
| `POST` | `/auth/recover/request` | Rate-limited | [F-003](file:///d:/nfc-new/nfc-card-platform/docs/features/F-003-account-recovery.md) |
| `POST` | `/auth/recover/verify` | None | [F-003](file:///d:/nfc-new/nfc-card-platform/docs/features/F-003-account-recovery.md) |
| `GET` | `/cards/:token` | None | [F-007](file:///d:/nfc-new/nfc-card-platform/docs/features/F-007-card-claiming-activation.md) |
| `POST` | `/cards/:token/claim` | `requireAuth` | [F-007](file:///d:/nfc-new/nfc-card-platform/docs/features/F-007-card-claiming-activation.md) |
| `GET` | `/profile` | `requireAuth` | [F-008](file:///d:/nfc-new/nfc-card-platform/docs/features/F-008-profile-management.md) |
| `PUT` | `/profile` | `requireAuth` | [F-008](file:///d:/nfc-new/nfc-card-platform/docs/features/F-008-profile-management.md) |
| `POST` | `/profile/pause` | `requireAuth` | [F-015](file:///d:/nfc-new/nfc-card-platform/docs/features/F-015-customer-card-lifecycle.md) |
| `POST` | `/profile/resume` | `requireAuth` | [F-015](file:///d:/nfc-new/nfc-card-platform/docs/features/F-015-customer-card-lifecycle.md) |
| `GET` | `/templates` | None | [F-009](file:///d:/nfc-new/nfc-card-platform/docs/features/F-009-template-system.md) |
| `POST` | `/analytics/event` | Rate-limited | [F-014](file:///d:/nfc-new/nfc-card-platform/docs/features/F-014-analytics.md) |
| `GET` | `/analytics/summary` | `requireAuth` | [F-014](file:///d:/nfc-new/nfc-card-platform/docs/features/F-014-analytics.md) |
| `POST` | `/upload/profile-photo` | `requireAuth` | [F-016](file:///d:/nfc-new/nfc-card-platform/docs/features/F-016-file-storage-upload.md) |
| `GET/POST` | `/admin/cards/*` | `requireAdmin` | [F-005](file:///d:/nfc-new/nfc-card-platform/docs/features/F-005-bulk-card-generation.md), [F-006](file:///d:/nfc-new/nfc-card-platform/docs/features/F-006-admin-card-lifecycle.md) |
| `GET/POST` | `/admin/card-types/*` | `requireAdmin` | [F-004](file:///d:/nfc-new/nfc-card-platform/docs/features/F-004-card-type-field-schema.md) |
