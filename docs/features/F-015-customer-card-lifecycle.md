# F-015 — Customer Card Lifecycle Controls

**ID:** F-015  
**Priority:** 🟡 High  
**Phase:** 8  
**Status:** ❌ NOT STARTED  
**Depends on:** F-008 (profile + card linkage), F-002 (auth)  
**Required by:** F-011 (My Card screen in customer portal)

---

## Purpose

Give customers direct, instant control over their card's lifecycle state — specifically the ability to pause and resume their card, report it as lost, and request a replacement — without admin involvement for the common cases. This is a safety and trust feature: a customer who loses a card can kill its public page in one tap, before a support ticket could ever be processed.

## User Story

**Customer (lost card scenario):**  
_As a customer who just lost my NFC card, I want to pause my card immediately from my phone — so that my public profile is taken offline instantly and nobody can see my contact info while my card is missing._

_As a customer who found my card again, I want to resume it just as instantly — so my profile is back online without any admin action._

**Customer (permanent loss):**  
_As a customer whose card is permanently lost or damaged, I want to report it lost and request a replacement — so that my profile data is preserved on the replacement card and I can keep using the platform._

---

## PRD Requirements Covered

- **§8** — `PAUSED` state: customer-initiated, instantly reversible; `PAUSED` is distinct from admin-controlled `SUSPENDED` (rules.md #15)
- **§17** — My NFC Card screen: Pause card, Report lost, Request replacement
- **§22** — `POST /profile/pause`, `POST /profile/resume`
- **§26** — Success criterion: customer can pause a lost card instantly without admin involvement
- **skills.md** — Cache Invalidation on Profile Change (pause/resume must invalidate the public page cache)

---

## What Is Already Implemented

| Item                                                   | Status                                             |
| ------------------------------------------------------ | -------------------------------------------------- |
| `NFCCard.status` with `PAUSED` value (after F-001 fix) | ✅ REUSE                                           |
| `Profile` linked to `NFCCard` via `CardAssignment`     | ✅ REUSE                                           |
| `requireAuth` middleware (F-002)                       | ✅ REUSE                                           |
| Cache invalidation pattern (skills.md)                 | ✅ REUSE (pattern documented, implement alongside) |

---

## Gaps & Missing Items

- ❌ No pause/resume endpoints
- ❌ No customer-facing report-lost flow
- ❌ No replacement request flow
- ❌ No My Card UI (that's in F-011, but this feature provides the backend + actions)

---

## Business Rules

### Pause / Resume

1. **Only the card owner can pause their own card.** (rules.md #15, #11) Verified server-side via JWT. Never trust a card ID passed from client.
2. **Pause is instant and reversible** — no approval, no support ticket.
3. **Allowed source states for pause:** `ACTIVE` only. A card that is `ASSIGNED` (profile not yet published) cannot be paused — there is no public page to hide.
4. **Allowed source states for resume:** `PAUSED` only.
5. **A `SUSPENDED` card cannot be paused or resumed by the customer** — `SUSPENDED` is admin-controlled. The customer sees "Your card has been suspended by the platform" and cannot take lifecycle actions.
6. **After pause:** public profile immediately returns "currently unavailable" message (enforced at SSR render time in F-010 — no code change needed there; the status check handles it).
7. **Cache invalidation is mandatory** on pause and resume — the CDN must not serve the old cached public page (skills.md).
8. **`POST /profile/pause` and `POST /profile/resume`** operate on the authenticated user's currently active card — no card ID in the URL. The server resolves which card belongs to this user.

### Report Lost / Request Replacement

9. **Report lost** — customer self-service. Sets a flag indicating the card is physically lost. The platform can then either:
   - Auto-set `PAUSED` (if not already), prompting admin to follow up with replacement
   - Or: customer chooses to pause AND report in one action
   - **MVP behavior:** "Report lost" = pause the card + create a support record (a `CardReplacement` request row) for admin to process.
10. **Request replacement** — not fully automated in MVP. Creates a `CardReplacement` request; admin reviews and manually uses `POST /admin/cards/:id/replace` (F-006). The customer is notified when complete.
11. **Profile data is never lost during replacement** — the customer's profile, visibility settings, and template choice carry over to the new card automatically (handled in F-006's replace flow).
12. **A replacement request does not auto-deactivate the current card** — only admin deactivation (F-006) is permanent. Customer's card stays paused until the replacement is processed.

---

## Database Requirements

### CREATE — `CardReplacementRequest` table

```prisma
model CardReplacementRequest {
  id          String    @id @default(cuid())
  cardId      String
  card        NFCCard   @relation(fields: [cardId], references: [id])
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  reason      String?   // "LOST" | "DAMAGED" | "STOLEN" | "OTHER"
  notes       String?   // customer's description
  status      String    @default("PENDING")  // PENDING | IN_PROGRESS | COMPLETED | CANCELLED
  resolvedAt  DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([userId])
  @@index([cardId])
  @@index([status])
}
```

> `User` and `NFCCard` need back-relations added.

---

## Backend Requirements

### Files to CREATE/MODIFY

| File                               | Purpose                                                          |
| ---------------------------------- | ---------------------------------------------------------------- |
| `src/routes/profile.ts`            | Add pause/resume endpoints (extends F-008 file)                  |
| `src/services/lifecycleService.ts` | Pause/resume logic, report-lost logic, replacement request logic |
| `src/routes/cards.ts`              | Add customer-facing replacement request endpoint                 |

### API Endpoints

#### `POST /profile/pause`

- **Auth required:** Yes (Customer)
- **Logic:**
  1. Find authenticated user's active `CardAssignment` → get `cardId`
  2. Verify `NFCCard.status === 'ACTIVE'`
  3. Verify `NFCCard` owner is the authenticated user
  4. Update `NFCCard.status = 'PAUSED'`
  5. Trigger cache invalidation for `publicToken`
- **Response:** `200 { card: { status: "PAUSED" } }`
- **Error cases:** card not ACTIVE → `409`; card SUSPENDED → `409 CARD_SUSPENDED`

#### `POST /profile/resume`

- **Auth required:** Yes (Customer)
- **Logic:**
  1. Find authenticated user's active `CardAssignment` → get `cardId`
  2. Verify `NFCCard.status === 'PAUSED'`
  3. Update `NFCCard.status = 'ACTIVE'`
  4. Trigger cache invalidation for `publicToken`
- **Response:** `200 { card: { status: "ACTIVE" } }`

#### `POST /cards/report-lost`

- **Auth required:** Yes (Customer)
- **Input:** `{ reason?: "LOST" | "DAMAGED" | "STOLEN" | "OTHER", notes?: string }`
- **Logic:**
  1. Find user's active card
  2. If status is `ACTIVE`, pause it first (same as `POST /profile/pause`)
  3. Create `CardReplacementRequest` with `reason`, `notes`, `status = "PENDING"`
- **Response:** `201 { request: { id, status: "PENDING" }, card: { status: "PAUSED" } }`

#### `POST /cards/request-replacement`

- **Auth required:** Yes (Customer)
- **Input:** `{ reason?: string, notes?: string }`
- **Logic:** create `CardReplacementRequest` with `status = "PENDING"` (card is not auto-paused by this endpoint — it's a request, not an immediate action; customer can separately pause if they want)
- **Response:** `201 { request: { id, status: "PENDING" }, message: "Replacement request submitted. You'll be notified when processed." }`

#### `GET /cards/replacement-requests`

- **Auth required:** Yes (Customer)
- **Logic:** return all `CardReplacementRequest` rows for the authenticated user
- **Response:** `200 { requests: [...] }`

#### `GET /admin/replacement-requests`

- **Auth required:** Admin
- **Query params:** `?status=PENDING|IN_PROGRESS|COMPLETED`, `?page=`, `?limit=`
- **Response:** `200 { requests: [...with user and card info] }`

#### `PUT /admin/replacement-requests/:id`

- **Auth required:** Admin
- **Input:** `{ status: "IN_PROGRESS" | "COMPLETED" | "CANCELLED" }`
- **Logic:** update request status; if COMPLETED, the actual card swap was done via F-006's replace endpoint
- **Response:** `200 { request }`

---

## Frontend Requirements

### Files to CREATE

| File                                                   | Purpose                                                                                                |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `src/portal/CardManagement/PauseResumeButton.tsx`      | Single toggle button: "Pause Card" (if ACTIVE) or "Resume Card" (if PAUSED); shows card status context |
| `src/portal/CardManagement/ReportLostFlow.tsx`         | Multi-step flow: choose reason → confirm pause → confirmation screen                                   |
| `src/portal/CardManagement/RequestReplacementFlow.tsx` | Flow: describe situation → submit → confirmation                                                       |
| `src/portal/CardManagement/ReplacementStatus.tsx`      | Shows open replacement request status with timeline                                                    |
| `src/shared/api/lifecycle.ts`                          | `pauseCard()`, `resumeCard()`, `reportLost()`, `requestReplacement()`, `getReplacementRequests()`      |

### Pause Button UX Rules

- If `card.status === 'ACTIVE'` → show **"Pause Card"** (orange/amber color) with warning: "Your public profile will be hidden immediately"
- If `card.status === 'PAUSED'` → show **"Resume Card"** (green color) with message: "Your profile will go live immediately"
- If `card.status === 'SUSPENDED'` → show **"Card Suspended"** (red, disabled) with message: "Contact support"
- Action is confirmed with a brief optimistic update + toast notification

### Report Lost UX

```
Step 1: "What happened to your card?"
  ○ I lost it
  ○ It was damaged
  ○ It was stolen
  ○ Other (notes field)

Step 2: Confirm action
  "This will immediately hide your public profile.
   You can resume it if you find your card.
   Alternatively, we can send you a replacement card."
  [Just Pause] [Pause + Request Replacement]

Step 3: Confirmation
  "Your card has been paused. Your profile is now hidden."
  "We've received your replacement request and will be in touch."
```

---

## Validation & Error Cases

| Case                                               | Behavior                                                                                  |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Pause while card is `ASSIGNED` (not yet published) | `409 { error: { code: "CARD_NOT_ACTIVE" } }`                                              |
| Pause while card is `SUSPENDED`                    | `409 { error: { code: "CARD_SUSPENDED", message: "Only admin can clear a suspension" } }` |
| Resume while card is `ACTIVE`                      | `409 { error: { code: "CARD_NOT_PAUSED" } }`                                              |
| Pause/resume for another user's card               | `403 { error: { code: "FORBIDDEN" } }` (ownership check)                                  |
| Duplicate replacement request (already PENDING)    | `409 { error: { code: "REQUEST_ALREADY_PENDING" } }`                                      |

---

## Acceptance Criteria

- [ ] `POST /profile/pause` changes ACTIVE card to PAUSED
- [ ] `POST /profile/pause` triggers cache invalidation (CDN no longer serves old public page)
- [ ] After pause, `GET /p/:type/:token` returns "currently unavailable" message
- [ ] `POST /profile/resume` changes PAUSED card to ACTIVE
- [ ] After resume, public profile is immediately visible again
- [ ] `POST /profile/pause` returns 409 for SUSPENDED card (cannot be paused by customer)
- [ ] `POST /cards/report-lost` pauses the card AND creates a replacement request in one operation
- [ ] Admin can view PENDING replacement requests at `GET /admin/replacement-requests`
- [ ] Customer can view their own replacement request status
- [ ] Customer cannot pause/resume another user's card (ownership enforced server-side)
- [ ] Pause/Resume button in UI reflects current card status correctly
- [ ] Report Lost flow is multi-step with reason selection and action confirmation

---

## Implementation Tasks

- [ ] **T-015-1:** Add `CardReplacementRequest` model to `schema.prisma`; run migration
- [ ] **T-015-2:** Create `src/services/lifecycleService.ts` — pause/resume/report-lost logic with cache invalidation
- [ ] **T-015-3:** Add `POST /profile/pause` and `POST /profile/resume` to `src/routes/profile.ts`
- [ ] **T-015-4:** Add `POST /cards/report-lost` and `POST /cards/request-replacement` to `src/routes/cards.ts`
- [ ] **T-015-5:** Add `GET /cards/replacement-requests` (customer) endpoint
- [ ] **T-015-6:** Add `GET /admin/replacement-requests` and `PUT /admin/replacement-requests/:id` endpoints
- [ ] **T-015-7:** Create `src/portal/CardManagement/PauseResumeButton.tsx`
- [ ] **T-015-8:** Create `src/portal/CardManagement/ReportLostFlow.tsx`
- [ ] **T-015-9:** Create `src/portal/CardManagement/RequestReplacementFlow.tsx`
- [ ] **T-015-10:** Create `src/portal/CardManagement/ReplacementStatus.tsx`
- [ ] **T-015-11:** Create `src/shared/api/lifecycle.ts`
- [ ] **T-015-12:** Integrate `PauseResumeButton`, `ReportLostFlow`, and `ReplacementStatus` into `MyCard.tsx` (F-011)
- [ ] **T-015-13:** Update `.agents/features.md` on completion
