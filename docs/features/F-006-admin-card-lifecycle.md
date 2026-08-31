# F-006 — Admin Card Inventory & Lifecycle Management

**ID:** F-006  
**Priority:** 🟡 High  
**Phase:** 3  
**Status:** ❌ NOT STARTED  
**Depends on:** F-005 (cards must exist), F-002 (admin auth)  
**Required by:** F-012 (admin portal UI)

---

## Purpose

Give super admins full visibility and control over every card in the system: search and filter the inventory, view card details and assignment history, and trigger all admin-controlled lifecycle transitions (assign, activate, suspend, deactivate, replace). This is the operational control plane for the entire platform.

## User Story

**Admin:**  
_As a super admin, I want to search, filter, and view all cards in the system — so I can quickly find a specific card, see its current owner, and take any necessary lifecycle action._

_As a super admin, I want to suspend a card under investigation and deactivate a lost or abandoned card — so I can protect the platform and the customer without waiting for support tickets._

_As a super admin, I want to replace a lost card with a new one while preserving the customer's profile — so the customer can continue using the platform after card loss._

---

## PRD Requirements Covered

- **§8** — Lifecycle states: AVAILABLE, ASSIGNED, ACTIVE, PAUSED, SUSPENDED, DEACTIVATED (admin controls SUSPENDED and DEACTIVATED)
- **§19** — Admin portal: card search, filter by type/status, view + assign, suspend, deactivate, replace, export
- **§22** — `GET /admin/cards`, `GET /admin/cards/:id`, `POST /admin/cards/:id/assign`, `POST /admin/cards/:id/activate`, `POST /admin/cards/:id/suspend`, `POST /admin/cards/:id/deactivate`, `POST /admin/cards/:id/replace`
- **§17** — Replace flow: new card assigned, profile carries over, old card deactivated
- **rules.md #10** — Admin APIs verify `role === ADMIN` server-side
- **rules.md #15** — SUSPENDED is admin-only; admin can also clear SUSPENDED → ACTIVE
- **rules.md #16** — DEACTIVATED is permanent; no endpoint reverses it

---

## What Is Already Implemented

| Item                                   | Status   |
| -------------------------------------- | -------- |
| `NFCCard` model                        | ✅ REUSE |
| `CardAssignment` model (with history)  | ✅ REUSE |
| `CardStatus` enum (after F-001 fix)    | ✅ REUSE |
| `requireAdmin` middleware (from F-002) | ✅ REUSE |

---

## Gaps & Missing Items

- ❌ No admin card list/search endpoint
- ❌ No card detail endpoint
- ❌ No lifecycle transition endpoints
- ❌ No replace flow implementation
- ❌ No admin UI for card management
- ❌ No validation of allowed lifecycle transitions

---

## Business Rules

### Lifecycle Transition Rules

| From                        | To                                | Who                          | Allowed?                             |
| --------------------------- | --------------------------------- | ---------------------------- | ------------------------------------ |
| `AVAILABLE`                 | `ASSIGNED`                        | System (on claim)            | Yes — via F-007                      |
| `ASSIGNED`                  | `ACTIVE`                          | System (on first publish)    | Yes — via F-008                      |
| `ACTIVE`                    | `PAUSED`                          | Customer                     | Yes — F-015                          |
| `PAUSED`                    | `ACTIVE`                          | Customer                     | Yes — F-015                          |
| `ACTIVE`                    | `SUSPENDED`                       | Admin only                   | Yes                                  |
| `PAUSED`                    | `SUSPENDED`                       | Admin only                   | Yes                                  |
| `ASSIGNED`                  | `SUSPENDED`                       | Admin only                   | Yes                                  |
| `SUSPENDED`                 | `ACTIVE`                          | Admin only                   | Yes (reinstate)                      |
| `SUSPENDED`                 | `PAUSED`                          | Admin only                   | No — reinstate always goes to ACTIVE |
| Any → `DEACTIVATED`         | Admin only                        | Yes (permanent)              |
| `DEACTIVATED` → any         | —                                 | No — permanent, irreversible |
| `AVAILABLE` → `DEACTIVATED` | Admin (batch invalidation, F-005) | Yes                          |

