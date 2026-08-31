# F-012 — Admin Portal UI (Next.js App Router)

**ID:** F-012  
**Priority:** 🟡 High  
**Phase:** 8  
**Status:** ❌ NOT STARTED  
**Depends on:** F-005 (generation), F-006 (lifecycle), F-004 (card types), F-002 (admin auth)  
**Required by:** None (terminal feature for admin control plane)

---

## Purpose

Build the complete admin portal: the authenticated web application that gives super admins full control over inventory, card lifecycle, customer management, template management, bulk generation, analytics aggregates, and platform configuration. Implemented using Next.js App Router routes (`apps/web/app/admin/*`).

## User Story

_As a super admin, I want a single portal where I can view the entire card inventory, generate new batches, manage customer cards through their full lifecycle, manage templates, and see platform-wide analytics — so I can operate the platform cleanly._

---

## PRD Requirements Covered

- **§19** — Admin Portal: Dashboard (total/available/assigned/active/paused/suspended/deactivated, total customers, total views, total scans — filterable by card type); Card management; Template management
- **§9** — Bulk generation job status visible in admin
- **§6.1** — Super Admin role
- **§22** — All `/admin/*` Express API endpoints are consumed here

---

## Next.js App Router Structure

```
apps/web/app/admin/
├── layout.tsx             → Shared Admin Layout (Sidebar, TopBar, Admin Role Guard)
├── dashboard/page.tsx     → Platform overview metrics & activity
├── cards/page.tsx         → Card inventory list (search, filter, pagination)
├── cards/[id]/page.tsx    → Single card detail + lifecycle action modals
├── generate/page.tsx      → Bulk card generation form + pg-boss job status
├── card-types/page.tsx    → Card type & field schema management
├── templates/page.tsx     → Template list & configuration management
├── analytics/page.tsx     → Platform-wide analytics
└── customers/page.tsx     → Customer list & account management
```

---

## Frontend Requirements (`apps/web`)

### Files to CREATE

| File                                         | Purpose                                         |
| -------------------------------------------- | ----------------------------------------------- |
| `apps/web/app/admin/layout.tsx`              | Admin layout with `role === 'ADMIN'` protection |
| `apps/web/app/admin/dashboard/page.tsx`      | Dashboard metrics                               |
| `apps/web/app/admin/cards/page.tsx`          | Card inventory table                            |
| `apps/web/app/admin/cards/[id]/page.tsx`     | Card detail & actions                           |
| `apps/web/app/admin/generate/page.tsx`       | Bulk generation page                            |
| `apps/web/app/admin/card-types/page.tsx`     | Card type management page                       |
| `apps/web/app/admin/templates/page.tsx`      | Template management page                        |
| `apps/web/app/admin/analytics/page.tsx`      | Platform analytics page                         |
| `apps/web/app/admin/customers/page.tsx`      | Customer lookup page                            |
| `apps/web/components/admin/AdminSidebar.tsx` | Admin navigation sidebar                        |

---

## Acceptance Criteria

- [ ] All `/admin/*` routes require `role === 'ADMIN'` (enforced in `admin/layout.tsx` and Express API)
- [ ] Dashboard shows card status counts, filterable by card type
- [ ] Inventory table supports search by phone/name, filter by status
- [ ] Card detail view provides lifecycle actions (suspend, deactivate, replace) with confirmation modals
- [ ] Bulk generation form enqueues pg-boss jobs and polls progress
- [ ] Card type management allows dynamic field schema updates

---

## Implementation Tasks

- [ ] **T-012-1:** Create `apps/web/app/admin/layout.tsx` with Admin Guard
- [ ] **T-012-2:** Create `apps/web/app/admin/dashboard/page.tsx`
- [ ] **T-012-3:** Create `apps/web/app/admin/cards/page.tsx` + `cards/[id]/page.tsx`
- [ ] **T-012-4:** Create `apps/web/app/admin/generate/page.tsx`
- [ ] **T-012-5:** Create `apps/web/app/admin/card-types/page.tsx`
- [ ] **T-012-6:** Create `apps/web/app/admin/templates/page.tsx`
- [ ] **T-012-7:** Create `apps/web/app/admin/customers/page.tsx`
- [ ] **T-012-8:** Update `.agents/features.md` on completion
