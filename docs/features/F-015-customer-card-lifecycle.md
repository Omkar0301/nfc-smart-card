# F-015 — Customer Card Lifecycle Controls

**ID:** F-015  
**Priority:** 🟡 High  
**Phase:** 8  
**Status:** ✅ COMPLETE  
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

## What Is Implemented

| Item                                                   | Status                                             |
| ------------------------------------------------------ | -------------------------------------------------- |
| `NFCCard.status` with `PAUSED` value (after F-001 fix) | ✅ COMPLETE                                        |
| `Profile` linked to `NFCCard` via `CardAssignment`     | ✅ COMPLETE                                        |
| `requireAuth` middleware (F-002)                       | ✅ COMPLETE                                        |
| Cache invalidation pattern (skills.md)                 | ✅ COMPLETE (revalidateProfileTag on pause/resume) |
| `CardReplacementRequest` Prisma model & migration      | ✅ COMPLETE                                        |
| Pause, resume, report lost, replacement requests APIs  | ✅ COMPLETE                                        |
| Customer Portal My Card UI with pause/resume & report  | ✅ COMPLETE                                        |

---

## Business Rules

### Pause / Resume

1. **Only the card owner can pause their own card.** (rules.md #15, #11) Verified server-side via JWT. Never trust a card ID passed from client.
2. **Pause is instant and reversible** — no approval, no support ticket.
3. **Allowed source states for pause:** `ACTIVE` only. A card that is `ASSIGNED` (profile not yet published) cannot be paused — there is no public page to hide.
4. **Allowed source states for resume:** `PAUSED` only.
5. **A `SUSPENDED` card cannot be paused or resumed by the customer** — `SUSPENDED` is admin-controlled. The customer sees "Your card has been suspended by the platform" and cannot take lifecycle actions.
6. **After pause:** public profile immediately returns "currently unavailable" message (enforced at SSR render time in F-010).
7. **Cache invalidation is mandatory** on pause and resume — the CDN must not serve the old cached public page.
8. **`POST /profile/pause` and `POST /profile/resume`** operate on the authenticated user's currently active card.

### Report Lost / Request Replacement

9. **Report lost** — customer self-service. Sets card to `PAUSED` and creates a `CardReplacementRequest` record for admin processing.
10. **Request replacement** — creates a `CardReplacementRequest`; admin reviews and processes via `POST /admin/cards/:id/replace` (F-006).
11. **Profile data is never lost during replacement** — customer's profile and visibility settings carry over to the new card.
12. **A replacement request does not auto-deactivate the current card** — customer's card stays paused until the replacement is processed.

---

## Database Requirements

### `CardReplacementRequest` table (Applied in migration `20261008060850_add_card_replacement_request`)

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

---

## Acceptance Criteria

- [x] `POST /profile/pause` changes ACTIVE card to PAUSED
- [x] `POST /profile/pause` triggers cache invalidation (CDN no longer serves old public page)
- [x] After pause, `GET /p/:type/:token` returns "currently unavailable" message
- [x] `POST /profile/resume` changes PAUSED card to ACTIVE
- [x] After resume, public profile is immediately visible again
- [x] `POST /profile/pause` returns 409 for SUSPENDED card (cannot be paused by customer)
- [x] `POST /cards/report-lost` pauses the card AND creates a replacement request in one operation
- [x] Admin can view PENDING replacement requests at `GET /admin/replacement-requests`
- [x] Customer can view their own replacement request status
- [x] Customer cannot pause/resume another user's card (ownership enforced server-side)
- [x] Pause/Resume button in UI reflects current card status correctly
- [x] Report Lost flow is multi-step with reason selection and action confirmation

---

## Implementation Tasks

- [x] **T-015-1:** Add `CardReplacementRequest` model to `schema.prisma`; run migration
- [x] **T-015-2:** Create `src/services/cardReplacement.service.ts` & `profile.service.ts` lifecycle logic with cache invalidation
- [x] **T-015-3:** Add `POST /profile/pause` and `POST /profile/resume` to `src/routes/profile.routes.ts`
- [x] **T-015-4:** Add `POST /cards/report-lost` and `POST /cards/request-replacement` to `src/routes/cards.routes.ts`
- [x] **T-015-5:** Add `GET /cards/replacement-requests` (customer) endpoint
- [x] **T-015-6:** Add `GET /admin/replacement-requests` and `PUT /admin/replacement-requests/:id` endpoints
- [x] **T-015-7:** Create `src/portal/CardManagement/PauseResumeButton.tsx`
- [x] **T-015-8:** Create `src/portal/CardManagement/ReportLostModal.tsx`
- [x] **T-015-9:** Create replacement flow in My Card portal screen
- [x] **T-015-10:** Create replacement request tracking in My Card portal screen
- [x] **T-015-11:** Add lifecycle API methods to `src/shared/api/cards.ts` & `src/shared/api/profile.ts`
- [x] **T-015-12:** Integrate `PauseResumeButton` and `ReportLostModal` into `app/portal/my-card/page.tsx`
- [x] **T-015-13:** Update `.agents/features.md` on completion
