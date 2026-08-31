# Completed Feature Context

Append-only log. This is the project's memory of what has actually been built — read this (not the whole codebase) to know what exists before starting a new feature. One entry per feature, added at the end of the Feature Development Cycle (`workflows.md`), never edited retroactively except to correct an error.

---

## [Phase 1] F-001 Database Schema Foundation — 2026-08-31

**What was implemented:**
Corrected Prisma `CardStatus` to the PRD §8 lifecycle, added User relations on `CardAssignment` and `Profile`, and added performance indexes. Shared `CardStatus` in `packages/shared/src/types.ts` was aligned with the schema.

**Frontend (apps/web):**
- None (schema-only).

**Backend (apps/api):**
- None (schema-only). No new API endpoints.

**Database:**
- `CardStatus`: `AVAILABLE`, `ASSIGNED`, `ACTIVE`, `PAUSED`, `SUSPENDED`, `DEACTIVATED` (removed `LOST`, `REPLACED`).
- `CardAssignment.user` / `Profile.user` Prisma relations; `User.assignments`, `User.profiles`.
- Indexes: `NFCCard(batchId)`, `NFCCard(status)`, `CardAssignment(userId)`, `CardAssignment(cardId)`, `ProfileEvent(cardId, timestamp)`.
- Migration: `apps/api/prisma/migrations/20260831100000_fix_card_status_enum_and_relations/`.

**Data flow:**
- Public profile resolution remains `NFCCard.publicToken` → `CardAssignment` → `User` → `Profile` (by `cardTypeId`); no `Profile.cardId`.

**Architectural decisions:**
- Migration SQL remaps leftover `LOST` → `PAUSED` and `REPLACED` → `DEACTIVATED` so the enum swap cannot fail on existing rows.
- `.agents/architecture.md` data-model summary and `docs/DATABASE_CONTEXT.md` / `docs/ARCHITECTURE.md` updated.

**Depends on:**
- None.

**Constraints / conventions introduced:**
- Do not reintroduce `LOST`/`REPLACED` as `CardStatus` values. Keep `packages/shared` `CardStatus` in lockstep with Prisma.
- Apply the migration against a reachable Postgres (`npx prisma migrate deploy` in `apps/api`) before building lifecycle features.

---

## Entry template

Copy this block for each new entry. Keep every field short and factual — this is a reference log, not prose documentation.

```
## [Phase N] Feature name — YYYY-MM-DD

**What was implemented:**
One or two sentences, plain description.

**Frontend (apps/web):**
- Components/pages added or changed, with paths.

**Backend (apps/api):**
- Routes/services added or changed, with paths.
- New/changed API endpoints (method + path).

**Database:**
- Schema/migration changes (models, fields). None, if unchanged.

**Data flow:**
- Brief description of how data moves through this feature (request → service → DB → response), only if non-obvious.

**Architectural decisions:**
- Anything decided during implementation that isn't already in architecture.md, and whether architecture.md was updated as a result.

**Depends on:**
- Prior features/phases this build assumes are already in place.

**Constraints / conventions introduced:**
- Anything a future feature needs to respect (naming, validation rule, invariant) that isn't already covered in rules.md or skills.md.
```