### Replace Flow

A customer loses their card and requests replacement (or admin initiates). The flow:

1. Find the customer's currently assigned card
2. Verify a replacement `AVAILABLE` card exists for the same card type
3. In a single transaction:
   - Set old card `status = DEACTIVATED`
   - Set old `CardAssignment.status = "INACTIVE"`, `unassignedAt = now()`
   - Create new `CardAssignment` linking the replacement card to the same user
   - Set replacement card `status = ASSIGNED` (or `ACTIVE` if profile was published)
   - Profile is untouched — the customer keeps all their data
4. Return: old card number deactivated, new card number assigned

### Admin `assign` endpoint

Allows admin to manually assign an `AVAILABLE` card to an existing user (e.g. if the activation flow fails, or for bulk employee card assignment). This is distinct from customer self-service claiming (F-007).

---

## Backend Requirements

### Files to MODIFY/CREATE

| File                          | Purpose                                                           |
| ----------------------------- | ----------------------------------------------------------------- |
| `src/routes/admin/cards.ts`   | Add lifecycle endpoints (extends F-005 file)                      |
| `src/services/cardService.ts` | Add lifecycle transition logic, replace flow (extends F-005 file) |

### API Endpoints

#### `GET /admin/cards`

- **Auth required:** Admin
- **Query params:** `?cardTypeId=`, `?status=`, `?batchId=`, `?search=` (searches cardNumber, customer phone/name), `?page=`, `?limit=`
- **Response:** `200 { cards: [...], total, page, limit }`
- Each card item includes: id, cardNumber, publicToken, status, cardType name, assigned user (name/phone if any), createdAt

#### `GET /admin/cards/:id`

- **Auth required:** Admin
- **Response:** `200 { card: NFCCard & { cardType, assignments: [...with user data], events: [...recent 20] } }`

#### `POST /admin/cards/:id/assign`

- **Auth required:** Admin
- **Input:** `{ userId: string }`
- **Validation:** card must be `AVAILABLE`; user must exist; user must not already have an active card of the same type
- **Logic:** run transactional claim (same as F-007 but admin-initiated) → `AVAILABLE → ASSIGNED`

#### `POST /admin/cards/:id/activate`

- **Auth required:** Admin
- **Validation:** card must be `ASSIGNED`
- **Logic:** `ASSIGNED → ACTIVE`
- **Use case:** admin manually activates a card bypassing the profile publish step (for demo or support scenarios)

#### `POST /admin/cards/:id/suspend`

- **Auth required:** Admin
- **Input:** `{ reason?: string }`
- **Validation:** card must be `ACTIVE`, `ASSIGNED`, or `PAUSED`
- **Logic:** `{ACTIVE|ASSIGNED|PAUSED} → SUSPENDED`; log reason in metadata
- **Side effect:** public profile immediately returns "temporarily unavailable" (enforced at render time in F-010)

#### `POST /admin/cards/:id/unsuspend`

- **Auth required:** Admin
- **Validation:** card must be `SUSPENDED`
- **Logic:** `SUSPENDED → ACTIVE`

#### `POST /admin/cards/:id/deactivate`

- **Auth required:** Admin
- **Input:** `{ reason?: string }`
- **Validation:** card must not already be `DEACTIVATED`
- **Logic:** `{any} → DEACTIVATED` (permanent, no reversal)
- **Side effect:** public profile returns "no longer active"

#### `POST /admin/cards/:id/replace`

- **Auth required:** Admin
- **Input:** `{ replacementCardId: string }` — admin selects the AVAILABLE replacement card
- **Validation:** old card must be `ASSIGNED`, `ACTIVE`, `PAUSED`, or `SUSPENDED`; replacement card must be `AVAILABLE` and same `cardTypeId`
- **Logic:** atomic replace flow (see Business Rules above)
- **Response:** `200 { oldCard, newCard, assignment }`

