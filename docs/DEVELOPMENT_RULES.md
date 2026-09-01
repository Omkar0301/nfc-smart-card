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

## 2. Server/Client Component Separation (Mandatory)

7. **Server Components are the default for App Router pages:** Route pages under `apps/web/app/**` should usually be React Server Components unless they need browser-only interactivity. Server Components are the correct place for data fetching, metadata, SEO, cookies, headers, redirects, and secure server-side auth checks.
8. **Client Components are only for browser interactivity:** Add `'use client'` only to components that require React hooks (`useState`, `useEffect`, `useMemo`, `useContext`, event handlers), browser APIs (`window`, `document`, localStorage), or client-side navigation logic. Keep client components small and focused.
9. **Do not mark route wrappers as client just to render a child:** A page file that only renders another component should stay a Server Component. If a subcomponent needs client behavior, split it into a dedicated client component and render it from the server page. Never wrap the whole app with a client provider unless the provider is genuinely needed on the client subtree.
10. **No global client auth provider in the root layout:** The root layout in `apps/web/app/layout.tsx` should remain a server component. Global app auth state should not be mounted across the entire app unless the architecture explicitly requires it. Prefer route-scoped or feature-scoped auth providers.
11. **No browser APIs in Server Components:** Do not call `window`, `document`, `localStorage`, `sessionStorage`, or `matchMedia` in server components. Do not use client-only APIs in server-rendered page logic.
12. **Server-first data flow:** Prefer server-side fetches, cookies-based auth, and route protection in the App Router over client-side auth bootstrapping. Client-side data fetching is acceptable only for interactive app features after the page is already mounted.

## 3. Code Reuse & Non-Duplication

13. **Reuse Existing Components:** Check `packages/shared/src/` and existing UI directories before creating new components or types. Reuse existing repositories/services (e.g., `user.repository`, `otp.service`, `token.service`) before creating duplicates.
14. **Config-Driven Verticals:** Never hardcode new vertical-specific database tables (e.g. `DoctorProfile`) or vertical-specific CRUD forms. New verticals require only a `CardType` seed row, a `fieldSchema`, and visual template components that consume `FieldRenderer`.
15. **Single Source of Truth for Types:** Types shared between Next.js (`apps/web`) and Express (`apps/api`) must live in `packages/shared/src/`. Do not duplicate interface definitions.
16. **Layer Reuse:** New features must reuse validators (`src/validators/`), repositories, and services where applicable; do not duplicate `normalizePhone` or token logic across modules.

---

## 4. Security & Data Scoping

17. **Server-Side Authorization:** Admin API endpoints must assert `req.user.role === 'ADMIN'` server-side. Never rely solely on client-side router guards.
18. **Strict User Scoping:** Customer endpoints must resolve data based on the authenticated JWT user (`req.user.id`). Never accept a `userId` from the request body or query params for customer actions.
19. **Server-Side Field Visibility:** Field-level visibility (`fieldVisibility`) must be enforced server-side before sending public profile payloads. Hidden fields must NEVER be included in public network responses.
20. **Crypto-Random Public Tokens:** `publicToken` values must be generated using `crypto.randomBytes()`. Never use sequential integers, timestamps, or guessable tokens.
21. **Transactional Claiming:** Card claiming (`POST /cards/:token/claim`) must run in a Prisma interactive transaction with a row-level lock (`SELECT ... FOR UPDATE`), re-verifying `status = AVAILABLE` inside the lock. This transaction belongs in the repository layer, orchestrated by the service.
22. **File Upload Security:** Validate uploaded files by magic bytes (file signature) and size server-side before sending to S3. Never trust the client-declared `Content-Type`.
23. **No Plaintext Secrets:** Never log or store OTP codes, JWTs, or account recovery tokens in plaintext logs or database columns.

---

## 5. API & Database Conventions

24. **Standard Error Format:** All API errors must return `{ error: { code: string, message: string } }` with appropriate non-2xx HTTP status codes.
25. **Zod Input Validation:** Parse and validate all request bodies and query parameters with Zod schemas in controllers via `src/validators/*.validator.ts` before passing input to services.
26. **Layered Validation:** Controllers validate HTTP input; services validate business invariants; repositories perform no validation beyond Prisma constraints.
27. **Prisma Migrations:** Database schema updates must be created via `npx prisma migrate dev` in `apps/api`. Do not edit database tables manually outside Prisma migrations.
28. **ESM Imports:** The backend uses ES Modules (`"type": "module"`). TypeScript relative imports in `apps/api` must specify the `.js` extension (e.g. `import app from './app.js'`).
29. **Response Envelopes:** Controllers must use `sendSuccess`/`sendError` from `src/lib/http.ts`; services return `ServiceResult<T>` and never call `res.json` directly.

---

## 6. Verification & Process Rules

30. **Code Verification:** Verify all changes build cleanly (`npm run typecheck` or `npm run build`) before declaring a task complete.
31. **Feature Tests Requirement:** For every feature created or updated in `apps/api`, write unit tests (`apps/api/tests/unit/`) or integration tests (`apps/api/tests/integration/`) and ensure `npm test` passes cleanly. Tests for services/repositories should mock or isolate Prisma where appropriate.
32. **No Assumptions:** If a requirement is ambiguous or underspecified, consult `PRD_NFC_Digital_Card_Platform.md` or `.agents/references.md`. If still unclear, ask for clarification.
33. **Architectural Enforcement:** Any PR or feature that places Prisma calls in controllers/services or business logic in repositories must be rejected and refactored before merge.
34. **Client/Server Boundary Enforcement:** Any feature that marks a page or root layout as `'use client'` without true browser interactivity will be rejected and refactored. Prefer server-first rendering and route-scoped client wrappers.
35. **Postman Collection Updates (Mandatory):** Whenever an endpoint is created, updated, or deleted in `apps/api`, the master Postman collection at `misc/postman_collection.json` MUST be updated with the exact route, headers, request body, query params, and test scripts (e.g. saving auth tokens).

---

## 6. Context Maintenance Rules

> **MANDATORY CONTEXT & POSTMAN UPDATE RULE:**
>
> 1. Whenever a completed feature introduces a new architectural pattern, database convention, API convention, shared utility, or important project-level rule, update the relevant context document (`PROJECT_CONTEXT.md`, `ARCHITECTURE.md`, `DATABASE_CONTEXT.md`, `API_CONTEXT.md`, or `DEVELOPMENT_RULES.md`).
> 2. Whenever an API route is added or changed, update `misc/postman_collection.json` and `docs/API_CONTEXT.md`.

Do not update the context documents for trivial feature-specific implementation details. Keep context concise, factual, and aligned with actual code.
