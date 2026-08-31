# Architecture & Project Context

> 📌 **Canonical Documentation Pointer:**
> Detailed architecture, project context, database structure, and API conventions are documented in:
> - [`/docs/PROJECT_CONTEXT.md`](file:///d:/nfc-new/nfc-card-platform/docs/PROJECT_CONTEXT.md)
> - [`/docs/ARCHITECTURE.md`](file:///d:/nfc-new/nfc-card-platform/docs/ARCHITECTURE.md)
> - [`/docs/DATABASE_CONTEXT.md`](file:///d:/nfc-new/nfc-card-platform/docs/DATABASE_CONTEXT.md)
> - [`/docs/API_CONTEXT.md`](file:///d:/nfc-new/nfc-card-platform/docs/API_CONTEXT.md)

---

## Technical Summary (Option B Architecture)

1. **Stack:** Next.js App Router (Frontend `apps/web`), Express 5 (REST API `apps/api`), PostgreSQL, Prisma ORM, pg-boss (background jobs), S3 (file storage). No Redis.
2. **Monorepo Structure:** `apps/web` (Next.js App Router: Portals & `/p/[type]/[token]` SSR), `apps/api` (Express REST server + Prisma + pg-boss workers with Controller → Service → Repository layering), `packages/shared` (types, field schemas, template Server Components).
3. **Rendering Strategy:** Customer & Admin portals are interactive Next.js routes. The public profile route (`/p/[type]/[token]`) is a Next.js React Server Component using `generateMetadata()` for Open Graph tags and `revalidateTag()` for instant cache purging.
4. **Backend Layering (Mandatory Controller → Service → Repository):** Controllers (`src/controllers/`) handle only HTTP (Zod parse, `req`/`res`, cookies, `sendSuccess`/`sendError`), Services (`src/services/`) contain all business logic and call repositories, Repositories (`src/repositories/`) handle Prisma operations only. Routes (`src/routes/`) bind paths to controllers + middleware, Validators (`src/validators/`) hold Zod schemas. No Prisma in controllers/services, no business rules in repositories.
5. **Config-Driven Verticals:** New card verticals (Business, College, Doctor, etc.) are rows in `CardType` with a `fieldSchema` JSON — never create vertical-specific database tables.
6. **Data Model:** Prisma schema in `apps/api/prisma/schema.prisma`. `CardStatus` is exactly `AVAILABLE | ASSIGNED | ACTIVE | PAUSED | SUSPENDED | DEACTIVATED` (mirrored in `packages/shared/src/types.ts`). `User` has `assignments` and `profiles`; `CardAssignment.userId` and `Profile.userId` are FK relations. There is no `Profile.cardId` — resolve a tap via `NFCCard.publicToken` → `CardAssignment` → `User` → `Profile` (by `cardTypeId`). Indexes: `NFCCard(batchId, status)`, `CardAssignment(userId, cardId)`, `ProfileEvent(cardId, timestamp)`.
7. **Card Claiming Concurrency:** Card claiming runs in a Prisma interactive transaction with a row lock (`SELECT ... FOR UPDATE`), re-verifying `status = AVAILABLE` inside the lock (transaction lives in repository layer, orchestrated by service).
8. **Field Visibility Enforcement:** Server-side filtering of `Profile.data` based on `fieldVisibility` before sending payloads to public profile pages.