---

## Frontend Requirements

### Files to CREATE

| File                                            | Purpose                                                                      |
| ----------------------------------------------- | ---------------------------------------------------------------------------- |
| `src/admin/CardManagement/CardList.tsx`         | Searchable/filterable card inventory table                                   |
| `src/admin/CardManagement/CardDetail.tsx`       | Single card detail view with assignment history and lifecycle action buttons |
| `src/admin/CardManagement/ReplaceCardModal.tsx` | Modal to select replacement card and confirm replace flow                    |
| `src/admin/CardManagement/SuspendModal.tsx`     | Modal to enter reason and confirm suspend                                    |
| `src/admin/CardManagement/DeactivateModal.tsx`  | Modal to confirm permanent deactivation                                      |

---

## Validation & Error Cases

| Case                                      | Behavior                                                                |
| ----------------------------------------- | ----------------------------------------------------------------------- |
| Invalid lifecycle transition              | `409 { error: { code: "INVALID_TRANSITION", from: "...", to: "..." } }` |
| Card not found                            | `404 { error: { code: "CARD_NOT_FOUND" } }`                             |
| Replacement card not AVAILABLE            | `409 { error: { code: "REPLACEMENT_NOT_AVAILABLE" } }`                  |
| Replacement card wrong type               | `409 { error: { code: "CARD_TYPE_MISMATCH" } }`                         |
| User not found (assign)                   | `404 { error: { code: "USER_NOT_FOUND" } }`                             |
| User already has active card of same type | `409 { error: { code: "USER_ALREADY_HAS_CARD" } }`                      |
| Attempting to reverse DEACTIVATED         | `409 { error: { code: "CARD_DEACTIVATED_PERMANENT" } }`                 |

---

## Acceptance Criteria

- [ ] `GET /admin/cards` returns paginated list with search and filter support
- [ ] `GET /admin/cards/:id` returns card with full assignment history
- [ ] `POST /admin/cards/:id/suspend` sets status to SUSPENDED; public profile shows unavailable
- [ ] `POST /admin/cards/:id/unsuspend` returns card to ACTIVE
- [ ] `POST /admin/cards/:id/deactivate` is permanent; no reverse endpoint exists
- [ ] `POST /admin/cards/:id/replace` deactivates old card and assigns replacement in one transaction
- [ ] Customer's Profile is unchanged after replacement (same data, same template, new card)
- [ ] Invalid lifecycle transitions return 409 with clear error code
- [ ] All admin card endpoints require admin auth (401/403 without valid admin token)
- [ ] Admin card list UI shows correct status badges and action buttons per card state

---

## Implementation Tasks

- [ ] **T-006-1:** Add `GET /admin/cards` with pagination, search, filter (in `src/routes/admin/cards.ts`)
- [ ] **T-006-2:** Add `GET /admin/cards/:id` with full history
- [ ] **T-006-3:** Implement lifecycle transition validator in `src/services/cardService.ts`
- [ ] **T-006-4:** Add `POST /admin/cards/:id/suspend` + `unsuspend`
- [ ] **T-006-5:** Add `POST /admin/cards/:id/deactivate`
- [ ] **T-006-6:** Add `POST /admin/cards/:id/activate`
- [ ] **T-006-7:** Implement replace flow in `cardService.ts`
- [ ] **T-006-8:** Add `POST /admin/cards/:id/replace` endpoint
- [ ] **T-006-9:** Add `POST /admin/cards/:id/assign` endpoint
- [ ] **T-006-10:** Create `src/admin/CardManagement/CardList.tsx`
- [ ] **T-006-11:** Create `src/admin/CardManagement/CardDetail.tsx`
- [ ] **T-006-12:** Create modal components (Replace, Suspend, Deactivate)
- [ ] **T-006-13:** Update `.agents/features.md` on completion
