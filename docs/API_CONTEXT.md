# API Context

## Overview

The platform uses an **Express 5 REST API Backend** (`apps/api`) running in Node.js ESM mode, serving JSON endpoints to the **Next.js App Router Frontend** (`apps/web`) and external clients.

- **Backend Entry File:** [`apps/api/src/server.ts`](file:///d:/nfc-new/nfc-card-platform/apps/api/src/server.ts)
- **Backend App Config:** [`apps/api/src/app.ts`](file:///d:/nfc-new/nfc-card-platform/apps/api/src/app.ts)
- **Frontend API Base URL:** Configured via `NEXT_PUBLIC_API_URL` (e.g. `http://localhost:4000`)

---

## Route Structure (`apps/api/src/`) — Controller → Service → Repository

```
apps/api/src/
├── app.ts                 ← App mounting & top-level middleware
├── server.ts              ← HTTP server binding & job workers
├── controllers/           ← HTTP layer only (Zod parse, req/res, cookies, sendSuccess/sendError)
│   └── auth.controller.ts ← Auth HTTP handlers [F-002]
├── services/              ← Business logic (no Prisma, no req/res)
│   ├── auth.service.ts    ← Orchestrates OTP + token + user flows
│   ├── otp.service.ts     ← Hashing, generation, rate-limit, verify
│   └── token.service.ts   ← JWT sign/verify, refresh rotate, cookie helpers
├── repositories/          ← Prisma only (no business rules)
│   ├── user.repository.ts
│   ├── otp.repository.ts
│   └── token.repository.ts
├── routes/                ← Router bindings (path + middleware → controller)
│   ├── index.ts           ← Aggregates all route modules + /health + /admin/health
│   ├── auth.routes.ts     ← /auth/* [F-002, F-003]
│   ├── cards.routes.ts    ← Public token lookup & claiming (/cards/*) [F-007, F-015] (planned)
│   ├── profile.routes.ts  ← Customer profile CRUD & lifecycle (/profile/*) [F-008, F-015] (planned)
│   ├── templates.routes.ts← Template listing (/templates) [F-009] (planned)
│   ├── analytics.routes.ts← Customer & event analytics (/analytics/*) [F-014] (planned)
│   ├── upload.routes.ts   ← S3 File upload (/upload/*) [F-016] (planned)
│   └── admin/
│       ├── cards.routes.ts      ← Admin card CRUD, generation, lifecycle [F-005, F-006]
│       ├── cardTypes.routes.ts  ← Admin card type management [F-004]
│       ├── templates.routes.ts  ← Admin template management [F-009]
│       └── analytics.routes.ts  ← Admin platform analytics [F-014]
├── validators/            ← Zod schemas (auth.validator.ts, etc.)
├── providers/             ← External I/O (otp.provider.ts)
├── utils/                 ← Pure helpers (phone.ts)
├── middleware/            ← requireAuth (uses user.repository + token.service), requireAdmin
└── lib/                   ← prisma, logger, http (sendSuccess/sendError)
```

---

## Controller → Service → Repository Pattern (Mandatory)

**Controllers** (`src/controllers/*.controller.ts`) handle only HTTP request/response concerns — Zod validation (via `validators/`), extracting `req.user`, cookies, headers, calling services, and sending `sendSuccess`/`sendError` envelopes. They must not contain business logic or Prisma calls.

**Services** (`src/services/*.service.ts`) contain all business logic — OTP HMAC hashing, code generation, rate-limit checks, suspension checks, JWT signing/verification, transaction orchestration. They call repositories/providers, never Prisma or `req`/`res` directly.

**Repositories** (`src/repositories/*.repository.ts`) handle Prisma/database operations only — `findUnique`, `create`, `update`, `count`, `$transaction`. No business rules, no hashing, no HTTP.

**Routes** (`src/routes/*.routes.ts`) bind Express paths to controller methods and middleware.

```typescript
// Pattern Example: src/routes/profile.routes.ts + src/controllers/profile.controller.ts + src/services/profile.service.ts

// routes/profile.routes.ts
router.put('/', requireAuth, profileController.update);

// controllers/profile.controller.ts
async update(req, res) {
  const input = updateProfileSchema.parse(req.body); // validators/
  const result = await profileService.updateProfile(req.user.id, input);
  if (!result.ok) return sendError(res, result.status, result.code, result.message);
  return sendSuccess(res, 200, result.data);
}

// services/profile.service.ts
async updateProfile(userId, input) {
  // business rules, fieldVisibility filtering, revalidateTag trigger
  const profile = await profileRepository.update(userId, input);
  return { ok: true, data: profile };
}

// repositories/profile.repository.ts
update(userId, data) {
  return prisma.profile.update({ where: { userId }, data });
}
```

All future backend features must follow this layering; Prisma calls in controllers/services and business logic in repositories are architectural violations.

---

## Request & Response Format

### Request Format

- All mutating endpoints expect `Content-Type: application/json`.
- File uploads use `multipart/form-data` handled by `multer` (in-memory buffer).

### Standard Success Response (`sendSuccess`)

All successful API responses wrap data inside a standard envelope:

```json
{
  "success": true,
  "data": { ... }, // payload object or primitive
  "message": "Optional user-friendly message"
}
```

### Standard Error Response (`sendError`)

All API error responses follow a uniform structure:

```json
{
  "success": false,
  "error": {
    "code": "CARD_NOT_AVAILABLE",
    "message": "This card is no longer available for claiming.",
    "details": { ... } // optional validation details or metadata
  }
}
```

---

## Environment Configuration & Logging

### Environment Variables

Environment variables are strictly validated using Zod in [`apps/api/src/config.ts`](file:///d:/nfc-new/nfc-card-platform/apps/api/src/config.ts). Do not read raw `process.env` directly; import `config` instead.

- `NODE_ENV`: `"development" | "production" | "test"`
- `PORT`: HTTP listener port (default `4000`)
- `LOG_LEVEL`: Log verbosity (`debug`, `info`, `warn`, `error`)
- `LOG_DIR`: Log file destination directory (default `logs/`)
- `JWT_SECRET` & `JWT_REFRESH_SECRET`: Secrets for signing JWT tokens
- `OTP_PEPPER`: HMAC secret for hashing OTP codes

### Structured & File-Based Logging

Logging is powered by **Pino** (`apps/api/src/lib/logger.ts`).

- **HTTP Request Logging:** `pino-http` middleware automatically logs incoming requests with status code, response time, and method.
- **Console Output:** Formatted with `pino-pretty` in development, raw JSON in production.
- **File Output:**
  - `logs/app.log`: Contains all logs at or above `config.LOG_LEVEL`.
  - `logs/error.log`: Contains `error` and `fatal` level logs only.
- **Usage Rule:** Use `logger.info()`, `logger.error()`, `logger.warn()`, `logger.debug()` instead of `console.log`.

---

## Postman Collection Maintenance

A master Postman collection is maintained at [`docs/postman_collection.json`](file:///d:/nfc-new/nfc-card-platform/docs/postman_collection.json).

> [!IMPORTANT]
> **Developer Requirement:**

---

## Testing & Feature Verification Structure

All API tests are powered by **Vitest** (`vitest`) and organized by feature and test category inside `apps/api/tests/`:

```
apps/api/tests/
├── unit/                         ← Unit tests for helpers & utilities
│   ├── config.test.ts            ← Environment variables validation
│   ├── http.test.ts              ← Response envelope helpers
│   ├── phone.test.ts             ← E.164 phone normalization
│   └── jwt.test.ts               ← JWT token utilities
└── integration/                  ← Integration tests for features & routes
    ├── health.integration.test.ts← API health check integration tests
    └── auth.integration.test.ts  ← Authentication feature integration tests
```

### Test Commands

- `npm test`: Runs all Vitest test suites (`vitest run`).
- `npm run test:unit`: Runs Vitest unit tests (`vitest run tests/unit`).
- `npm run test:integration`: Runs Vitest integration tests (`vitest run tests/integration`).

---

## HTTP Status Conventions

| Code                         | Usage                                                                             |
| ---------------------------- | --------------------------------------------------------------------------------- |
| `200 OK`                     | Successful GET, PUT, or POST action                                               |
| `201 Created`                | Successful creation (claim, generation enqueue, upload)                           |
| `202 Accepted`               | Async job accepted (bulk card generation)                                         |
| `400 Bad Request`            | Validation failure, missing required fields                                       |
| `401 Unauthorized`           | Missing or invalid JWT token                                                      |
| `403 Forbidden`              | Valid JWT but insufficient permissions or wrong resource owner                    |
| `404 Not Found`              | Resource does not exist                                                           |
| `409 Conflict`               | Business rule violation (e.g. card already claimed, invalid lifecycle transition) |
| `415 Unsupported Media Type` | File upload fails magic-byte validation                                           |
| `429 Too Many Requests`      | Rate limit exceeded                                                               |
| `500 Internal Error`         | Unhandled server error                                                            |

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

| Method     | Endpoint                | Auth           | Feature PRD                                                                                                                                                                          |
| ---------- | ----------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET`      | `/health`               | None           | Existing                                                                                                                                                                             |
| `POST`     | `/auth/send-otp`        | Rate-limited   | [F-002](file:///d:/nfc-new/nfc-card-platform/docs/features/F-002-authentication-otp-jwt.md)                                                                                          |
| `POST`     | `/auth/verify-otp`      | Rate-limited   | [F-002](file:///d:/nfc-new/nfc-card-platform/docs/features/F-002-authentication-otp-jwt.md)                                                                                          |
| `POST`     | `/auth/recover/request` | Rate-limited   | [F-003](file:///d:/nfc-new/nfc-card-platform/docs/features/F-003-account-recovery.md)                                                                                                |
| `POST`     | `/auth/recover/verify`  | None           | [F-003](file:///d:/nfc-new/nfc-card-platform/docs/features/F-003-account-recovery.md)                                                                                                |
| `GET`      | `/cards/:token`         | None           | [F-007](file:///d:/nfc-new/nfc-card-platform/docs/features/F-007-card-claiming-activation.md)                                                                                        |
| `POST`     | `/cards/:token/claim`   | `requireAuth`  | [F-007](file:///d:/nfc-new/nfc-card-platform/docs/features/F-007-card-claiming-activation.md)                                                                                        |
| `GET`      | `/profile`              | `requireAuth`  | [F-008](file:///d:/nfc-new/nfc-card-platform/docs/features/F-008-profile-management.md)                                                                                              |
| `PUT`      | `/profile`              | `requireAuth`  | [F-008](file:///d:/nfc-new/nfc-card-platform/docs/features/F-008-profile-management.md)                                                                                              |
| `POST`     | `/profile/pause`        | `requireAuth`  | [F-015](file:///d:/nfc-new/nfc-card-platform/docs/features/F-015-customer-card-lifecycle.md)                                                                                         |
| `POST`     | `/profile/resume`       | `requireAuth`  | [F-015](file:///d:/nfc-new/nfc-card-platform/docs/features/F-015-customer-card-lifecycle.md)                                                                                         |
| `GET`      | `/templates`            | None           | [F-009](file:///d:/nfc-new/nfc-card-platform/docs/features/F-009-template-system.md)                                                                                                 |
| `POST`     | `/analytics/event`      | Rate-limited   | [F-014](file:///d:/nfc-new/nfc-card-platform/docs/features/F-014-analytics.md)                                                                                                       |
| `GET`      | `/analytics/summary`    | `requireAuth`  | [F-014](file:///d:/nfc-new/nfc-card-platform/docs/features/F-014-analytics.md)                                                                                                       |
| `POST`     | `/upload/profile-photo` | `requireAuth`  | [F-016](file:///d:/nfc-new/nfc-card-platform/docs/features/F-016-file-storage-upload.md)                                                                                             |
| `GET/POST` | `/admin/cards/*`        | `requireAdmin` | [F-005](file:///d:/nfc-new/nfc-card-platform/docs/features/F-005-bulk-card-generation.md), [F-006](file:///d:/nfc-new/nfc-card-platform/docs/features/F-006-admin-card-lifecycle.md) |
| `GET/POST` | `/admin/card-types/*`   | `requireAdmin` | [F-004](file:///d:/nfc-new/nfc-card-platform/docs/features/F-004-card-type-field-schema.md)                                                                                          |
