# Database Context

## Overview

The platform uses a single PostgreSQL database managed via **Prisma ORM**.

- **Schema Location:** [`apps/api/prisma/schema.prisma`](file:///d:/nfc-new/nfc-card-platform/apps/api/prisma/schema.prisma)
- **Prisma Config:** [`apps/api/prisma.config.ts`](file:///d:/nfc-new/nfc-card-platform/apps/api/prisma.config.ts)
- **Migrations Directory:** [`apps/api/prisma/migrations/`](file:///d:/nfc-new/nfc-card-platform/apps/api/prisma/migrations/)

---

## Enums

### `Role`

- `CUSTOMER` (default)
- `ADMIN`

### `CardStatus`

Canonical NFC card lifecycle (PRD §8):

- `AVAILABLE` — generated, unclaimed
- `ASSIGNED` — claimed, profile not yet published
- `ACTIVE` — public profile is live
- `PAUSED` — customer-initiated hide (reversible)
- `SUSPENDED` — admin-initiated hold (reversible, admin only)
- `DEACTIVATED` — permanent end-state, no reversal

`LOST` and `REPLACED` are not card statuses. A lost card is `PAUSED` (customer) or `DEACTIVATED` plus a new physical card (permanent replacement).

---

## Existing Data Models

### 1. `User`

Accounts for customers and super admins.

- `id`: String (cuid, Primary Key)
- `name`: String
- `email`: String? (Unique, used for account recovery PRD §10.2)
- `phone`: String (Unique, primary OTP login identifier)
- `role`: Role (`CUSTOMER` | `ADMIN`)
- `status`: UserStatus (`ACTIVE` | `SUSPENDED` | `DEACTIVATED`, default `ACTIVE`)
- `createdAt`, `updatedAt`
- `assignments`: `CardAssignment[]`
- `profiles`: `Profile[]`

### 2. `Organization`

Reserved for B2B multi-card enterprise accounts (Schema-only in MVP, PRD §6.4).

- `id`: String (cuid, Primary Key)
- `name`: String
- `status`: String (default `"ACTIVE"`)
- `cards`: `NFCCard[]` (One-to-Many)

### 3. `CardType`

Config-driven verticals (e.g. Business Card, College Card).

- `id`: String (cuid, Primary Key)
- `name`: String (e.g. "Business Card")
- `slug`: String (Unique, e.g. `"business"`, `"college"`)
- `cardNumberPrefix`: String (Unique, e.g. `"BC"`, `"CC"`) [Added in F-005]
- `description`: String?
- `fieldSchema`: Json (Array of field definitions: `key`, `label`, `type`, `required`, `defaultVisible`)
- `status`: String (default `"ACTIVE"`)
- `cards`: `NFCCard[]`
- `templates`: `Template[]`
- `profiles`: `Profile[]`
- `jobs`: `GenerationJob[]`

### 4. `NFCCard`

Physical card inventory item.

- `id`: String (cuid, Primary Key)
- `cardNumber`: String (Unique, sequential per type, e.g. `"BC-000001"`)
- `publicToken`: String (Unique, crypto-random, non-sequential URL token)
- `cardTypeId`: String (Foreign Key → `CardType.id`)
- `organizationId`: String? (Foreign Key → `Organization.id`)
- `batchId`: String? (UUID for batch invalidation)
- `status`: CardStatus (default `AVAILABLE`)
- `assignments`: `CardAssignment[]`
- `events`: `ProfileEvent[]`
- Indexes: `batchId`, `status`

### 5. `CardAssignment`

Links a user to an NFC card; doubles as assignment history.

- `id`: String (cuid, Primary Key)
- `cardId`: String (Foreign Key → `NFCCard.id`)
- `userId`: String (Foreign Key → `User.id`)
- `assignedAt`: DateTime (default `now()`)
- `unassignedAt`: DateTime? (populated when card is unassigned/replaced)
- `status`: String (default `"ACTIVE"`)
- Indexes: `userId`, `cardId`

### 6. `Template`

Visual layouts scoped to a `CardType`.

- `id`: String (cuid, Primary Key)
- `cardTypeId`: String (Foreign Key → `CardType.id`)
- `name`: String (e.g. "Modern")
- `slug`: String (globally unique registry key, e.g. "business-modern") [added in F-009]
- `thumbnail`: String?
- `isActive`: Boolean (default `true`)
- `isPremium`: Boolean (default `false`)
- `sortOrder`: Int (default `0`; display order within a card type's library) [added in F-009]
- `configuration`: Json (template-specific style options; seeded templates carry a `description`)
- `profiles`: `Profile[]`

**F-009 seeded library:** `business-modern`, `business-minimal`, `business-premium`, `college-academic`, `college-modern`, `college-creative`. Each `slug` must match a key in the `templateRegistry` in `packages/shared/src/templates/index.tsx`. Legacy placeholder slugs (`modern`, `minimal`, `premium`, `academic`, `creative`) are deactivated (not deleted) by the seed script.

### 7. `Profile`

Single profile model replacing vertical-specific tables.

- `id`: String (cuid, Primary Key)
- `userId`: String (Foreign Key → `User.id`)
- `cardTypeId`: String (Foreign Key → `CardType.id`)
- `templateId`: String? (Foreign Key → `Template.id`)
- `data`: Json (field values keyed by `fieldSchema[].key`)
- `fieldVisibility`: Json (`{ [fieldKey]: boolean }` overrides schema defaults)
- `status`: String (default `"draft"`, values: `"draft"` | `"published"`)

### 8. `ProfileEvent`

Analytics interaction records.

- `id`: String (cuid, Primary Key)
- `cardId`: String (Foreign Key → `NFCCard.id`)
- `profileId`: String?
- `eventType`: String (`SCAN`, `PROFILE_VIEW`, `PHONE_CLICK`, etc.)
- `timestamp`: DateTime (default `now()`)
- `metadata`: Json? (sessionId, referrer, clickTarget)
- `isBot`: Boolean (default `false`)
- Index: composite `(cardId, timestamp)` for analytics time-range queries

### 9. `GenerationJob` [F-005]

Batch card generation progress tracker for pg-boss jobs.

- `id`: String (cuid, Primary Key)
- `batchId`: String (Unique UUID)
- `cardTypeId`: String (Foreign Key → `CardType.id`)
- `requestedBy`: String (Admin user ID)
- `quantity`: Int
- `generated`: Int (default 0)
- `status`: String (default `"PENDING"`, values: `PENDING` | `RUNNING` | `COMPLETED` | `FAILED` | `PARTIAL`)
- `startedAt`: DateTime?
- `completedAt`: DateTime?
- `errorMessage`: String?
- `createdAt`, `updatedAt`
- Indexes: `status`, `cardTypeId`

### 10. `OtpVerification` & `RefreshToken` [F-002]

Authentication tracking models for SMS/phone OTP verification and JWT session refresh tokens with revocation support.

### 11. `AccountRecoveryToken` [F-003]

Secondary email recovery token hashes and expiration tracking.

### 12. `CardReplacementRequest` [F-011 / F-015]

Customer self-service card replacement and report-lost tracking.

- `id`: String (cuid, Primary Key)
- `cardId`: String (Foreign Key → `NFCCard.id`)
- `userId`: String (Foreign Key → `User.id`)
- `reason`: String? (`"LOST"` | `"DAMAGED"` | `"STOLEN"` | `"OTHER"`)
- `notes`: String?
- `status`: String (default `"PENDING"`, values: `PENDING` | `IN_PROGRESS` | `COMPLETED` | `CANCELLED`)
- `resolvedAt`: DateTime?
- `createdAt`, `updatedAt`
- Indexes: `userId`, `cardId`, `status`

---

## Database Rules & Invariants

1. **Config-Driven Verticals:** Never add vertical-specific profile tables (e.g. `DoctorProfile`). Vertical fields live in `CardType.fieldSchema` and values live in `Profile.data` (JSONB).
2. **Crypto-Random Tokens:** `NFCCard.publicToken` must be generated with `crypto.randomBytes()`. Never use sequential IDs or readable strings for `publicToken`.
3. **Transactional Claims:** Card claiming MUST use a Prisma interactive transaction with a row lock (`SELECT ... FOR UPDATE`) to prevent race conditions.
4. **Soft-Delete Strategy:**
   - Cards are deactivated by setting `status = DEACTIVATED`. No hard-deletions on cards.
   - Card assignments set `unassignedAt = now()` and `status = "INACTIVE"` when replaced.
5. **Timestamps:** Every model includes `createdAt DateTime @default(now())` and `updatedAt DateTime @updatedAt`.
6. **Migrations:** Managed via `npx prisma migrate dev` in `apps/api`.
