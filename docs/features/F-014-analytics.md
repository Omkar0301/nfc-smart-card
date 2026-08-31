# F-014 — Analytics & Event Tracking

**ID:** F-014  
**Priority:** 🟢 Medium  
**Phase:** 9  
**Status:** ⚠️ PARTIAL (ProfileEvent model exists with isBot field; no event capture, no API, no UI)  
**Depends on:** F-010 (public profile SSR — primary event source)  
**Required by:** F-011 (customer dashboard metrics), F-012 (admin analytics dashboard)

---

## Purpose

Implement end-to-end analytics: capture profile interaction events on the public page, apply bot/crawler filtering at write time, deduplicate repeat taps within a short window, expose time-bucketed metrics to both customer and admin dashboards, and protect visitor privacy by keeping all analytics aggregate-only.

## User Story

**Customer:**  
*As a cardholder, I want to see how many times my profile was viewed today, this week, and in total — as well as which contact links were clicked — so I know whether my card is making an impact.*

**Admin:**  
*As a super admin, I want platform-wide analytics — total views, total scans, and breakdowns by card type — so I can assess platform health and engagement.*

---

## Technical Details (Option B Architecture)

- **Event Firing from Next.js Public Page (`apps/web`):**
  A lightweight Client Component (`AnalyticsTracker.tsx`) in `app/p/[type]/[token]/page.tsx` fires `PROFILE_VIEW` on mount. Link clicks (phone, email, social) call `POST /analytics/event` on the Express API via `navigator.sendBeacon` or `fetch(..., { keepalive: true })`.
- **Event Storage & Aggregation (`apps/api`):**
  Express endpoint `POST /analytics/event` validates event type, performs User-Agent bot filtering (`isBot`), checks 30-minute session deduplication, and records `ProfileEvent` in Postgres.
- **Dashboards (`apps/web`):**
  Customer Analytics (`app/portal/analytics/page.tsx`) and Admin Analytics (`app/admin/analytics/page.tsx`) consume aggregate endpoints (`GET /analytics/summary`, `GET /admin/analytics/platform`).

---

## Acceptance Criteria

- [ ] `POST /analytics/event` records `PROFILE_VIEW` events for ACTIVE cards
- [ ] Googlebot request sets `isBot = true`; excluded from customer analytics
- [ ] Two `PROFILE_VIEW` events from same session in 30 minutes set `isDuplicate = true`; counted once
- [ ] `GET /analytics/summary` returns today/week/month/total counts for customer's card
- [ ] Click events (`PHONE_CLICK`, etc.) captured via Next.js client handlers
- [ ] Customer and Admin analytics dashboards display view counts and click breakdown
- [ ] Zero visitor PII exposed in customer or admin API responses

---

## Implementation Tasks

- [ ] **T-014-1:** Create `src/services/analyticsService.ts` in `apps/api`
- [ ] **T-014-2:** Create `src/routes/analytics.ts` in `apps/api` (`POST /analytics/event`, `GET /analytics/summary`)
- [ ] **T-014-3:** Create `src/routes/admin/analytics.ts` in `apps/api`
- [ ] **T-014-4:** Create `apps/web/components/public/AnalyticsTracker.tsx` for Next.js SSR page
- [ ] **T-014-5:** Create `apps/web/app/portal/analytics/page.tsx`
- [ ] **T-014-6:** Create `apps/web/app/admin/analytics/page.tsx`
- [ ] **T-014-7:** Update `.agents/features.md` on completion
