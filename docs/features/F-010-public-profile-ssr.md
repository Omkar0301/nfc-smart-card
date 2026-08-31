# F-010 — Public Profile Page (Next.js App Router SSR)

**ID:** F-010  
**Priority:** 🔴 Critical  
**Phase:** 7  
**Status:** ❌ NOT STARTED  
**Depends on:** F-008 (profile + visibility), F-009 (template components)  
**Required by:** F-013 (QR/save contact), F-014 (analytics), F-017 (SEO/caching)

---

## Purpose

Implement the server-rendered public profile route — the page a visitor sees when they tap an NFC card or scan a QR code. This is the most performance-critical and user-facing route in the platform. It is implemented as a **Next.js App Router Server Component** (`apps/web/app/p/[type]/[token]/page.tsx`), leveraging Next.js dynamic metadata (`generateMetadata()`) for Open Graph link previews and the Next.js Data Cache (`revalidateTag`) for instant cache invalidation upon profile changes.

## User Story

**Visitor (NFC tap):**  
*As someone who just tapped an NFC card on my phone, I want to immediately see the cardholder's profile on a fast-loading page — so I can contact them, visit their social links, or save their contact.*

**Customer:**  
*As a cardholder, I want my public page to appear correctly when my URL is shared on WhatsApp, LinkedIn, or other social platforms — with a proper title, description, and preview image.*

---

## PRD Requirements Covered

- **§3** — Core concept: URL → resolve token → render profile
- **§14** — Server-rendered public profile route (`/p/:type/:token`); fast first paint on mobile; Open Graph tags; Next.js App Router Server Components; cache invalidated on profile save
- **§23** — Error scenarios for each card status
- **§25** — SEO: dynamic title, meta description, OG image; no-index option; WCAG contrast/tap-targets
- **§18** — Save Contact (`.vcf`) CTA on public page
- **§20** — Analytics events: SCAN, PROFILE_VIEW
- **skills.md** — Server-Rendered Public Profile; Cache Invalidation on Profile Change

---

## What Is Already Implemented

| Item | Status |
|---|---|
| Next.js App Router `apps/web` structure | ✅ REUSE |
| Template components (F-009) | ✅ REUSE |
| Profile visibility enforcement (F-008) | ✅ REUSE |

---

## Gaps & Missing Items

- ❌ No Next.js `app/p/[type]/[token]/page.tsx` route handler
- ❌ No `generateMetadata()` implementation for dynamic OG tags
- ❌ No status-specific error components (PAUSED, SUSPENDED, DEACTIVATED, AVAILABLE)
- ❌ No cache revalidation handler (`revalidateTag`)

---

## Business Rules

1. **The public profile route is `/p/[type]/[token]`** — `:type` is the `CardType.slug`, `:token` is `NFCCard.publicToken`.
2. **Server Component rendering** — `page.tsx` is a React Server Component. It fetches data from the API backend or database, filters fields for visibility, and renders the selected template.
3. **Dynamic Open Graph Metadata (`generateMetadata`):**
   ```typescript
   export async function generateMetadata({ params }): Promise<Metadata> {
     const profile = await getPublicProfile(params.token);
     return {
       title: `${profile.name} | ${profile.cardTypeName}`,
       description: profile.bio || `Connect with ${profile.name}`,
       openGraph: {
         title: `${profile.name} — ${profile.designation}`,
         description: profile.bio,
         images: [{ url: profile.photoUrl || '/default-og.png' }],
         url: `https://${process.env.NEXT_PUBLIC_DOMAIN}/p/${params.type}/${params.token}`,
         type: 'profile',
       },
     };
   }
   ```
4. **Cache Revalidation (`revalidateTag`):**
   Data fetching in `page.tsx` uses:
   ```typescript
   fetch(`${process.env.API_URL}/cards/${token}/public`, {
     next: { tags: [`profile-${token}`] }
   })
   ```
   When the cardholder updates their profile or status in `apps/api`, Express triggers revalidation:
   ```typescript
   // In apps/api service:
   await revalidateNextTag(`profile-${token}`);
   ```
5. **Card status gates rendering:**
   - `ACTIVE` + `status = "published"` → render template
   - Any other state → render status-specific error component (no PII leaked)

---

## Rendering Flow

```
GET /p/[type]/[token] (apps/web)
  1. Next.js calls generateMetadata({ params }) → generates OG tags
  2. Next.js renders app/p/[type]/[token]/page.tsx (Server Component)
  3. Fetch public profile data from API (with tag: `profile-${token}`)
  4. Check card status:
     - Not found → render 404 Component
     - AVAILABLE → render "Card not activated" Component + CTA
     - ASSIGNED / PAUSED / SUSPENDED / DEACTIVATED → render status Component
     - ACTIVE → continue
  5. Load Template component from packages/shared/src/templates
  6. Render template with visibility-filtered data
  7. Send response HTML
  8. (Async) Client component fires PROFILE_VIEW analytics event
