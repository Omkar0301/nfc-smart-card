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

- **Location:** `apps/web/app/p/[type]/[token]/page.tsx` _(F-010)_
- **Rendering:** React Server Component rendered on demand by Next.js App Router.
- **Metadata & SEO:** `generateMetadata()` dynamically populates Open Graph tags (`og:title`, `og:image`, `og:url`) and Twitter Cards.
- **Template Components:** Imported from `packages/shared/src/templates/` — React Server Components shared across templates.
- **Caching & Revalidation:** Next.js Data Cache tagged with `profile-${token}`. Invalidated using `revalidateTag("profile-${token}")` when a cardholder updates their profile, switches templates, or pauses/resumes their card.
- **Visibility Enforcement:** Profile fields are filtered server-side (in `apps/api` or during Server Component data fetching) before rendering.

### 2. Customer Portal — `/portal/*`

- **Location:** `apps/web/app/portal/` _(F-011)_
- **Rendering:** Client-interactive Next.js components (`'use client'`).
- **Auth:** JWT Bearer token attached to API requests via HTTP client.

### 3. Admin Portal — `/admin/*`

- **Location:** `apps/web/app/admin/` _(F-012)_
- **Rendering:** Client-interactive Next.js components (`'use client'`).
- **Auth:** JWT Bearer token + server-enforced `role === 'ADMIN'` check.

---

## Express API Service (`apps/api`)

`apps/api` remains a dedicated Node.js/Express REST server and **must follow the Controller → Service → Repository (C-S-R) pattern** for all features:

- **`src/app.ts`**: CORS, JSON body parser, rate limiters, security headers (`helmet`), route mounting.
- **`src/server.ts`**: HTTP server listening on `PORT` (default `4000`) + `pg-boss` worker startup.
- **Controllers (`src/controllers/*.controller.ts`)**: Handle only HTTP concerns — Zod validation, `req`/`res` parsing, cookie handling, `sendSuccess`/`sendError` envelopes. No business logic or Prisma calls.
- **Services (`src/services/*.service.ts`)**: Contain all business logic — OTP hashing/generation, rate-limit checks, JWT signing/verification, suspension checks, transaction orchestration. Call repositories, never Prisma directly.
- **Repositories (`src/repositories/*.repository.ts`)**: Handle Prisma/database operations only — `findUnique`, `create`, `update`, `count`, transactions. No business rules, hashing, or HTTP concerns.
- **Routes (`src/routes/*.routes.ts`)**: Define `Router` and bind paths to controller handlers + middleware (`requireAuth`, `requireAdmin`).
- **Validators (`src/validators/*.validator.ts`)**: Zod schemas for request bodies/queries.
- **Providers/Utils (`src/providers/`, `src/utils/`)**: External I/O (OTP delivery) and pure helpers (`normalizePhone`).
- **Data Access:** All database queries go through Prisma via repositories (`apps/api/prisma/schema.prisma`).

### Mandatory Controller → Service → Repository Flow

```
HTTP Request
  → Routes (src/routes/*.routes.ts) — path + middleware binding
  → Controller (src/controllers/*.controller.ts) — Zod parse, call service, sendSuccess/sendError, set cookies
  → Service (src/services/*.service.ts) — business logic, orchestration, call repositories/providers
  → Repository (src/repositories/*.repository.ts) — Prisma queries only
  → PostgreSQL
```

New backend features must create or update files in these layers; do not place Prisma calls in controllers/services or business logic in repositories.

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

## Authentication System (F-002)

### OTP & JWT Flow

The platform uses **OTP-based authentication** (no passwords) with **JWT tokens** for session management.

**Auth Flow:**

1. **Send OTP** → `POST /auth/send-otp` with phone number
   - Validates phone (E.164 format)
   - Generates 6-digit random OTP
   - Hashes OTP with HMAC-SHA256 (stores only hash in `OtpVerification` table)
   - Rate limited: max 3 sends per phone per 10 minutes
2. **Verify OTP** → `POST /auth/verify-otp` with phone + 6-digit code
   - Compares code against stored hash
   - Max 5 failed attempts before lockout
   - Auto-creates `User` with CUSTOMER role if first-time login
   - Issues JWT access token (15 min expiry) + refresh token (7 days expiry)
3. **Use Access Token** → All authenticated requests include `Authorization: Bearer <accessToken>`
4. **Refresh Token** → `POST /auth/refresh` when access token expires
   - Validates refresh token signature + checks database (not revoked)
   - Issues new access token + rotates refresh token
5. **Logout** → `POST /auth/logout` revokes refresh token in database

**Tokens:**

- **Access Token:** Stateless JWT containing `{ sub: userId, role: Role, typ: "access" }`. No DB lookup on use.
- **Refresh Token:** JWT with JTI (JWT ID). Hash stored in `RefreshToken` table. Enables revocation and rotation.
- **Refresh Token Storage:** httpOnly cookie (secure, auto-sent by browser). Also accepted in request body for mobile clients.

**Security:**

- OTP never stored plaintext (HMAC-SHA256 hash required by Rule #14)
- JWT signed with `JWT_SECRET` environment variable (minimum 32 characters)
- Account suspension (`User.status = 'SUSPENDED'`) checked on every auth operation
- Role embedded in JWT; admin routes verify `role === 'ADMIN'` server-side (Rule #10)
- Token rotation: old refresh tokens revoked when new one issued

**Files (Feature F-002) — Controller → Service → Repository:**

- Controllers: `apps/api/src/controllers/auth.controller.ts`
- Services: `apps/api/src/services/auth.service.ts`, `services/otp.service.ts`, `services/token.service.ts`
- Repositories: `apps/api/src/repositories/user.repository.ts`, `repositories/otp.repository.ts`, `repositories/token.repository.ts`
- Routes: `apps/api/src/routes/auth.routes.ts`, `routes/index.ts` (aggregates `/auth`, `/health`, `/admin/health`)
- Validators: `apps/api/src/validators/auth.validator.ts`
- Providers/Utils: `apps/api/src/providers/otp.provider.ts`, `utils/phone.ts`
- Middleware: `apps/api/src/middleware/requireAuth.ts`, `middleware/requireAdmin.ts` (delegates to `user.repository` + `token.service`)
- Frontend: `apps/web/src/shared/api/auth.ts`, `context/AuthContext.tsx`, `hooks/useAuth.ts`, `components/OtpFlow/`
- Database: `OtpVerification` & `RefreshToken` tables (migration: `20260831120000_auth_otp_refresh_tokens`)

**See Also:**

- Detailed implementation: [docs/features/F-002-authentication-otp-jwt.md](./features/F-002-authentication-otp-jwt.md)
- Frontend integration: Implementation notes in F-002 feature doc

---

## Route → Handler Flow (Controller → Service → Repository)

```
HTTP Request (from Next.js Frontend or API client)
     ↓
Routes (apps/api/src/routes/*.routes.ts) — binds path + middleware
     ↓
Controller (apps/api/src/controllers/*.controller.ts) — Zod validation (via validators/), calls service, handles HTTP response/cookies
     ↓
Service (apps/api/src/services/*.service.ts) — business logic + orchestration, calls repositories
     ↓
Repository (apps/api/src/repositories/*.repository.ts) — Prisma ORM only
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
