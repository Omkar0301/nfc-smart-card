# F-005 — Bulk Card Generation (Background Job)

**ID:** F-005  
**Priority:** 🔴 Critical  
**Phase:** 3  
**Status:** ❌ NOT STARTED  
**Depends on:** F-004 (card types must exist), F-002 (admin auth)  
**Required by:** F-006, F-007

---

## Purpose

Implement the admin-triggered bulk card generation system using a Postgres-backed background job (pg-boss). Generating hundreds or thousands of cards must not block an HTTP request, must be resumable on failure, and must produce unique, cryptographically-random public tokens. Each card is also tagged with a batch ID to support defective-batch invalidation.

## User Story

**Admin:**  
*As a super admin, I want to select a card type and quantity (e.g. 1,000 Business cards), submit the request, and see real-time job progress — so I can generate inventory without waiting for a long-running HTTP request to complete, and without losing progress if something goes wrong partway through.*

*As a super admin, I want to export the generated card data as a CSV — so I can send the manufacturer the card numbers, types, and NFC URLs they need to program the physical chips.*

*As a super admin, I want to mark a batch as defective and invalidate all still-AVAILABLE cards in it — so that QC-rejected print runs don't reach customers.*

---

## PRD Requirements Covered

- **§9** — Background job, resumable, idempotent, token collision retries, batchId, CSV export, defective batch invalidation
- **§22** — `POST /admin/cards/generate`, `GET /admin/jobs/:id`, `GET /admin/cards/export`
- **§24, #8** — Public tokens must be cryptographically random and never sequential
- **§4, goal 1–3** — Generate large batches; export for manufacturer; program URLs into physical chips
- **§26** — Admin can generate 1,000+ cards without blocking the request

---

## What Is Already Implemented

| Item | Status |
|---|---|
| `NFCCard` model (cardNumber, publicToken, cardTypeId, batchId, status, organizationId) | ✅ REUSE |
| `CardStatus.AVAILABLE` enum value | ✅ REUSE (after F-001 fix) |
| `batchId` field on NFCCard | ✅ REUSE |
| `NFCCard.publicToken` unique index | ✅ REUSE |
| `NFCCard.cardNumber` unique index | ✅ REUSE |

---

## Gaps & Missing Items

- ❌ pg-boss not installed or imported
- ❌ No job queue setup or worker process
- ❌ No card generation logic
- ❌ No crypto-random token generator
- ❌ No card number sequencing per card type (e.g. `BC-000001`)
- ❌ No CSV export
- ❌ No defective batch invalidation endpoint
- ❌ No job status tracking model
- ❌ No admin UI for generation or export

---

## Business Rules

1. **Generation is always async** — `POST /admin/cards/generate` enqueues a job and returns immediately with a `jobId`. It never generates cards synchronously.
2. **The job is resumable** — if it crashes at card 500 of 1,000, restarting continues from card 501, not from zero. Implementation: track how many cards in the batch have been written; use a separate `GenerationJob` table or pg-boss job state.
3. **Token uniqueness** — `publicToken` is generated using `crypto.randomBytes(16).toString('base64url')` (or equivalent). On a unique-constraint collision, retry up to 5 times before marking the specific token-pair as failed and continuing the batch.
4. **Token format constraints** — Never sequential, never derived from card number. A token like `/b/1` or `/b/000001` is explicitly disallowed.
5. **Card number format** — Human-readable, sequential per card type: `BC-000001` (Business), `CC-000001` (College). The prefix is derived from the card type slug. Sequence is the next available number for that card type (query `MAX(cardNumber)` for the type).
6. **Batch ID** — A UUID generated at job enqueue time, shared across all cards in the batch. Used for defective-batch invalidation.
7. **All generated cards start as `AVAILABLE`.**
8. **Defective batch invalidation** — Sets `status = DEACTIVATED` on all cards in a batch where `status = AVAILABLE`. Cards already `ASSIGNED`, `ACTIVE`, or `PAUSED` in the same batch are untouched (they're in customers' hands).
9. **CSV export** — Columns: Card Number, Card Type, NFC URL, Status. NFC URL format: `https://{WEB_URL}/p/{cardType.slug}/{card.publicToken}`.

