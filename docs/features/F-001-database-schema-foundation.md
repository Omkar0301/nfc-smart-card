# F-001 — Database Schema Foundation

**ID:** F-001  
**Priority:** 🔴 Critical  
**Phase:** 0 (Blocker — must ship before any other feature)  
**Status:** ✅ IMPLEMENTED (2026-08-31)  
**Depends on:** None  
**Blocks:** Every other feature (F-002 through F-017)

---

## Purpose

Fix the existing Prisma schema so it matches the PRD v2 data model exactly. The current schema was created with an incorrect `CardStatus` enum, missing relational FKs, and no performance indexes. No application code can be built correctly until this is resolved.

## User Story

_As a developer,_ I need the database schema to accurately represent every lifecycle state defined in the PRD, enforce relational integrity between Users, Profiles, and CardAssignments, and have indexes on high-traffic lookup paths — so that all subsequent features can be built on a correct, stable foundation.

---

## PRD Requirements Covered

- **§8** — NFC Card Lifecycle: `AVAILABLE → ASSIGNED → ACTIVE ⇄ PAUSED`, `SUSPENDED` (admin), `DEACTIVATED` (permanent)
- **§21** — Backend Data Model: User, Organization, CardType, NFCCard, CardAssignment, Template, Profile, ProfileEvent
- **§9** — `batchId` on NFCCard for defective-batch handling
- **§20** — `isBot` on ProfileEvent for analytics integrity
- **§10.2** — `email` on User for account recovery

---

## What Is Already Implemented

| Item                                     | Status          |
| ---------------------------------------- | --------------- |
| All 8 required models exist              | ✅ REUSE        |
| `CardType.fieldSchema` JSONB             | ✅ REUSE        |
| `Profile.data` JSONB                     | ✅ REUSE        |
| `Profile.fieldVisibility` JSONB          | ✅ REUSE        |
| `ProfileEvent.isBot` boolean             | ✅ REUSE        |
| `NFCCard.batchId`                        | ✅ REUSE        |
| `NFCCard.organizationId` nullable FK     | ✅ REUSE        |
| `User.email` optional (account recovery) | ✅ REUSE        |
| One migration file (20260820114814_init) | ✅ REUSE (base) |

---

## Conflicts & Gaps

### 🚫 CONFLICT 1 — `CardStatus` enum is wrong

**Current enum:**

```prisma
enum CardStatus {
  AVAILABLE
  ACTIVE
  PAUSED
  LOST      // ← Not a PRD state
  REPLACED  // ← Not a PRD state
}
```

**Required enum (PRD §8):**

```prisma
enum CardStatus {
  AVAILABLE     // Generated, unclaimed
  ASSIGNED      // ← MISSING — claimed, profile not yet published
  ACTIVE        // Public profile is live
  PAUSED        // Customer-initiated hide (reversible)
  SUSPENDED     // ← MISSING — admin-initiated hold (reversible, admin only)
  DEACTIVATED   // ← MISSING — permanent, no reversal
}
```

**Impact:** `ASSIGNED` is the state entered immediately on card claiming (F-007). `SUSPENDED` is admin-only lifecycle control (F-006). `DEACTIVATED` is the permanent end-state (F-006). All three are mandatory for PRD-compliant card lifecycle. `LOST` and `REPLACED` are not PRD states; the PRD handles "lost card" by setting `PAUSED` (customer) or `DEACTIVATED` + new card (permanent replacement).

### 🚫 CONFLICT 2 — Missing `@relation` on `CardAssignment.userId` → `User`

The `CardAssignment` model has a `userId String` field but no `@relation`. Prisma will not enforce referential integrity, and the generated client will not expose relational queries (`assignment.user`, `user.assignments`).

### 🚫 CONFLICT 3 — Missing `@relation` on `Profile.userId` → `User`

Same issue. The `Profile` model has `userId String` but no Prisma `@relation`. Queries like "find all profiles for a user" require a raw filter rather than a proper relation.

### ❌ MISSING — No direct `Profile ↔ NFCCard` link

`Profile` is linked to `User` and `CardType`, but not to a specific `NFCCard`. The path from "a tap of token X" to "which profile to render" goes: `NFCCard.publicToken → NFCCard → CardAssignment → userId → Profile (filtered by cardTypeId)`. This join chain must be consistently applied. A direct `cardId` FK on Profile would simplify this, but the PRD data model does not include one — the join chain through `CardAssignment` is the intended approach and must be documented.

### ❌ MISSING — Performance indexes

The following high-traffic query paths have no supporting index beyond the primary key:

