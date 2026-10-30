# F-014 — Analytics & Event Tracking

**ID:** F-014  
**Priority:** 🟢 Medium  
**Phase:** 9  
**Status:** ✅ Complete  
**Depends on:** F-010 (public profile SSR — primary event source)  
**Required by:** F-011 (customer dashboard metrics), F-012 (admin analytics dashboard)

---

## Purpose

Implement end-to-end analytics: capture profile interaction events on the public page, apply bot/crawler filtering at write time, deduplicate repeat taps within a short window, expose time-bucketed metrics to both customer and admin dashboards, and protect visitor privacy by keeping all analytics aggregate-only.

## User Story

**Customer:**  
_As a cardholder, I want to see how many times my profile was viewed today, this week, and in total — as well as which contact links were clicked — so I know whether my card is making an impact._

**Admin:**  
_As a super admin, I want platform-wide analytics — total views, total scans, and breakdowns by card type — so I can assess platform health and engagement._

---

## Technical Details (Option B Architecture)

- **Event Firing from Next.js Public Page (`apps/web`):**
  A lightweight Client Component (`AnalyticsTracker.tsx`) in `app/p/[type]/[token]/page.tsx` fires `PROFILE_VIEW` on mount. Link clicks (phone, email, social, contact save) call `POST /analytics/event` on the Express API via `navigator.sendBeacon` or `fetch(..., { keepalive: true })`.
- **Event Storage & Aggregation (`apps/api`):**
  Express endpoints `POST /analytics/event` and `POST /analytics/events` validate event types, enforce active card status, perform server-side User-Agent bot filtering (`isBot`), check 30-minute session deduplication, and record `ProfileEvent` in Postgres.
- **Dashboards (`apps/web`):**
  Customer Analytics (`app/portal/analytics/page.tsx`) and Admin Analytics (`app/admin/analytics/page.tsx`) consume aggregate endpoints (`GET /analytics/summary`, `GET /profile/analytics`, `GET /admin/analytics`).

---

## Acceptance Criteria

- [x] `POST /analytics/event` records `PROFILE_VIEW` events for ACTIVE cards
- [x] Googlebot request sets `isBot = true`; excluded from customer analytics
- [x] Two `PROFILE_VIEW` events from same session in 30 minutes set `isDuplicate = true`; counted once
- [x] `GET /analytics/summary` returns today/week/month/total counts for customer's card
- [x] Click events (`PHONE_CLICK`, `WHATSAPP_CLICK`, `EMAIL_CLICK`, `SAVE_CONTACT`, `WEBSITE_CLICK`, etc.) captured via Next.js client handlers
- [x] Customer and Admin analytics dashboards display view counts and click breakdown
- [x] Zero visitor PII exposed in customer or admin API responses

---

## Implementation Tasks

- [x] **T-014-1:** Create/update `src/services/analytics.service.ts` in `apps/api` with bot detection and 30-min deduplication
- [x] **T-014-2:** Create/update `src/routes/analytics.routes.ts` in `apps/api` (`POST /analytics/event`, `POST /analytics/events`, `GET /analytics/summary`)
- [x] **T-014-3:** Wire `GET /admin/analytics` in `apps/api` with platform totals, card type breakdowns, and bot metrics
- [x] **T-014-4:** Update `apps/web/components/public/AnalyticsTracker.tsx` for Next.js SSR page with global link delegation
- [x] **T-014-5:** Update `apps/web/app/portal/analytics/page.tsx` with 4-card time buckets and interaction breakdown
- [x] **T-014-6:** Update `apps/web/components/admin/AdminAnalyticsClient.tsx` with bot vs human telemetry
- [x] **T-014-7:** Update `.agents/features.md`, `docs/features/FEATURE_INDEX.md`, `docs/API_CONTEXT.md`, and Postman collection on completion