---

## Card Number Prefix Map

| CardType Slug | Prefix | Example |
|---|---|---|
| `business` | `BC` | `BC-000001` |
| `college` | `CC` | `CC-000001` |
| `doctor` | `DC` | `DC-000001` (post-MVP) |
| `employee` | `EC` | `EC-000001` (post-MVP) |
| `freelancer` | `FC` | `FC-000001` (post-MVP) |

The prefix is stored in the `CardType` record (add a `cardNumberPrefix` field to the schema) or derived from slug convention — **must be stored**, not derived at runtime, to avoid inconsistency if the slug is later renamed.

---

## Database Requirements

### MODIFY — `CardType` model — add `cardNumberPrefix`

```prisma
model CardType {
  // existing fields...
  cardNumberPrefix  String   // "BC" | "CC" | ... — must be unique across card types
}
```

Add `@@unique([cardNumberPrefix])` constraint.

### CREATE — `GenerationJob` table (job state tracker)

pg-boss manages job queuing, but a separate table is needed to track batch-level progress visible to the admin dashboard:

```prisma
model GenerationJob {
  id           String   @id @default(cuid())
  batchId      String   @unique
  cardTypeId   String
  cardType     CardType @relation(fields: [cardTypeId], references: [id])
  requestedBy  String   // userId of the admin who triggered
  quantity     Int
  generated    Int      @default(0)  // cards successfully written so far
  status       String   @default("PENDING")  // PENDING | RUNNING | COMPLETED | FAILED | PARTIAL
  startedAt    DateTime?
  completedAt  DateTime?
  errorMessage String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([status])
  @@index([cardTypeId])
}
```

---

## Backend Requirements

### Dependencies to Add

```bash
npm install pg-boss --workspace=apps/api
npm install @types/pg --workspace=apps/api --save-dev
```

### Files to CREATE

| File | Purpose |
|---|---|
| `src/lib/queue.ts` | pg-boss instance initialization and connection |
| `src/jobs/cardGeneration.ts` | Job worker: token generation, collision retry, batch write, progress update |
| `src/services/cardService.ts` | Card number sequencing, batch validation, defective-batch invalidation |
| `src/routes/admin/cards.ts` | Admin card endpoints (generation, status, export) |

### API Endpoints

#### `POST /admin/cards/generate`
- **Auth required:** Admin
- **Input:** `{ cardTypeId: string, quantity: number }` (quantity: 1–10,000, validated)
- **Logic:** validate card type exists + is ACTIVE → generate `batchId` → create `GenerationJob` row (PENDING) → enqueue pg-boss job with `{ batchId, cardTypeId, quantity, requestedBy }` → respond immediately
- **Response:** `202 { jobId: string, batchId: string, message: "Generation job enqueued" }`

#### `GET /admin/jobs/:id`
- **Auth required:** Admin
- **Logic:** find `GenerationJob` by id → return current state
- **Response:** `200 { job: { id, batchId, cardTypeId, quantity, generated, status, startedAt, completedAt, errorMessage } }`

#### `GET /admin/cards/export`
- **Auth required:** Admin
- **Query params:** `?cardTypeId=...&status=...&batchId=...` (all optional filters)
- **Logic:** query NFCCard with filters → generate CSV → stream response with `Content-Disposition: attachment; filename="cards-export.csv"`
- **Response:** CSV file stream

#### `POST /admin/cards/batches/:batchId/invalidate` *(defective batch)*
- **Auth required:** Admin
- **Logic:** find all `NFCCard` where `batchId = :batchId` AND `status = AVAILABLE` → bulk update `status = DEACTIVATED` → return count
- **Response:** `200 { invalidated: N, skipped: M, message: "M cards in assigned/active/paused state were skipped" }`

---

## Job Worker Logic (`cardGeneration.ts`)

