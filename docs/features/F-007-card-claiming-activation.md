# F-007 — Card Claiming & Activation

**ID:** F-007  
**Priority:** 🔴 Critical  
**Phase:** 4  
**Status:** ❌ NOT STARTED  
**Depends on:** F-005 (cards must exist), F-002 (auth)  
**Required by:** F-008 (profile), F-010 (public page), F-015 (customer lifecycle)

---

## Purpose

Implement the card claiming flow — the entry point for every customer into the platform. When a physical NFC card is tapped, the URL is opened, the backend resolves the token, checks card status, and either renders the public profile (existing card) or routes the visitor to the activation flow (unclaimed card). Claiming must be transactional and race-condition-safe.

## User Story

**New customer (first tap):**  
_As a customer who just received an NFC card and tapped it for the first time, I want to be prompted to verify my phone number and claim the card — so I can set up my profile and start using my card._

**Returning visitor (public tap):**  
_As a visitor tapping an existing card, I want to immediately see the owner's profile — without any login prompt or delay._

**System:**  
_As the platform, I must ensure that a card can only be claimed by one person (race-condition-safe) and that an authenticated customer is always required before a card changes hands._

---

## PRD Requirements Covered

- **§11** — Card claiming: check status = AVAILABLE, authenticate, transactional row-lock, create assignment, initialize profile, AVAILABLE → ASSIGNED
- **§22** — `GET /cards/:token`, `POST /cards/:token/claim`
- **§23** — Error scenarios for invalid/unavailable/paused/suspended/deactivated tokens
- **§3** — Core product concept: URL → backend resolves token → render profile (or activation)
- **§24, #3, #4** — Transactional claim; only one claim per AVAILABLE card
- **skills.md** — Transactional Card Claim pattern
- **rules.md #9** — Row lock inside transaction, re-verify status inside the lock

---

## What Is Already Implemented

| Item                                  | Status   |
| ------------------------------------- | -------- |
| `NFCCard` model with `publicToken`    | ✅ REUSE |
| `CardAssignment` model                | ✅ REUSE |
| `CardStatus` enum (after F-001 fix)   | ✅ REUSE |
| `requireAuth` middleware (from F-002) | ✅ REUSE |

---

## Gaps & Missing Items

- ❌ No token lookup endpoint
- ❌ No claim endpoint
- ❌ No transactional claim logic
- ❌ No profile initialization on claim
- ❌ No routing logic in frontend (resolve token → decide: show profile vs. show activation flow)
- ❌ No activation UI

---

## Business Rules

