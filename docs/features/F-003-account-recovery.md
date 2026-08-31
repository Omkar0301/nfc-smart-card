# F-003 — Account Recovery

**ID:** F-003  
**Priority:** 🟡 High  
**Phase:** 1  
**Status:** ❌ NOT STARTED  
**Depends on:** F-002 (auth system must exist)  
**Required by:** F-011 (customer portal settings)

---

## Purpose

Implement a recovery path for customers who have lost access to their registered OTP phone number. The platform's core promise — "change your data anytime" — breaks if a customer is permanently locked out after a phone number change. This feature provides a designed, rate-limited secondary path back into an account, without creating a new customer record or touching the physical card.

## User Story

_As a customer who has changed my phone number, I want to recover access to my account using my registered email address — so I can resume editing my profile and managing my card without losing my history, assignment, or data._

_As an admin, I want account recovery attempts to be logged and rate-limited — so that recovery cannot be exploited as an unauthenticated path into someone else's account._

---

## PRD Requirements Covered

- **§10.2** — Account recovery when OTP phone number is lost/changed
- **§22** — `POST /auth/recover`
- **§24, #13** — Recovery flow must be rate-limited and auditable; treated as a second auth path
- **§26** — Success criterion: customer can recover without permanent lockout

---

## What Is Already Implemented

| Item                                                | Status                         |
| --------------------------------------------------- | ------------------------------ |
| `User.email` optional field (intended for recovery) | ✅ REUSE                       |
| `requireAuth` middleware (from F-002)               | ✅ REUSE (once F-002 is built) |

---

## Gaps & Missing Items

- ❌ No recovery endpoint
- ❌ No recovery email dispatch
- ❌ No recovery token model
- ❌ No rate limiting on recovery flow
- ❌ No UI for recovery initiation or email entry in profile settings

---

## Business Rules

