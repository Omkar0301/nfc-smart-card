# F-002 — Authentication: OTP & JWT

**ID:** F-002  
**Priority:** 🔴 Critical  
**Phase:** 1  
**Status:** ✅ COMPLETED (2026-08-31)  
**Depends on:** F-001  
**Required by:** F-003, F-006, F-007, F-008, F-011, F-012, F-015

---

## Purpose

Implement the platform's primary authentication system: mobile OTP verification with JWT access and refresh token session management. This is the gate through which every customer and admin enters the platform. No other user-facing feature can function without it.

## User Story

**Customer:**  
*As a customer arriving at an unactivated card URL, I want to enter my phone number, receive an OTP, verify it, and have a session created — so I can claim my card and manage my profile.*

**Admin:**  
*As a super admin, I want to log in with my phone number + OTP and receive a JWT that grants me access to all admin routes.*

**API:**  
*As an API consumer, I want a `GET /auth/me` endpoint that returns the current user from their JWT, and a `POST /auth/logout` that invalidates the session — so the frontend can restore and clear state reliably.*

---

## PRD Requirements Covered

- **§10.1** — Mobile OTP primary auth
- **§6.1, §6.2** — Super Admin vs Customer roles enforced via JWT payload
- **§22** — `POST /auth/send-otp`, `POST /auth/verify-otp`, `POST /auth/logout`, `GET /auth/me`
- **§24, #8** — Public tokens crypto-random (OTP itself must also be unpredictable)
- **§24, #9** — Card claiming requires authenticated user
- **architecture.md §8** — OTP provider behind a pluggable interface; JWT access + refresh; account recovery is a separate flow (F-003)

---

## What Is Already Implemented

| Item | Status |
|---|---|
| `User` model (id, name, phone, email, role, status) | ✅ REUSE |
| `Role` enum (CUSTOMER, ADMIN) | ✅ REUSE |
| `jsonwebtoken` dependency in `package.json` | ✅ REUSE |
| `JWT_SECRET` env var in `.env.example` | ✅ REUSE |
| Empty `src/auth/` directory | ⚠️ SCAFFOLD (create code here) |
| Empty `src/middleware/` directory | ⚠️ SCAFFOLD (create guards here) |

---

## Gaps & Missing Items

- ❌ No OTP send/verify logic
- ❌ No JWT generation or validation
- ❌ No auth routes mounted in `app.ts`
- ❌ No auth middleware (guards)
- ❌ No Prisma client instantiation file
- ❌ No OTP storage mechanism (temp store for unverified OTPs)
- ❌ No rate limiting on OTP endpoints (required — see F-017, but basic limiting must exist in auth from day 1)

---

## Business Rules

1. **OTP is the only primary login method.** No password auth.
2. **OTP is single-use.** Once verified or expired, it cannot be reused.
3. **OTP expires after a short window** (5 minutes recommended; exact value is implementation choice).
4. **Sending a new OTP invalidates any prior pending OTP** for the same phone number.
5. **New users are auto-created** on first OTP verification (name collected during activation/onboarding — at auth time, a User row is created with phone only; name is added during profile creation, F-008).
6. **Returning users are logged in** — no separate "register" vs "login" path; one flow handles both.
7. **JWT access token** — short-lived (15 min). Used in `Authorization: Bearer <token>` header.
8. **JWT refresh token** — longer-lived (7 days). Used to obtain a new access token without re-authenticating.
9. **Role is embedded in JWT payload** (`role: "CUSTOMER"` or `role: "ADMIN"`). Admin status is checked server-side on every admin request — never trusted from the client alone.
10. **`POST /auth/logout`** — invalidates the refresh token. Access token is stateless and expires naturally.

---

## OTP Storage Strategy

OTP verification requires temporary storage between `send-otp` and `verify-otp` calls. Per architecture constraints (no Redis), the recommended approach is:

