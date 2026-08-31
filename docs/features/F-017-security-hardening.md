# F-017 — Security Hardening & Rate Limiting

**ID:** F-017  
**Priority:** 🟡 High  
**Phase:** 9  
**Status:** ❌ NOT STARTED  
**Depends on:** F-002 (auth exists to rate-limit), F-005 (generation exists), F-010 (public route exists)  
**Required by:** None (cross-cutting hardening layer)

---

## Purpose

Apply the platform-wide security hardening layer: rate limiting on sensitive endpoints, HTTP security headers, Next.js cache revalidation on profile changes, SEO/Open Graph polish on the public profile route, and WCAG accessibility compliance on public pages.

## User Story

**Platform operator:**  
_As the platform operator, I need rate limiting on OTP, recovery, and analytics endpoints — so the platform cannot be abused by automated attacks, OTP flooding, or analytics event stuffing._

_As the platform operator, I need HTTP security headers on all responses — so the platform presents a hardened surface to browsers and passes basic security tooling checks._

---

## Technical Details (Option B Architecture)

### 1. Express API Hardening (`apps/api`)

- **Rate Limiting:** `express-rate-limit` on `/auth/send-otp` (3 per 10m), `/auth/verify-otp` (5 per 10m), `/auth/recover/request` (3 per 60m), `/analytics/event` (60 per 60s), `/upload/*` (10 per 60m).
- **Security Headers:** `helmet()` setting `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`.
- **CORS Scoping:** `cors({ origin: process.env.WEB_URL, credentials: true })`. Public endpoints allow `origin: '*'`.
- **Cache Purge Trigger:** Profile updates call Next.js revalidation endpoint (`revalidateTag("profile-${token}")`).

### 2. Next.js App Router Hardening (`apps/web`)

- **Middleware:** `apps/web/middleware.ts` for client-side Auth route protection (`/portal/*`, `/admin/*`).
- **Headers in `next.config.ts`:** CSP (Content-Security-Policy), Permissions-Policy, HSTS.
- **Dynamic Metadata:** Next.js `generateMetadata()` in `app/p/[type]/[token]/page.tsx` for valid Open Graph and Twitter Card headers.

---

## Acceptance Criteria

- [ ] `POST /auth/send-otp` returns `429` after 3 requests from same phone in 10m
- [ ] `POST /auth/verify-otp` returns `429` after 5 wrong attempts from same phone
- [ ] `POST /auth/recover/request` returns `429` after 3 requests for same email in 1h
- [ ] Express API responses include `X-Content-Type-Options: nosniff` and `X-Frame-Options: DENY`
- [ ] CORS is scoped to `WEB_URL` in Express
- [ ] Next.js `revalidateTag('profile-${token}')` is called after profile save, template switch, pause/resume, and admin lifecycle changes
- [ ] All 6 template components pass WCAG AA contrast check and have ≥ 44px tap targets

---

## Implementation Tasks

- [ ] **T-017-1:** Install `express-rate-limit` and `helmet` in `apps/api`
- [ ] **T-017-2:** Create `src/lib/rateLimiter.ts` in `apps/api`
- [ ] **T-017-3:** Create `src/lib/cacheInvalidation.ts` in `apps/api` (calls Next.js `revalidateTag` trigger)
- [ ] **T-017-4:** Configure `helmet()` and scoped CORS in `apps/api/src/app.ts`
- [ ] **T-017-5:** Create `apps/web/middleware.ts` for Next.js route protection
- [ ] **T-017-6:** Configure security headers in `apps/web/next.config.ts`
- [ ] **T-017-7:** Update `.agents/features.md` on completion
