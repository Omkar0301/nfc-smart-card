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
> ⚠️ **Known Schema Divergence:** The current `schema.prisma` defines `AVAILABLE, ACTIVE, PAUSED, LOST, REPLACED`.
> Per PRD §8 and audit ([F-001](file:///d:/nfc-new/nfc-card-platform/docs/features/F-001-database-schema-foundation.md)), the canonical lifecycle enum is:
> `AVAILABLE, ASSIGNED, ACTIVE, PAUSED, SUSPENDED, DEACTIVATED`.
> `F-001` must be applied before lifecycle-dependent code is built.

---

## Existing Data Models

### 1. `User`
Accounts for customers and super admins.
- `id`: String (cuid, Primary Key)
- `name`: String
- `email`: String? (Unique, used for account recovery PRD §10.2)
- `phone`: String (Unique, primary OTP login identifier)
- `role`: Role (`CUSTOMER` | `ADMIN`)
- `status`: String (default `"ACTIVE"`)
- `createdAt`, `updatedAt`

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
- `description`: String?
- `fieldSchema`: Json (Array of field definitions: `key`, `label`, `type`, `required`, `defaultVisible`)
- `status`: String (default `"ACTIVE"`)
- `cards`: `NFCCard[]`
- `templates`: `Template[]`
- `profiles`: `Profile[]`

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

### 5. `CardAssignment`
Links a user to an NFC card; doubles as assignment history.
- `id`: String (cuid, Primary Key)
- `cardId`: String (Foreign Key → `NFCCard.id`)
- `userId`: String (Foreign Key → `User.id`) — ⚠️ *Needs `@relation` attribute fix in F-001*
- `assignedAt`: DateTime (default `now()`)
- `unassignedAt`: DateTime? (populated when card is unassigned/replaced)
- `status`: String (default `"ACTIVE"`)

### 6. `Template`
Visual layouts scoped to a `CardType`.
- `id`: String (cuid, Primary Key)
- `cardTypeId`: String (Foreign Key → `CardType.id`)
- `name`: String (e.g. "Modern")
- `slug`: String (e.g. "business-modern")
- `thumbnail`: String?
- `isActive`: Boolean (default `true`)
- `isPremium`: Boolean (default `false`)
- `configuration`: Json (template-specific style options)
- `profiles`: `Profile[]`

### 7. `Profile`
Single profile model replacing vertical-specific tables.
- `id`: String (cuid, Primary Key)
- `userId`: String — ⚠️ *Needs `@relation` attribute fix in F-001*
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

---

## Planned Additional Models (from Feature PRDs)

| Model | Feature | Purpose |
|---|---|---|
| `OtpVerification` | [F-002](file:///d:/nfc-new/nfc-card-platform/docs/features/F-002-authentication-otp-jwt.md) | Phone OTP verification codes & expiry |
| `RefreshToken` | [F-002](file:///d:/nfc-new/nfc-card-platform/docs/features/F-002-authentication-otp-jwt.md) | JWT refresh tokens with revocation support |
| `AccountRecoveryToken` | [F-003](file:///d:/nfc-new/nfc-card-platform/docs/features/F-003-account-recovery.md) | Secondary email recovery token hashes |
| `GenerationJob` | [F-005](file:///d:/nfc-new/nfc-card-platform/docs/features/F-005-bulk-card-generation.md) | Batch card generation progress tracker for pg-boss |
| `CardReplacementRequest` | [F-015](file:///d:/nfc-new/nfc-card-platform/docs/features/F-015-customer-card-lifecycle.md) | Customer replacement requests for lost/damaged cards |

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