- Store OTPs in Postgres in a dedicated `OtpVerification` table (or as a temporary field on User — the table approach is preferred for auditability and cleanup).
- Fields: `phone`, `code` (hashed, not plaintext — rule.md #14), `expiresAt`, `usedAt`, `attempts`.
- Clean up expired OTPs on a schedule or on-access.

> **Note:** A lightweight `OtpVerification` table requires a schema addition (migration). This is a sub-task of F-002 implementation. See Database Requirements below.

---

## OTP Provider Interface

The OTP SMS dispatch must be behind a pluggable interface. A concrete SMS vendor (Twilio, MSG91, etc.) is configured via environment variables; the rest of the codebase calls the interface, never the vendor SDK directly. This allows swapping vendors without touching auth logic.

```
interface OtpProvider {
  sendOtp(phone: string, code: string): Promise<void>
}
```

In development, a console-log OTP provider is acceptable (prints code to stdout).

---

## Database Requirements

### CREATE — `OtpVerification` table (new migration, sub-task of F-002)

```prisma
model OtpVerification {
  id         String    @id @default(cuid())
  phone      String
  codeHash   String    // bcrypt/SHA hash — never store plaintext OTP
  expiresAt  DateTime
  usedAt     DateTime?
  attempts   Int       @default(0)
  createdAt  DateTime  @default(now())

  @@index([phone])
}
```

### CREATE — `RefreshToken` table (or store as field on User — table preferred)

```prisma
model RefreshToken {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  tokenHash String   // hash of the issued refresh token
  expiresAt DateTime
  revokedAt DateTime?
  createdAt DateTime @default(now())

  @@index([userId])
}
```

> `User` model needs `refreshTokens RefreshToken[]` back-relation added.

---

## Backend Requirements

### Files to CREATE

| File | Purpose |
|---|---|
| `src/lib/prisma.ts` | Singleton Prisma client instance — imported by all services |
| `src/auth/otp.ts` | OTP generation, hashing, storage, expiry, validation |
| `src/auth/jwt.ts` | JWT sign (access + refresh), verify, decode utilities |
| `src/auth/router.ts` | Express router mounting all `/auth/*` endpoints |
| `src/auth/otp-provider.ts` | OTP provider interface + console-log dev implementation |
| `src/middleware/requireAuth.ts` | Validates `Authorization: Bearer` JWT; attaches `req.user` |
| `src/middleware/requireAdmin.ts` | Calls `requireAuth`, then asserts `req.user.role === 'ADMIN'` |

### API Endpoints

#### `POST /auth/send-otp`
- **Input:** `{ phone: string }` (validated — E.164 format or normalized)
- **Logic:** validate phone format → generate 6-digit OTP → hash it → upsert `OtpVerification` row (invalidates prior) → call `OtpProvider.sendOtp()` → respond
- **Response (success):** `200 { success: true, message: "OTP sent" }`
- **Response (error):** `400` for invalid phone; `429` for rate-limit (see F-017 for full rate limiting — a basic per-phone limit must exist here from day 1)
- **Rate limit:** max 3 OTP sends per phone per 10 minutes (enforced in handler until F-017)

#### `POST /auth/verify-otp`
- **Input:** `{ phone: string, code: string }`
- **Logic:** find latest `OtpVerification` for phone → check not expired, not used, not exceeded max attempts → compare hash → if match: mark `usedAt`, find-or-create `User` by phone, issue access + refresh tokens → respond
- **Response (success):** `200 { accessToken: string, refreshToken: string, user: { id, name, phone, role } }`
- **Response (error):** `400` invalid/expired code; `401` max attempts exceeded
- **Max attempts:** 5 failed verifications → OTP locked (must request new one)

#### `POST /auth/refresh`
- **Input:** `{ refreshToken: string }` (in body or httpOnly cookie — implementation choice)
- **Logic:** verify refresh token signature → look up `RefreshToken` row → check not expired, not revoked → issue new access token (and optionally rotate refresh token)
- **Response:** `200 { accessToken: string }`

#### `POST /auth/logout`
- **Auth required:** Yes (Bearer token)
- **Input:** `{ refreshToken: string }` 
- **Logic:** set `revokedAt` on `RefreshToken` row
- **Response:** `200 { success: true }`

#### `GET /auth/me`
- **Auth required:** Yes (Bearer token)
- **Logic:** return `req.user` from decoded JWT (or fetch fresh from DB for full profile)
- **Response:** `200 { id, name, phone, email, role, status }`

---

## Frontend Requirements

The frontend for this feature is minimal — the activation/claiming UI is in F-007 and F-011. However, a shared API client and auth state layer is needed from this point onward.

### Files to CREATE (in `apps/web/src/shared/`)

| File | Purpose |
|---|---|
| `src/shared/api/client.ts` | Base Axios/fetch instance with `Authorization` header injection and 401 refresh handling |
| `src/shared/api/auth.ts` | `sendOtp()`, `verifyOtp()`, `refresh()`, `logout()`, `getMe()` API calls |
| `src/shared/context/AuthContext.tsx` | React context: current user, `login()`, `logout()`, `isAdmin` helper |
| `src/shared/hooks/useAuth.ts` | Convenience hook that reads `AuthContext` |
| `src/shared/components/OtpFlow/` | Reusable 2-step OTP UI: phone entry → code entry (used in Activate and Admin Login) |

### Auth token storage

- **Access token:** memory only (React state / context). Do NOT persist to localStorage.
- **Refresh token:** httpOnly cookie (set by server) — if httpOnly cookies are used; or localStorage if the team makes an explicit decision otherwise. Document the decision in `architecture.md`.
- On page reload: call `GET /auth/me` with the refresh token to restore session.

---

## Validation & Error Cases

| Case | Behavior |
|---|---|
| Invalid phone format | `400 { error: { code: "INVALID_PHONE", message: "..." } }` |
| OTP expired | `400 { error: { code: "OTP_EXPIRED" } }` |
| OTP incorrect | `400 { error: { code: "OTP_INVALID", attemptsLeft: N } }` |
| OTP max attempts exceeded | `401 { error: { code: "OTP_LOCKED" } }` |
| JWT missing or malformed | `401 { error: { code: "UNAUTHORIZED" } }` |
| JWT expired (access token) | `401 { error: { code: "TOKEN_EXPIRED" } }` — client should retry with refresh |
| User suspended (`status = SUSPENDED`) | `403 { error: { code: "ACCOUNT_SUSPENDED" } }` |
| Admin route called by CUSTOMER role | `403 { error: { code: "FORBIDDEN" } }` |

---

## Security Rules (from `rules.md`)

- Rule #12: OTP endpoints must be rate-limited
- Rule #14: Never log or store OTP codes in plaintext (store hash only)
- Rule #10: No plaintext password storage (N/A here — OTP only, but applies if password auth ever added)
- Rule #10 (admin): Admin routes must verify `role === ADMIN` server-side on every request

---

## Acceptance Criteria

- [x] `POST /auth/send-otp` with valid phone returns 200; OTP row created in DB
- [x] `POST /auth/verify-otp` with correct code returns 200 with `accessToken` + `refreshToken`
- [x] `POST /auth/verify-otp` with wrong code returns 400; attempt counter increments
- [x] After 5 wrong attempts, `verify-otp` returns 401 locked
- [x] Expired OTP returns 400 (not 200)
- [x] `GET /auth/me` with valid access token returns 200 with user object
- [x] `GET /auth/me` with no token returns 401
- [x] `POST /auth/logout` revokes refresh token; subsequent refresh attempts fail
- [x] Admin user calling admin route gets 200; customer calling same route gets 403
- [x] OTP code is NOT stored in plaintext in the DB (`codeHash` column contains a hash)
- [x] New phone number auto-creates a `User` row on first verify
- [x] Returning phone number returns existing user (no duplicate creation)

---

## Implementation Tasks

- [x] **T-002-1:** Create `apps/api/src/lib/prisma.ts` — singleton Prisma client
- [x] **T-002-2:** Add `OtpVerification` and `RefreshToken` models to `schema.prisma`; run migration
- [x] **T-002-3:** Create `src/auth/otp-provider.ts` — interface + console-log dev impl
- [x] **T-002-4:** Create `src/auth/otp.ts` — generate, hash, store, validate OTP logic
- [x] **T-002-5:** Create `src/auth/jwt.ts` — sign access token, sign/revoke refresh token
- [x] **T-002-6:** Create `src/auth/router.ts` — mount all 5 auth endpoints
- [x] **T-002-7:** Create `src/middleware/requireAuth.ts` and `requireAdmin.ts`
- [x] **T-002-8:** Mount auth router in `src/app.ts`
- [x] **T-002-9:** Create `apps/web/src/shared/api/client.ts` — base API client with auth header
- [x] **T-002-10:** Create `apps/web/src/shared/api/auth.ts` — auth API calls
- [x] **T-002-11:** Create `apps/web/src/shared/context/AuthContext.tsx` + `useAuth.ts` hook
- [x] **T-002-12:** Create `apps/web/src/shared/components/OtpFlow/` — phone + code entry UI
- [x] **T-002-13:** Update `.agents/features.md` on completion

---

## Implementation Notes

### Database Setup
✅ **Migration:** `20260831120000_auth_otp_refresh_tokens`
- Creates `OtpVerification` table with phone index
- Creates `RefreshToken` table with userId index
- Adds foreign keys and proper timestamps

**Run migrations:**
```bash
cd apps/api
npm run prisma:migrate:deploy
```

### Backend Files Created
All files in `apps/api/src/`:
- ✅ `lib/prisma.ts` — Prisma singleton client
- ✅ `auth/otp-provider.ts` — Pluggable SMS interface (console-log in dev)
- ✅ `auth/otp.ts` — OTP generation, hashing, validation logic
- ✅ `auth/jwt.ts` — JWT token creation and verification
- ✅ `auth/phone.ts` — Phone number normalization (E.164)
- ✅ `auth/router.ts` — All 5 auth endpoints (fully documented)
- ✅ `middleware/requireAuth.ts` — JWT validation middleware
- ✅ `middleware/requireAdmin.ts` — Admin-only route guard

### Frontend Files Created
All files in `apps/web/src/shared/`:
- ✅ `api/client.ts` — Axios instance with auto Bearer token injection & 401 retry
- ✅ `api/auth.ts` — Auth API wrappers (sendOtp, verifyOtp, refresh, logout, getMe)
- ✅ `context/AuthContext.tsx` — Global auth state management
- ✅ `hooks/useAuth.ts` — Convenience hook for auth state access
- ✅ `components/OtpFlow/OtpFlow.tsx` — Reusable 2-step OTP UI component

### Running the API
```bash
cd apps/api
npm run dev
# API starts on http://localhost:4000
```

### Running Integration Tests
```bash
cd apps/api
npx tsx src/__tests__/auth.integration.test.ts
# All 7 tests passing ✅
```

### Environment Variables Required

**API (.env):**
```env
JWT_SECRET=your-min-32-char-secret-key
DATABASE_URL=postgresql://user:pass@localhost:5432/nfc_card_platform
NODE_ENV=development
OTP_PROVIDER=console      # Production: twilio, msg91, etc
WEB_URL=http://localhost:3000
PORT=4000
```

**Frontend (.env.local):**
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### Using in Frontend

**Wrap app with provider:**
```tsx
import { AuthProvider } from '@/shared/context/AuthContext';

<AuthProvider>
  <YourApp />
</AuthProvider>
```

**Access auth in components:**
```tsx
import { useAuth } from '@/shared/hooks/useAuth';

const { user, isAdmin, isLoading, sendOtp, login, logout } = useAuth();
```

**Use OTP flow component:**
```tsx
import { OtpFlow } from '@/shared/components/OtpFlow';

<OtpFlow onSuccess={() => navigate('/dashboard')} />
```

### API Endpoint Examples

**Send OTP:**
```bash
curl -X POST http://localhost:4000/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+1234567890"}'
# Response: { "success": true, "message": "OTP sent" }
```

**Verify OTP:**
```bash
curl -X POST http://localhost:4000/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+1234567890", "code": "123456"}'
# Response: { "accessToken": "...", "refreshToken": "...", "user": {...} }
```

**Get Current User:**
```bash
curl -X GET http://localhost:4000/auth/me \
  -H "Authorization: Bearer <accessToken>"
# Response: { "id": "...", "name": "...", "phone": "...", "role": "CUSTOMER" }
```

### Security Summary
- ✅ OTP hashed with HMAC-SHA256 (never plaintext)
- ✅ Access token: 15 minutes lifetime
- ✅ Refresh token: 7 days lifetime with rotation
- ✅ Rate limit: 3 OTP sends per phone per 10 minutes
- ✅ Max 5 failed attempts per OTP before lockout
- ✅ Account suspension checks on every auth operation
- ✅ Admin routes require server-side role verification

---

## Unblocks
This feature enables development of:
- F-003 — Account Recovery (depends on auth system)
- F-006 — Admin Card Lifecycle (requires admin auth)
- F-007 — Card Claiming/Activation (requires customer auth)
- F-008 — Profile Management (requires authenticated user)
- F-011 — Customer Portal UI (requires frontend auth)
- F-012 — Admin Portal UI (requires admin auth)
- F-015 — Customer Card Lifecycle (requires authenticated user)
