# Project Context

## Project Purpose

A digital NFC card platform that lets businesses and individuals embed a permanent URL into a physical NFC chip. When the card is tapped, the platform resolves a token and renders a live, editable digital profile. The profile is controlled by the cardholder — they can update data, switch templates, toggle field visibility, and pause their card — without any change to the physical card.

MVP verticals: **Business Card** and **College/Student Card**.

Source specification: [`PRD_NFC_Digital_Card_Platform.md`](file:///d:/nfc-new/nfc-card-platform/PRD_NFC_Digital_Card_Platform.md)

---

## Technology Stack

| Layer | Technology | Details / Purpose |
|---|---|---|
| Frontend / Web Surface | Next.js (App Router), React 19, TypeScript | Customer Portal, Admin Portal, Public Profile SSR |
| Backend API | Node.js, Express 5, TypeScript | REST API endpoints, Auth, Business Logic |
| Public Profile SSR | Next.js App Router Server Components | `app/p/[type]/[token]/page.tsx` + `generateMetadata()` |
| Database | PostgreSQL | Managed via Prisma ORM |
| ORM | Prisma | Schema in `apps/api/prisma/schema.prisma` |
| Background Jobs | pg-boss (Postgres-native) | Bulk card generation, export (runs in `apps/api`) |
| File Storage | S3-compatible | Profile photo, template thumbnail uploads |
| Auth | JWT (access + refresh) + Mobile OTP | Header Bearer token for API |
| Shared Package | `@nfc-card/shared` | Types, field schema definitions, template components |

**Explicit non-stack decisions:** No Redis, No custom `ReactDOMServer` rendering inside Express, No Vite (replaced by Next.js), No test suite (explicit product decision per `.agents/rules.md` #18).

---

## Repository Structure

This is an **npm workspaces monorepo** (`package.json` at root).

```
nfc-card-platform/
├── package.json                  ← root workspace; `npm run dev` runs web (Next.js) + api (Express)
├── tsconfig.base.json            ← shared TS compiler options
├── PRD_NFC_Digital_Card_Platform.md
│
├── .agents/                      ← AI agent source of truth (read before coding)
│   ├── architecture.md           ← stack, rendering strategy, data model rationale
│   ├── rules.md                  ← enforced technical constraints
│   ├── skills.md                 ← reusable implementation patterns
│   ├── features.md               ← what is built/unbuilt (keep updated)
│   ├── workflows.md              ← agent process conventions
│   └── references.md            ← PRD section cross-references
│
├── docs/                         ← documentation
│   └── features/                 ← 17 feature PRDs (F-001 through F-017)
│
├── apps/
│   ├── web/                      ← Next.js App Router Frontend
│   │   ├── app/
│   │   │   ├── p/[type]/[token]/ ← SSR Public Profile Page + generateMetadata
│   │   │   ├── portal/           ← Customer Portal routes (Dashboard, Profile, Cards, etc.)
│   │   │   └── admin/            ← Admin Portal routes (Dashboard, Inventory, Types, Templates)
│   │   ├── components/           ← Portal UI components
│   │   ├── public/               ← Static public assets
│   │   ├── next.config.ts        ← Next.js configuration (headers, rewrites)
│   │   └── package.json          ← Next.js dependencies
│   │
│   └── api/                      ← Express REST API Server
│       ├── src/
│       │   ├── app.ts            ← Express app (CORS, JSON, routes)
│       │   ├── server.ts         ← HTTP server & pg-boss job worker runner
│       │   ├── auth/             ← OTP, JWT, recovery handlers
│       │   ├── routes/           ← REST endpoints (/cards, /profile, /admin/*)
│       │   └── services/         ← Business logic & Prisma operations
│       ├── prisma/
│       │   ├── schema.prisma     ← Database schema (7 existing + planned models)
│       │   └── migrations/       ← Database migrations
│       └── package.json          ← Express + Prisma dependencies
│
└── packages/
    └── shared/
        └── src/
            ├── index.ts          ← exports types.ts + fieldSchema.ts
            ├── types.ts          ← CardStatus enum, Role enum, User, Card interfaces
            ├── fieldSchema.ts    ← FieldType, FieldDefinition, CardFieldSchema
            └── templates/        ← Template React Server Components (Business & College)
```

---

## Architecture Summary (Option B)

- **`apps/web` (Next.js App Router):** Manages all visual surfaces. Public profile URLs (`/p/[type]/[token]`) are React Server Components that fetch data from the API/database, render with `generateMetadata()` for Open Graph tags, and revalidate via Next.js Data Cache tags (`revalidateTag`). Customer and Admin portals are client-interactive Next.js routes.
- **`apps/api` (Express REST Server):** Serves JSON REST API endpoints (`/auth`, `/profile`, `/cards`, `/admin/*`), manages database transactions via Prisma, enforces security middleware, and runs `pg-boss` background workers.

---

## Authentication Approach (Planned — F-002)

- **Primary flow:** Mobile OTP → verify → issue JWT access token + refresh token
- **Token format:** `Authorization: Bearer <accessToken>` header on all API calls
- **Account recovery:** email-based secondary recovery path (separate, rate-limited)
- **Role model:** `CUSTOMER` (default) | `ADMIN`

---

## Background Processing (Planned — F-005)

`pg-boss` (Postgres-native job queue) running inside `apps/api`. No Redis.
- Bulk card generation (resumable, retry on token collision)
- CSV export for large card batches

---

## Key Scripts

```bash
# Root workspace
npm run dev          # concurrently: web (next dev) + api (tsx watch)
npm run db:migrate   # prisma migrate dev (in apps/api)
npm run db:seed      # tsx prisma/seed.ts (in apps/api)
npm run db:studio    # prisma studio
```
