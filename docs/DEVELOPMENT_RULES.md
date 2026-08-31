# Development Rules

This document outlines mandatory engineering rules for all AI agents and developers implementing features in this repository.

---

## 1. Architectural Integrity (Option B Architecture)

1. **Frontend & Rendering Stack:** The frontend application (`apps/web`) is built with **Next.js App Router**. Portals (`/portal/*`, `/admin/*`) use Next.js client/server components. The public profile route (`/p/[type]/[token]`) is rendered via Next.js React Server Components with dynamic metadata generation (`generateMetadata()`).
2. **Backend API Stack:** The backend API service (`apps/api`) is built with **Express 5** in Node.js ESM mode. All REST API endpoints, security middleware, and background jobs live here.
3. **Controller → Service → Repository (Mandatory):** All backend features must follow strict layering — Controllers handle only HTTP (Zod parse, `req`/`res`, cookies, `sendSuccess`/`sendError`), Services contain all business logic (hashing, rate-limits, JWT, suspension checks) and call repositories, Repositories handle Prisma/database operations only. Never place Prisma calls in controllers/services or business rules in repositories. See `docs/ARCHITECTURE.md` and `docs/API_CONTEXT.md`.
4. **No Redis:** All background processing uses `pg-boss` (Postgres-backed) running inside `apps/api`. Do not introduce Redis or BullMQ.
5. **Cache Revalidation:** Public profile caches are managed via Next.js Data Cache. Use `revalidateTag("profile-${publicToken}")` when profile updates occur.
6. **Prisma ORM Boundary:** All database interaction goes through Prisma in `apps/api/prisma/schema.prisma` via repositories (`src/repositories/*.repository.ts`). Do not write raw SQL queries unless Prisma is demonstrably unable to express the query, and never call Prisma directly from controllers.

---

## 2. Code Reuse & Non-Duplication

7. **Reuse Existing Components:** Check `packages/shared/src/` and existing UI directories before creating new components or types. Reuse existing repositories/services (e.g., `user.repository`, `otp.service`, `token.service`) before creating duplicates.
8. **Config-Driven Verticals:** Never hardcode new vertical-specific database tables (e.g. `DoctorProfile`) or vertical-specific CRUD forms. New verticals require only a `CardType` seed row, a `fieldSchema`, and visual template components that consume `FieldRenderer`.
9. **Single Source of Truth for Types:** Types shared between Next.js (`apps/web`) and Express (`apps/api`) must live in `packages/shared/src/`. Do not duplicate interface definitions.
10. **Layer Reuse:** New features must reuse validators (`src/validators/`), repositories, and services where applicable; do not duplicate `normalizePhone` or token logic across modules.

---

## 3. Security & Data Scoping

11. **Server-Side Authorization:** Admin API endpoints must assert `req.user.role === 'ADMIN'` server-side. Never rely solely on client-side router guards.
12. **Strict User Scoping:** Customer endpoints must resolve data based on the authenticated JWT user (`req.user.id`). Never accept a `userId` from the request body or query params for customer actions.
13. **Server-Side Field Visibility:** Field-level visibility (`fieldVisibility`) must be enforced server-side before sending public profile payloads. Hidden fields must NEVER be included in public network responses.
14. **Crypto-Random Public Tokens:** `publicToken` values must be generated using `crypto.randomBytes()`. Never use sequential integers, timestamps, or guessable tokens.
15. **Transactional Claiming:** Card claiming (`POST /cards/:token/claim`) must run in a Prisma interactive transaction with a row-level lock (`SELECT ... FOR UPDATE`), re-verifying `status = AVAILABLE` inside the lock. This transaction belongs in the repository layer, orchestrated by the service.
16. **File Upload Security:** Validate uploaded files by magic bytes (file signature) and size server-side before sending to S3. Never trust the client-declared `Content-Type`.
17. **No Plaintext Secrets:** Never log or store OTP codes, JWTs, or account recovery tokens in plaintext logs or database columns.

---

## 4. API & Database Conventions

18. **Standard Error Format:** All API errors must return `{ error: { code: string, message: string } }` with appropriate non-2xx HTTP status codes.
19. **Zod Input Validation:** Parse and validate all request bodies and query parameters with Zod schemas in controllers via `src/validators/*.validator.ts` before passing input to services.
20. **Layered Validation:** Controllers validate HTTP input; services validate business invariants; repositories perform no validation beyond Prisma constraints.
21. **Prisma Migrations:** Database schema updates must be created via `npx prisma migrate dev` in `apps/api`. Do not edit database tables manually outside Prisma migrations.
22. **ESM Imports:** The backend uses ES Modules (`"type": "module"`). TypeScript relative imports in `apps/api` must specify the `.js` extension (e.g. `import app from './app.js'`).
23. **Response Envelopes:** Controllers must use `sendSuccess`/`sendError` from `src/lib/http.ts`; services return `ServiceResult<T>` and never call `res.json` directly.

---

## 5. Verification & Process Rules

24. **Code Verification:** Verify all changes build cleanly (`npm run typecheck` or `npm run build`) before declaring a task complete.
25. **Feature Tests Requirement:** For every feature created or updated in `apps/api`, write unit tests (`apps/api/tests/unit/`) or integration tests (`apps/api/tests/integration/`) and ensure `npm test` passes cleanly. Tests for services/repositories should mock or isolate Prisma where appropriate.
26. **No Assumptions:** If a requirement is ambiguous or underspecified, consult `PRD_NFC_Digital_Card_Platform.md` or `.agents/references.md`. If still unclear, ask for clarification.
27. **Architectural Enforcement:** Any PR or feature that places Prisma calls in controllers/services or business logic in repositories must be rejected and refactored before merge.
28. **Postman Collection Updates (Mandatory):** Whenever an endpoint is created, updated, or deleted in `apps/api`, the master Postman collection at `misc/postman_collection.json` MUST be updated with the exact route, headers, request body, query params, and test scripts (e.g. saving auth tokens).

---

## 6. Context Maintenance Rules

> **MANDATORY CONTEXT & POSTMAN UPDATE RULE:**
>
> 1. Whenever a completed feature introduces a new architectural pattern, database convention, API convention, shared utility, or important project-level rule, update the relevant context document (`PROJECT_CONTEXT.md`, `ARCHITECTURE.md`, `DATABASE_CONTEXT.md`, `API_CONTEXT.md`, or `DEVELOPMENT_RULES.md`).
> 2. Whenever an API route is added or changed, update `misc/postman_collection.json` and `docs/API_CONTEXT.md`.

Do not update the context documents for trivial feature-specific implementation details. Keep context concise, factual, and aligned with actual code.