```

---

## Status-Specific Components

| Card Status | Component View |
|---|---|
| 404 / invalid token | "Card not found." — minimal |
| `AVAILABLE` | "This card hasn't been set up yet." + "Activate card" CTA (links to `/activate/[token]`) |
| `ASSIGNED` | "Profile coming soon." — owner setting up |
| `PAUSED` | "This card is currently unavailable." |
| `SUSPENDED` | "This card is temporarily unavailable." |
| `DEACTIVATED` | "This card is no longer active." |

---

## Frontend Requirements (`apps/web`)

### Files to CREATE

| File | Purpose |
|---|---|
| `apps/web/app/p/[type]/[token]/page.tsx` | Next.js App Router Server Component for public profile |
| `apps/web/app/p/[type]/[token]/layout.tsx` | Layout wrapper (minimal HTML, meta tags) |
| `apps/web/components/public/StatusViews.tsx` | Components for PAUSED, SUSPENDED, DEACTIVATED, AVAILABLE states |
| `apps/web/components/public/AnalyticsTracker.tsx` | Client Component that fires `PROFILE_VIEW` event on mount |
| `apps/web/app/api/revalidate/route.ts` | Next.js Route Handler for Express API to trigger `revalidateTag` |

---

## Validation & Error Cases

| Case | Behavior |
|---|---|
| Token not found | Render 404 Status Component |
| Card type mismatch in URL | Render 404 Status Component |
| Profile status is draft | Render "Profile coming soon" Component |
| Template component throws | Catch error in `error.tsx` → render fallback UI |

---

## Acceptance Criteria

- [ ] `GET /p/business/[valid_token]` returns 200 with Server Component rendered HTML
- [ ] Next.js `generateMetadata()` generates valid `og:title`, `og:image`, `og:url`
- [ ] Rendered page contains only publicly visible fields (hidden fields excluded server-side)
- [ ] PAUSED, SUSPENDED, DEACTIVATED cards render status components with zero PII
- [ ] `revalidateTag('profile-${token}')` instantly purges Next.js Data Cache on profile edit
- [ ] Mobile-responsive layout at 375px viewport width
- [ ] All interactive elements meet 44px tap target size

---

## Implementation Tasks

- [ ] **T-010-1:** Create `apps/web/app/p/[type]/[token]/page.tsx` Server Component
- [ ] **T-010-2:** Implement `generateMetadata()` in `page.tsx`
- [ ] **T-010-3:** Create `apps/web/components/public/StatusViews.tsx`
- [ ] **T-010-4:** Create `apps/web/components/public/AnalyticsTracker.tsx`
- [ ] **T-010-5:** Create `apps/web/app/api/revalidate/route.ts` Next.js Route Handler
- [ ] **T-010-6:** Wire `revalidateTag` trigger into `apps/api` profile update services
- [ ] **T-010-7:** Update `.agents/features.md` on completion
