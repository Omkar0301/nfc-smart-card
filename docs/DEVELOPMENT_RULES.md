# Development Rules

This document outlines mandatory engineering rules for all AI agents and developers implementing features in this repository.

---

## 1. Architectural Integrity (Option B Architecture)

1. **Frontend & Rendering Stack:** The frontend application (`apps/web`) is built with **Next.js App Router**. Portals (`/portal/*`, `/admin/*`) use Next.js client/server components. The public profile route (`/p/[type]/[token]`) is rendered via Next.js React Server Components with dynamic metadata generation (`generateMetadata()`).
2. **Backend API Stack:** The backend API service (`apps/api`) is built with **Express 5** in Node.js ESM mode. All REST API endpoints, security middleware, and background jobs live here.
3. **No Redis:** All background processing uses `pg-boss` (Postgres-backed) running inside `apps/api`. Do not introduce Redis or BullMQ.
4. **Cache Revalidation:** Public profile caches are managed via Next.js Data Cache. Use `revalidateTag("profile-${publicToken}")` when profile updates occur.
5. **Prisma ORM Boundary:** All database interaction goes through Prisma in `apps/api/prisma/schema.prisma`. Do not write raw SQL queries unless Prisma is demonstrably unable to express the query.

---

## 2. Code Reuse & Non-Duplication

6. **Reuse Existing Components:** Check `packages/shared/src/` and existing UI directories before creating new components or types.
7. **Config-Driven Verticals:** Never hardcode new vertical-specific database tables (e.g. `DoctorProfile`) or vertical-specific CRUD forms. New verticals require only a `CardType` seed row, a `fieldSchema`, and visual template components that consume `FieldRenderer`.
8. **Single Source of Truth for Types:** Types shared between Next.js (`apps/web`) and Express (`apps/api`) must live in `packages/shared/src/`. Do not duplicate interface definitions.

---

## 3. Security & Data Scoping

9. **Server-Side Authorization:** Admin API endpoints must assert `req.user.role === 'ADMIN'` server-side. Never rely solely on client-side router guards.
10. **Strict User Scoping:** Customer endpoints must resolve data based on the authenticated JWT user (`req.user.id`). Never accept a `userId` from the request body or query params for customer actions.
11. **Server-Side Field Visibility:** Field-level visibility (`fieldVisibility`) must be enforced server-side before sending public profile payloads. Hidden fields must NEVER be included in public network responses.
12. **Crypto-Random Public Tokens:** `publicToken` values must be generated using `crypto.randomBytes()`. Never use sequential integers, timestamps, or guessable tokens.
13. **Transactional Claiming:** Card claiming (`POST /cards/:token/claim`) must run in a Prisma interactive transaction with a row-level lock (`SELECT ... FOR UPDATE`), re-verifying `status = AVAILABLE` inside the lock.
14. **File Upload Security:** Validate uploaded files by magic bytes (file signature) and size server-side before sending to S3. Never trust the client-declared `Content-Type`.
15. **No Plaintext Secrets:** Never log or store OTP codes, JWTs, or account recovery tokens in plaintext logs or database columns.

---

## 4. API & Database Conventions

16. **Standard Error Format:** All API errors must return `{ error: { code: string, message: string } }` with appropriate non-2xx HTTP status codes.
17. **Zod Input Validation:** Parse and validate all request bodies and query parameters with Zod schemas before passing input to services.
18. **Prisma Migrations:** Database schema updates must be created via `npx prisma migrate dev` in `apps/api`. Do not edit database tables manually outside Prisma migrations.
19. **ESM Imports:** The backend uses ES Modules (`"type": "module"`). TypeScript relative imports in `apps/api` must specify the `.js` extension (e.g. `import app from './app.js'`).

---

## 5. Verification & Process Rules

20. **Code Verification:** Verify all changes build cleanly (`npm run typecheck` or `npm run build`) before declaring a task complete.
21. **No Assumptions:** If a requirement is ambiguous or underspecified, consult `PRD_NFC_Digital_Card_Platform.md` or `.agents/references.md`. If still unclear, ask for clarification.
22. **No Unrequested Test Frameworks:** Per product rule (`.agents/rules.md` #18), do not add Jest/Vitest/Playwright test suites unless explicitly requested.

---

## 6. Context Maintenance Rules

> **MANDATORY CONTEXT UPDATE RULE:**
> Whenever a completed feature introduces a new architectural pattern, database convention, API convention, shared utility, or important project-level rule, update the relevant context document (`PROJECT_CONTEXT.md`, `ARCHITECTURE.md`, `DATABASE_CONTEXT.md`, `API_CONTEXT.md`, or `DEVELOPMENT_RULES.md`).

Do not update the context documents for trivial feature-specific implementation details. Keep context concise, factual, and aligned with actual code.