1. **Unauthenticated visitors can never claim a card.** (PRD §10.1) `POST /cards/:token/claim` requires a valid JWT.
2. **The claim operation is transactional** — uses a Prisma interactive transaction with a row lock (`SELECT ... FOR UPDATE` via raw query or Prisma's `$transaction`) that re-verifies `status = AVAILABLE` _inside_ the lock, not before.
3. **Two simultaneous claims of the same card** — only one succeeds. The second attempt fails with `409 CARD_ALREADY_CLAIMED` after the first transaction commits and the status is no longer `AVAILABLE`.
4. **One user, one active card per type** — a user cannot claim a second Business card if they already have an active/assigned Business card. Check before claiming.
5. **On claim success:** `NFCCard.status` → `ASSIGNED`; a new `CardAssignment` row is created; an empty `Profile` is initialized (status = `"draft"`, `data = {}`, `fieldVisibility = {}` — field defaults are applied in F-008 when the customer first opens the editor).
6. **`GET /cards/:token`** is public (no auth required) and returns just enough information for the frontend to decide what to render — it does NOT return profile data (profile data is served from the SSR route in F-010 or from authenticated profile endpoints in F-008).
7. **Card status response matrix** (PRD §23):

| Card Status     | `GET /cards/:token` Response                                                                     |
| --------------- | ------------------------------------------------------------------------------------------------ |
| Token not found | 404 `CARD_NOT_FOUND`                                                                             |
| `AVAILABLE`     | 200 `{ status: "AVAILABLE", cardType: { slug, name } }` — triggers activation UI                 |
| `ASSIGNED`      | 200 `{ status: "ASSIGNED" }` — profile not yet published; route to "coming soon" or setup screen |
| `ACTIVE`        | 200 `{ status: "ACTIVE", publicToken }` — redirect to `/p/:type/:token`                          |
| `PAUSED`        | 200 `{ status: "PAUSED" }` — "This card is currently unavailable"                                |
| `SUSPENDED`     | 200 `{ status: "SUSPENDED" }` — "This card is temporarily unavailable"                           |
| `DEACTIVATED`   | 200 `{ status: "DEACTIVATED" }` — "This card is no longer active"                                |

---

## Backend Requirements

### Files to CREATE

| File                           | Purpose                                          |
| ------------------------------ | ------------------------------------------------ |
| `src/routes/cards.ts`          | Public card token routes (lookup + claim)        |
| `src/services/claimService.ts` | Transactional claim logic, race-condition safety |

### API Endpoints

#### `GET /cards/:token`

- **Auth required:** No (public)
- **Logic:** find `NFCCard` by `publicToken` → return status + cardType info based on response matrix above
- **Does NOT return:** profile data, customer PII, full card details
- **Response example (AVAILABLE):**
  ```json
  {
    "status": "AVAILABLE",
    "cardType": { "slug": "business", "name": "Business Card" }
  }
  ```

#### `POST /cards/:token/claim`

- **Auth required:** Yes (Bearer token — customer)
- **Input:** None (token is in URL, user is from JWT)
- **Logic:**
  1. Find `NFCCard` by `publicToken` (outside transaction — quick existence check)
  2. If not found: 404
  3. If status ≠ `AVAILABLE`: 409 `CARD_NOT_AVAILABLE`
  4. Check user doesn't already own an active card of same type: 409 `USER_ALREADY_HAS_CARD`
  5. Begin Prisma interactive transaction:
     a. `SELECT ... FOR UPDATE` on the NFCCard row
     b. Re-verify `status = AVAILABLE` (inside the lock)
     c. If no longer AVAILABLE: rollback → 409 `CARD_ALREADY_CLAIMED`
     d. Update `NFCCard.status = ASSIGNED`
     e. Create `CardAssignment { cardId, userId, status: "ACTIVE" }`
     f. Create `Profile { userId, cardTypeId, data: {}, fieldVisibility: {}, status: "draft" }`
     g. Commit
  6. Return success with the newly created profile and card info
- **Response:** `201 { card: { id, cardNumber, publicToken, status }, profile: { id, cardTypeId, status }, assignment: { id } }`

---

## Frontend Requirements

### URL Routing for NFC Taps

When the physical card is tapped, the browser opens:

```
https://yourdomain.com/p/{cardType.slug}/{publicToken}
```

This is the SSR route (F-010). But the activation flow is handled differently — the frontend SPA must also handle a simpler resolution path. Consider:

```
/activate/:token  → calls GET /cards/:token → decides what to show
```

Or the SSR route itself handles all states (AVAILABLE = redirect to /activate/:token, ACTIVE = render profile). **Recommended:** SSR route handles ACTIVE/PAUSED/SUSPENDED/DEACTIVATED states server-side; AVAILABLE token redirects to `/activate/:token` in the SPA.

### Files to CREATE

| File                                      | Purpose                                                                                                  |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `src/portal/Activate/ActivatePage.tsx`    | Container: reads token from URL → calls `GET /cards/:token` → routes to correct sub-screen               |
| `src/portal/Activate/UnavailableCard.tsx` | Status-specific message for PAUSED / SUSPENDED / DEACTIVATED                                             |
| `src/portal/Activate/ClaimCard.tsx`       | Shows card type info, triggers OTP flow (F-002 OtpFlow component), then calls `POST /cards/:token/claim` |
| `src/portal/Activate/ClaimSuccess.tsx`    | Post-claim confirmation: "Card claimed! Set up your profile" CTA → navigates to ProfileEditor (F-008)    |
| `src/shared/api/cards.ts`                 | Add `getCardByToken()`, `claimCard()` calls                                                              |

---

## Validation & Error Cases

| Case                                      | Behavior                                                          |
| ----------------------------------------- | ----------------------------------------------------------------- |
| Token not in DB                           | `404 { error: { code: "CARD_NOT_FOUND" } }`                       |
| Card not AVAILABLE (claim attempt)        | `409 { error: { code: "CARD_NOT_AVAILABLE", status: "ACTIVE" } }` |
| Race condition — card claimed mid-request | `409 { error: { code: "CARD_ALREADY_CLAIMED" } }`                 |
| User already owns card of same type       | `409 { error: { code: "USER_ALREADY_HAS_CARD" } }`                |
| Unauthenticated claim attempt             | `401 { error: { code: "UNAUTHORIZED" } }`                         |
| Valid claim                               | `201` with card, profile, assignment data                         |

---

## Acceptance Criteria

- [ ] `GET /cards/:token` returns correct `status` and `cardType` for each card state
- [ ] `GET /cards/:token` returns 404 for unknown token
- [ ] `GET /cards/:token` does NOT require authentication
- [ ] `POST /cards/:token/claim` requires a valid JWT (401 without it)
- [ ] Successful claim changes `NFCCard.status` from `AVAILABLE` to `ASSIGNED`
- [ ] Successful claim creates a `CardAssignment` row
- [ ] Successful claim creates a `Profile` row with `status = "draft"`, `data = {}`
- [ ] Simultaneous claim of same card by two users: exactly one succeeds, the other gets 409
- [ ] A user who already has an active Business card cannot claim another Business card
- [ ] Activation UI shows correct message for PAUSED / SUSPENDED / DEACTIVATED cards
- [ ] After claim, user is navigated to profile setup (F-008)

---

## Implementation Tasks

- [ ] **T-007-1:** Create `src/services/claimService.ts` with transactional claim using row lock
- [ ] **T-007-2:** Create `src/routes/cards.ts` with `GET /cards/:token` and `POST /cards/:token/claim`
- [ ] **T-007-3:** Mount card routes in `app.ts` (public, no global auth middleware)
- [ ] **T-007-4:** Create `src/portal/Activate/ActivatePage.tsx`
- [ ] **T-007-5:** Create `src/portal/Activate/ClaimCard.tsx` — integrates OtpFlow from F-002
- [ ] **T-007-6:** Create `src/portal/Activate/UnavailableCard.tsx`
- [ ] **T-007-7:** Create `src/portal/Activate/ClaimSuccess.tsx`
- [ ] **T-007-8:** Add `getCardByToken()` and `claimCard()` to `src/shared/api/cards.ts`
- [ ] **T-007-9:** Set up frontend routing: `/activate/:token` → ActivatePage
- [ ] **T-007-10:** Update `.agents/features.md` on completion