1. **Recovery requires a pre-registered secondary email.** If the customer never added an email, the only path is admin-assisted identity check (manual, MVP-acceptable).
2. **Recovery does NOT create a new User record.** It re-links the session to the existing account.
3. **Recovery does NOT touch the physical card or the NFCCard record.**
4. **Recovery does NOT touch Profile data or CardAssignment.**
5. **Recovery is rate-limited** — max 3 recovery attempts per email per hour, plus global lockout after repeated failures (see F-017 for full rate-limit config; basic limits must be in this feature from day 1).
6. **Recovery tokens are single-use and short-lived** (1 hour).
7. **A successful recovery allows the customer to update their registered phone number** (so they can use OTP normally afterward).
8. **Recovery tokens must be stored hashed**, never plaintext (rule.md #14).
9. **Admin-assisted recovery** (when no email is registered): out of scope for MVP code; the flow is: customer contacts support → admin verifies identity manually → admin can directly update the user's phone in the admin portal (covered in F-012).

---

## Recovery Flow

```
Customer initiates recovery
  → POST /auth/recover/request  { email }
  → Find User by email
  → If found: generate recovery token → hash + store → send email with magic link
  → If not found: respond with same success message (don't reveal email existence)
  → Customer clicks link in email → GET /auth/recover/verify?token=...
  → Validate token (not expired, not used)
  → Issue new access + refresh tokens (linked to the existing User)
  → Customer is now logged in; prompted to update their phone number
```

---

## Database Requirements

### CREATE — `AccountRecoveryToken` table

```prisma
model AccountRecoveryToken {
  id         String    @id @default(cuid())
  userId     String
  user       User      @relation(fields: [userId], references: [id])
  tokenHash  String    // SHA-256 hash of the issued token — never plaintext
  expiresAt  DateTime
  usedAt     DateTime?
  createdAt  DateTime  @default(now())

  @@index([userId])
}
```

> `User` model needs `recoveryTokens AccountRecoveryToken[]` back-relation added.

---

## Backend Requirements

### Files to CREATE

| File                         | Purpose                                                        |
| ---------------------------- | -------------------------------------------------------------- |
| `src/auth/recovery.ts`       | Recovery token generation, hashing, email dispatch, validation |
| `src/auth/email-provider.ts` | Email provider interface + console-log dev implementation      |

### API Endpoints

#### `POST /auth/recover/request`

- **Auth required:** No (this is the path for locked-out users)
- **Input:** `{ email: string }`
- **Logic:** normalize email → find User by email → if found: invalidate prior recovery tokens, generate new token, hash + store, dispatch email → always respond with same success message (security: do not reveal whether email exists)
- **Response:** `200 { success: true, message: "If that email is registered, a recovery link has been sent." }`
- **Rate limit:** 3 requests per email per hour; log all attempts

#### `POST /auth/recover/verify`

- **Auth required:** No
- **Input:** `{ token: string }` (from the email link's query parameter, submitted via frontend)
- **Logic:** hash incoming token → find `AccountRecoveryToken` where `tokenHash` matches → validate not expired, not used → mark `usedAt` → issue access + refresh tokens for the linked User
- **Response (success):** `200 { accessToken, refreshToken, user: { id, name, phone, role } }`
- **Response (error):** `400` for invalid/expired/used token

#### `PUT /auth/recover/phone` _(called after successful recovery)_

- **Auth required:** Yes (the newly issued access token)
- **Input:** `{ phone: string, otpCode: string }` — updating phone requires verifying OTP on the new number
- **Logic:** verify OTP for new phone (reuses F-002 OTP system) → update `User.phone`
- **Response:** `200 { success: true }`

---

## Frontend Requirements

### Files to CREATE

| File                                         | Purpose                                                                                      |
| -------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `src/portal/Settings/RecoveryEmailSetup.tsx` | UI for customer to add/update their recovery email (shown in profile settings)               |
| `src/shared/pages/RecoverAccount.tsx`        | "Forgot access" page — email input, submission, confirmation message                         |
| `src/shared/pages/RecoveryVerify.tsx`        | Token landing page (from email link) — verifies token and redirects to portal with session   |
| `src/shared/api/auth.ts`                     | Add `requestRecovery()`, `verifyRecoveryToken()`, `updatePhone()` calls (extends F-002 file) |

---

## Validation & Error Cases

| Case                                         | Behavior                                            |
| -------------------------------------------- | --------------------------------------------------- |
| Email not registered                         | 200 with generic success message (do not reveal)    |
| Token expired                                | `400 { error: { code: "RECOVERY_TOKEN_EXPIRED" } }` |
| Token already used                           | `400 { error: { code: "RECOVERY_TOKEN_USED" } }`    |
| Token not found / invalid                    | `400 { error: { code: "RECOVERY_TOKEN_INVALID" } }` |
| Recovery rate limit exceeded                 | `429 { error: { code: "RATE_LIMITED" } }`           |
| New phone already registered to another user | `409 { error: { code: "PHONE_IN_USE" } }`           |
| OTP for new phone fails                      | `400 { error: { code: "OTP_INVALID" } }`            |

---

## Acceptance Criteria

- [ ] `POST /auth/recover/request` with a registered email triggers a recovery email (logged to console in dev)
- [ ] `POST /auth/recover/request` with an unregistered email returns the same 200 message (no information leak)
- [ ] `POST /auth/recover/verify` with a valid token issues access + refresh tokens for the correct user
- [ ] Recovery token cannot be used twice (second use returns 400)
- [ ] Recovery token expires after 1 hour
- [ ] Recovery token is stored hashed in the DB (no plaintext)
- [ ] After recovery, the user's existing Profile, CardAssignment, and NFCCard are untouched
- [ ] Rate limit of 3 requests per email per hour is enforced
- [ ] Recovery audit entries are logged (at minimum: timestamp, email attempted, outcome)
- [ ] Customer can update their phone number after recovery by verifying OTP on the new number
- [ ] Recovery email setup UI is accessible from customer portal settings (F-011)

---

## Implementation Tasks

- [ ] **T-003-1:** Add `AccountRecoveryToken` model to `schema.prisma`; run migration
- [ ] **T-003-2:** Create `src/auth/email-provider.ts` — interface + console-log dev impl
- [ ] **T-003-3:** Create `src/auth/recovery.ts` — token generation, storage, validation
- [ ] **T-003-4:** Add `POST /auth/recover/request` to `src/auth/router.ts`
- [ ] **T-003-5:** Add `POST /auth/recover/verify` to `src/auth/router.ts`
- [ ] **T-003-6:** Add `PUT /auth/recover/phone` endpoint
- [ ] **T-003-7:** Add per-email rate limiting to recovery request endpoint
- [ ] **T-003-8:** Create `src/shared/pages/RecoverAccount.tsx` frontend page
- [ ] **T-003-9:** Create `src/shared/pages/RecoveryVerify.tsx` token landing page
- [ ] **T-003-10:** Create `src/portal/Settings/RecoveryEmailSetup.tsx` component
- [ ] **T-003-11:** Update `.agents/features.md` on completion