- `ProfileEvent(cardId, timestamp)` — analytics time-range queries
- `CardAssignment(userId)` — "find cards owned by user" (every portal load)
- `CardAssignment(cardId)` — "find who owns this card" (every public profile load)
- `NFCCard(batchId)` — batch invalidation queries
- `NFCCard(status)` — admin filtering by status

---

## Database Requirements

### MODIFY — `CardStatus` enum

```prisma
// REMOVE: LOST, REPLACED
// ADD: ASSIGNED, SUSPENDED, DEACTIVATED

enum CardStatus {
  AVAILABLE
  ASSIGNED
  ACTIVE
  PAUSED
  SUSPENDED
  DEACTIVATED
}
```

### MODIFY — `CardAssignment` model — add User relation

```prisma
model CardAssignment {
  id           String    @id @default(cuid())
  cardId       String
  card         NFCCard   @relation(fields: [cardId], references: [id])
  userId       String
  user         User      @relation(fields: [userId], references: [id])  // ADD
  assignedAt   DateTime  @default(now())
  unassignedAt DateTime?
  status       String    @default("ACTIVE")
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}
```

### MODIFY — `User` model — add back-relation for CardAssignment

```prisma
model User {
  // existing fields...
  assignments  CardAssignment[]  // ADD
  profiles     Profile[]         // ADD
}
```

### MODIFY — `Profile` model — add User relation

```prisma
model Profile {
  // existing fields...
  userId    String
  user      User     @relation(fields: [userId], references: [id])  // ADD
}
```

### CREATE — Performance indexes

```prisma
model ProfileEvent {
  // existing fields...
  @@index([cardId, timestamp])   // ADD
}

model CardAssignment {
  // existing fields...
  @@index([userId])   // ADD
  @@index([cardId])   // ADD
}

model NFCCard {
  // existing fields...
  @@index([batchId])  // ADD
  @@index([status])   // ADD
}
```

---

## Backend Requirements

No application code is required for this feature — it is a schema-only change. The migration is generated by Prisma CLI.

**Commands to run after schema edits:**

```bash
cd apps/api
npx prisma migrate dev --name fix_card_status_enum_and_relations
npx prisma generate
```

---

## Frontend Requirements

None — schema-only change, no UI impact.

---

## Validation & Error Cases

| Case                                                             | Expected                                                  |
| ---------------------------------------------------------------- | --------------------------------------------------------- |
| Attempting to set `LOST` or `REPLACED` on a card                 | Prisma will reject (not valid enum value after migration) |
| Attempting to create a CardAssignment with a non-existent userId | Postgres FK violation (now enforced)                      |
| Attempting to create a Profile with a non-existent userId        | Postgres FK violation (now enforced)                      |

---

## Acceptance Criteria

- [ ] `CardStatus` enum contains exactly: `AVAILABLE`, `ASSIGNED`, `ACTIVE`, `PAUSED`, `SUSPENDED`, `DEACTIVATED`
- [ ] `CardStatus` enum does NOT contain `LOST` or `REPLACED`
- [ ] `CardAssignment.userId` has a Prisma `@relation` to `User`
- [ ] `Profile.userId` has a Prisma `@relation` to `User`
- [ ] `User` model has `assignments CardAssignment[]` and `profiles Profile[]` back-relations
- [ ] `ProfileEvent` has composite index on `(cardId, timestamp)`
- [ ] `CardAssignment` has index on `userId` and index on `cardId`
- [ ] `NFCCard` has index on `batchId` and index on `status`
- [ ] `prisma migrate dev` runs without errors
- [ ] `prisma generate` runs without errors
- [ ] `architecture.md §5` is updated to reflect the corrected schema

---

## Implementation Tasks

- [ ] **T-001-1:** Edit `apps/api/prisma/schema.prisma` — fix `CardStatus` enum (remove LOST, REPLACED; add ASSIGNED, SUSPENDED, DEACTIVATED)
- [ ] **T-001-2:** Edit `schema.prisma` — add `@relation` for `CardAssignment.userId → User`
- [ ] **T-001-3:** Edit `schema.prisma` — add `@relation` for `Profile.userId → User`
- [ ] **T-001-4:** Edit `schema.prisma` — add back-relations (`assignments`, `profiles`) to `User` model
- [ ] **T-001-5:** Edit `schema.prisma` — add all 5 missing performance indexes
- [ ] **T-001-6:** Run `prisma migrate dev` to generate migration file
- [ ] **T-001-7:** Run `prisma generate` to regenerate Prisma client
- [ ] **T-001-8:** Update `.agents/architecture.md §5` to match the corrected schema
- [ ] **T-001-9:** Append entry to `.agents/features.md`
