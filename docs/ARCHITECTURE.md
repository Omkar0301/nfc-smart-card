# Architecture

## Overview

The platform uses a dual-service architecture: **Next.js App Router** for the frontend application and public profile SSR, paired with an **Express REST API Backend** for core business logic, database transactions, and background jobs.

```
Physical NFC Card Tap
        ↓
https://{domain}/p/{cardType.slug}/{publicToken}
        ↓
 ┌─────────────────────────────────────────────────────────────┐
 │               Next.js App Router (apps/web)                │
 │                                                             │
 │  ┌─────────────────────────────┐  ┌──────────────────────┐  │
 │  │ Public Profile SSR          │  │ Portals (SPA/Client) │  │
 │  │ app/p/[type]/[token]/page   │  │ /portal/* & /admin/* │  │
 │  │ (Server Component +         │  │ (Auth-gated UI)      │  │
 │  │  generateMetadata +         │  │                      │  │
 │  │  revalidateTag)             │  │                      │  │
 │  └──────────────┬──────────────┘  └──────────┬───────────┘  │
 └─────────────────┼────────────────────────────┼──────────────┘
                   │  HTTP REST / API Client    │
                   └─────────────┬──────────────┘
                                 ↓
 ┌─────────────────────────────────────────────────────────────┐
 │                Express REST API (apps/api)                  │
 │                                                             │
 │  ┌─────────────────────────────┐  ┌──────────────────────┐  │
 │  │ REST API Endpoints          │  │ Background Workers   │  │
 │  │ /auth, /profile, /cards,    │  │ pg-boss jobs         │  │
 │  │ /admin/* (JSON API)         │  │ (bulk generation)    │  │
 │  └──────────────┬──────────────┘  └──────────┬───────────┘  │
 └─────────────────┼────────────────────────────┼──────────────┘
                   ↓                            ↓
               PostgreSQL                   PostgreSQL
                (Prisma)                     (Prisma)
                   ↓
              S3-compatible
               (file storage)
```

---

## Application Surfaces

### 1. Public Profile Route (Next.js SSR) — `/p/[type]/[token]`
- **Location:** `apps/web/app/p/[type]/[token]/page.tsx` *(F-010)*
- **Rendering:** React Server Component rendered on demand by Next.js App Router.
- **Metadata & SEO:** `generateMetadata()` dynamically populates Open Graph tags (`og:title`, `og:image`, `og:url`) and Twitter Cards.
- **Template Components:** Imported from `packages/shared/src/templates/` — React Server Components shared across templates.
- **Caching & Revalidation:** Next.js Data Cache tagged with `profile-${token}`. Invalidated using `revalidateTag("profile-${token}")` when a cardholder updates their profile, switches templates, or pauses/resumes their card.
- **Visibility Enforcement:** Profile fields are filtered server-side (in `apps/api` or during Server Component data fetching) before rendering.

### 2. Customer Portal — `/portal/*`
- **Location:** `apps/web/app/portal/` *(F-011)*
- **Rendering:** Client-interactive Next.js components (`'use client'`).
- **Auth:** JWT Bearer token attached to API requests via HTTP client.

### 3. Admin Portal — `/admin/*`
- **Location:** `apps/web/app/admin/` *(F-012)*
- **Rendering:** Client-interactive Next.js components (`'use client'`).
- **Auth:** JWT Bearer token + server-enforced `role === 'ADMIN'` check.

---

## Express API Service (`apps/api`)

`apps/api` remains a dedicated Node.js/Express REST server:
- **`src/app.ts`**: CORS, JSON body parser, rate limiters, security headers (`helmet`), route mounting.
- **`src/server.ts`**: HTTP server listening on `PORT` (default `4000`) + `pg-boss` worker startup.
- **Data Access:** All database queries go through Prisma (`apps/api/prisma/schema.prisma`).

### Planned Express Middleware Stack

```
app.use(helmet())                    ← Security headers
app.use(cors({ origin: WEB_URL }))   ← Scoped CORS (public routes allow '*')
app.use(express.json())
app.use(globalPublicLimiter)         ← Rate limiting
app.use('/auth', authRoutes)         ← OTP, JWT, recovery
app.use('/cards', cardRoutes)        ← Token lookup, transactional claiming
app.use('/profile', requireAuth, profileRoutes)
app.use('/templates', templatesRoutes)  ← Public template metadata
app.use('/upload', requireAuth, uploadRoutes)
app.use('/analytics', analyticsRoutes)  ← Event capture & summary
app.use('/admin', requireAdmin, adminRoutes)
```

---

## Planned Route → Handler Flow

```
HTTP Request (from Next.js Frontend or API client)
     ↓
Express Route Handler (apps/api/src/routes/*.ts)
     ↓
Zod Validation (parse body/query)
     ↓
Service Layer (apps/api/src/services/*Service.ts)
     ↓
Prisma ORM
     ↓
PostgreSQL Database
```

---

## Cache Invalidation Flow (`revalidateTag`)

When a user modifies their profile in the Customer Portal:

```
PUT /profile (apps/api)
     ↓
DB update committed in Prisma
     ↓
Express handler triggers Next.js revalidation endpoint / Webhook
     ↓
Next.js calls revalidateTag(`profile-${publicToken}`)
     ↓
Next.js Data Cache for /p/[type]/[token] is purged instantly
```

---

## Shared Package Boundary (`packages/shared`)

`packages/shared/src/` contains code consumed by both `apps/web` (Next.js) and `apps/api` (Express):
- `types.ts`: `CardStatus`, `Role`, `CardTypeCode`, `User`, `Card`
- `fieldSchema.ts`: `FieldType`, `FieldDefinition`, `CardFieldSchema`
- `templates/`: React Server Components for template rendering (`BusinessModern`, `CollegeAcademic`, etc.)

---

## Data Model (Prisma)

Canonical schema: `apps/api/prisma/schema.prisma`. Shared TypeScript `CardStatus` lives in `packages/shared/src/types.ts` and must stay in lockstep with the Prisma enum.

**`CardStatus`:** `AVAILABLE` → `ASSIGNED` → `ACTIVE` ⇄ `PAUSED`; admin `SUSPENDED`; terminal `DEACTIVATED`. Not `LOST` / `REPLACED`.

**Relations:** `CardAssignment.userId` and `Profile.userId` are Prisma `@relation`s to `User` (`assignments`, `profiles` back-relations). Indexes exist on `NFCCard(batchId, status)`, `CardAssignment(userId, cardId)`, and `ProfileEvent(cardId, timestamp)`.

**Profile lookup:** no `Profile.cardId`. Tap → `NFCCard.publicToken` → `CardAssignment` → `User` → `Profile` by `cardTypeId`. See `docs/DATABASE_CONTEXT.md`.

---

## Known Issues

1. **`fieldSchema.ts` taxonomy:** Needs alignment to `long_text` and `list_of_strings` (F-004).
