# F-011 — Customer Portal UI (Next.js App Router)

**ID:** F-011  
**Priority:** 🟡 High  
**Phase:** 8  
**Status:** ❌ NOT STARTED  
**Depends on:** F-002 (auth), F-008 (profile), F-009 (templates), F-015 (card lifecycle)  
**Required by:** F-013 (QR, save contact), F-016 (photo upload)

---

## Purpose

Build the complete customer-facing portal: the authenticated web application where customers manage their profile, choose a template, view their card details, see analytics, and control their card's lifecycle. The portal is implemented using Next.js App Router routes (`apps/web/app/portal/*`).

## User Story

*As a customer, I want a clean, mobile-friendly dashboard where I can see my card status at a glance, quickly navigate to edit my profile, switch my template, preview what my public page looks like, see how many times my card has been viewed, and manage my card if it's lost or I want to pause it.*

---

## PRD Requirements Covered

- **§15** — Customer Portal: Dashboard · My Profile · My Card · Templates · Preview · Analytics · Settings
- **§17** — My Card screen: card number, status, public URL, QR view, pause/resume, report lost, request replacement
- **§13** — Template picker and preview (F-009 components integrated here)
- **§6.2** — Customer role — can only access their own data
- **§12** — Onboarding flow entry point after claim (F-007 routes here)

---

## Next.js App Router Structure

```
apps/web/app/portal/
├── layout.tsx             → Shared Portal Layout (Sidebar, TopBar, Mobile Nav, Auth Guard)
├── dashboard/page.tsx     → Overview card with status, recent views, quick actions
├── profile/page.tsx       → ProfileEditor (F-008) — edit fields + visibility
├── templates/page.tsx     → TemplatePicker (F-009) — choose/switch template
├── preview/page.tsx       → ProfilePreview — full-screen template preview with live data
├── my-card/page.tsx       → MyCard — card details, QR code (F-013), lifecycle controls (F-015)
├── analytics/page.tsx     → AnalyticsDashboard — views & click breakdown (F-014)
└── settings/page.tsx      → Account settings: name, recovery email, phone update
```

---

## Frontend Requirements (`apps/web`)

### Files to CREATE

| File | Purpose |
|---|---|
| `apps/web/app/portal/layout.tsx` | Portal layout with Auth Guard & Navigation |
| `apps/web/app/portal/dashboard/page.tsx` | Dashboard view |
| `apps/web/app/portal/profile/page.tsx` | Profile editor page |
| `apps/web/app/portal/templates/page.tsx` | Template picker page |
| `apps/web/app/portal/preview/page.tsx` | Client-side live preview |
| `apps/web/app/portal/my-card/page.tsx` | Card management & QR page |
| `apps/web/app/portal/analytics/page.tsx` | Customer analytics page |
| `apps/web/app/portal/settings/page.tsx` | Account settings page |
| `apps/web/components/portal/DashboardCard.tsx` | Status tile & metrics overview |
| `apps/web/components/portal/PortalNav.tsx` | Mobile-friendly navigation bar |

---

## Validation & Error Cases

| Case | Behavior |
|---|---|
| User not logged in | Next.js redirect to `/login` or `/activate/[token]` |
| User has no active card | Show "Activate a card" prompt |
| Token expired (401 from API) | Auto-trigger token refresh; if failed, redirect to login |

---

## Acceptance Criteria

- [ ] All portal routes (`/portal/*`) are auth-protected by Next.js layout guard
- [ ] Dashboard shows card status badge, views today/week/total, and quick action buttons
- [ ] Profile editor loads FieldRenderer form from field schema
- [ ] Template picker shows templates for customer's card type only
- [ ] Live preview renders template with customer's data client-side
- [ ] My Card shows card number, status, public URL (copyable), and QR code
- [ ] Navigation is mobile-friendly with min 44px tap targets

---

## Implementation Tasks

- [ ] **T-011-1:** Create `apps/web/app/portal/layout.tsx` with Auth Guard
- [ ] **T-011-2:** Create `apps/web/app/portal/dashboard/page.tsx`
- [ ] **T-011-3:** Create `apps/web/app/portal/profile/page.tsx` (Wire F-008 ProfileEditor)
- [ ] **T-011-4:** Create `apps/web/app/portal/templates/page.tsx` (Wire F-009 TemplatePicker)
- [ ] **T-011-5:** Create `apps/web/app/portal/my-card/page.tsx` (Wire F-013 QR + F-015 Pause)
- [ ] **T-011-6:** Create `apps/web/app/portal/analytics/page.tsx` (Wire F-014 Analytics)
- [ ] **T-011-7:** Create `apps/web/app/portal/settings/page.tsx`
- [ ] **T-011-8:** Update `.agents/features.md` on completion