```
On job start:
  1. Update GenerationJob.status = RUNNING, startedAt = now()
  2. Fetch current highest cardNumber for this cardType (for sequencing)
  3. In batches of 50:
     a. Generate publicToken = crypto.randomBytes(16).toString('base64url')
     b. Generate cardNumber = prefix + padded sequence number
     c. Attempt INSERT into NFCCard
     d. On unique constraint violation (collision): retry token, up to 5 times
     e. On success: increment GenerationJob.generated
  4. On complete: Update GenerationJob.status = COMPLETED, completedAt = now()
  5. On unrecoverable error: Update GenerationJob.status = FAILED (or PARTIAL if some cards written)
  6. Job is idempotent: if re-queued for same batchId, check existing generated count and continue from there
```

---

## Frontend Requirements

### Files to CREATE

| File | Purpose |
|---|---|
| `src/admin/CardManagement/GenerateCards.tsx` | Form: select card type, enter quantity, submit; shows job progress |
| `src/admin/CardManagement/JobStatus.tsx` | Real-time job progress display (polls `GET /admin/jobs/:id` until complete) |
| `src/admin/CardManagement/BatchInvalidate.tsx` | Form to mark a batch as defective |
| `src/shared/api/cards.ts` | `generateCards()`, `getJobStatus()`, `exportCards()`, `invalidateBatch()` API calls |

---

## Validation & Error Cases

| Case | Behavior |
|---|---|
| `quantity` < 1 or > 10,000 | `400 { error: { code: "INVALID_QUANTITY" } }` |
| `cardTypeId` not found | `404 { error: { code: "CARD_TYPE_NOT_FOUND" } }` |
| `cardTypeId` refers to inactive CardType | `400 { error: { code: "CARD_TYPE_INACTIVE" } }` |
| Job ID not found | `404 { error: { code: "JOB_NOT_FOUND" } }` |
| Batch ID not found for invalidation | `404 { error: { code: "BATCH_NOT_FOUND" } }` |
| Batch already fully invalidated | `200` with `invalidated: 0, skipped: 0` |
| Token collision after 5 retries | Log error, skip that card, continue batch (GenerationJob reflects partial completion) |

---

## Acceptance Criteria

- [ ] `POST /admin/cards/generate` returns 202 with `jobId` immediately (not blocking)
- [ ] Job worker generates specified number of `NFCCard` rows with `status = AVAILABLE`
- [ ] All generated `publicToken` values are unique and pass uniqueness constraint
- [ ] No two tokens are sequential or guessable (verified by visual inspection and DB check)
- [ ] Card numbers follow format `BC-000001`, `CC-000001` for respective types
- [ ] `GET /admin/jobs/:id` returns job progress (generated count + status)
- [ ] Job can be re-run after failure and continues without duplicating already-created cards
- [ ] `GET /admin/cards/export` returns a valid CSV with correct columns
- [ ] `POST /admin/cards/batches/:batchId/invalidate` sets AVAILABLE cards to DEACTIVATED
- [ ] ASSIGNED/ACTIVE/PAUSED cards in the same batch are NOT affected by invalidation
- [ ] pg-boss is Postgres-native (no Redis dependency added)

---

## Implementation Tasks

- [ ] **T-005-1:** Install `pg-boss` in `apps/api`
- [ ] **T-005-2:** Add `cardNumberPrefix` field to `CardType` in schema; run migration; update seed data with prefixes
- [ ] **T-005-3:** Add `GenerationJob` model to schema; run migration
- [ ] **T-005-4:** Create `src/lib/queue.ts` — pg-boss init and export
- [ ] **T-005-5:** Create `src/jobs/cardGeneration.ts` — job worker with token gen, sequencing, collision retry, progress tracking
- [ ] **T-005-6:** Create `src/services/cardService.ts` — card number sequencing, batch invalidation
- [ ] **T-005-7:** Create `src/routes/admin/cards.ts` — generation, job status, export, batch invalidate endpoints
- [ ] **T-005-8:** Mount card routes in `app.ts` under `/admin/cards`
- [ ] **T-005-9:** Start pg-boss worker in `server.ts` (or a separate worker entry point)
- [ ] **T-005-10:** Create frontend `GenerateCards.tsx`, `JobStatus.tsx`, `BatchInvalidate.tsx`
- [ ] **T-005-11:** Create `src/shared/api/cards.ts`
- [ ] **T-005-12:** Update `.agents/features.md` on completion
