# F-009 — Template System

**ID:** F-009  
**Priority:** 🟡 High  
**Phase:** 6  
**Status:** ⚠️ PARTIAL (Template model exists; no components, no API, no picker UI)  
**Depends on:** F-004 (card types), F-008 (profile)  
**Required by:** F-010 (Next.js SSR rendering), F-011 (template picker UI)

---

## Purpose

Build the template library for Business and College card types (3 templates each = 6 total for MVP), expose the template listing API, implement the template picker UI in the customer portal, and allow template switching without touching the physical card. Templates are hand-crafted React Server Components (in `packages/shared/src/templates/`) that read from `CardType.fieldSchema` + `Profile.data` — there is no visual drag-and-drop builder.

## User Story

**Customer:**  
*As a customer setting up my profile, I want to choose a template that suits my style from a gallery specific to my card type — so my public page looks the way I want.*

*As a customer, I want to switch my template at any time without losing my data or changing my card's URL.*

**Admin:**  
*As a super admin, I want to manage which templates are active for each card type, set their display order, mark them as free or premium, and update their thumbnail.*

---

## PRD Requirements Covered

- **§13** — Template library per card type (Business: Modern, Minimal, Premium; College: Academic, Modern, Creative); mobile-first; renders correctly with any subset of hidden fields; customer can preview before publishing
- **§22** — `GET /templates?cardType=:slug`
- **§19** — Admin template management: create, upload preview, assign to card type, activate/deactivate, mark free/premium, set order
- **§14** — Templates render as Next.js React Server Components for the SSR public page (`/p/[type]/[token]`) and as interactive components in the portal preview
- **skills.md** — Server-Rendered Public Profile; New Card Type Rollout workflow

---

## What Is Already Implemented

| Item | Status |
|---|---|
| `Template` model (id, cardTypeId, name, slug, thumbnail, isActive, isPremium, configuration, timestamps) | ✅ REUSE |
| `Template ↔ CardType` FK relation | ✅ REUSE |
| `Template ↔ Profile` FK (templateId on Profile) | ✅ REUSE |

---

## Gaps & Missing Items

- ❌ No template React components (6 required for MVP)
- ❌ No `GET /templates` endpoint
- ❌ No template picker UI in customer portal
- ❌ No admin template management endpoints
- ❌ No admin template management UI
- ❌ No seed data for Template rows
- ❌ No shared template render interface (needed for SSR + client reuse)

---

## Business Rules

1. **Each card type has its own template library.** A Business customer only sees Business templates; a College customer only sees College templates. (PRD §13)
2. **A template must render correctly with ANY subset of fields hidden.** (PRD §13) It must gracefully handle `null` or absent field values without crashing or showing empty boxes.
3. **Mobile-first.** Templates are displayed on phones immediately after an NFC tap. Every template must be fully usable on a 375px-wide screen.
4. **Template switching does NOT change the public URL.** `NFCCard.publicToken` is permanent.
5. **Template switching immediately updates the public page** (via Next.js `revalidateTag` cache invalidation).
6. **Preview before publishing** — the customer can see what their profile looks like in a template without committing to it.
7. **No visual template builder in MVP** (PRD §5). Templates are hand-coded React components.
8. **Template components live in `packages/shared/src/templates/`** — implemented as pure React components compatible with Next.js Server Components.
9. **`Template.configuration`** — a JSONB field that stores template-specific config values (e.g. color overrides, section visibility toggles).
10. **`isPremium`** — flag for future subscription gating; in MVP, all templates are free but shown with badges.

---

## MVP Template Definitions

### Business Card Templates (slug: `business`)

| Template Name | Slug | Description |
|---|---|---|
| Modern | `business-modern` | Clean card with large photo, name at top, icon-based social links, colored accent bar |
| Minimal | `business-minimal` | Text-first, no heavy imagery, minimal whitespace, monochrome palette |
| Premium | `business-premium` | Gradient background, prominent photo, card-style layout, save-contact CTA dominant |

### College / Student Card Templates (slug: `college`)

| Template Name | Slug | Description |
|---|---|---|
| Academic | `college-academic` | Formal layout, institution logo area, skills and achievements in clean list |
| Modern | `college-modern` | Colorful card-style layout, social links as chips, photo circle |
| Creative | `college-creative` | Portfolio-forward, skills as tags, bold typography, portfolio link dominant |

---

## Template Component Interface

All templates conform to this shared props interface in `packages/shared/src/types/template.ts`:

```typescript
import { FieldSchema } from './fieldSchema';

export interface PublicProfileData {
  [key: string]: string | string[] | null;  // already visibility-filtered by server
}

export interface TemplateProps {
  profile: {
    data: PublicProfileData;           // only public fields (server-filtered)
    fieldSchema: FieldSchema;          // for label lookups
  };
  card: {
    publicToken: string;
    cardNumber: string;
  };
  configuration?: Record<string, unknown>;  // Template.configuration from DB
  isPreview?: boolean;                      // true in portal preview — disables analytics events
}
```

---

## Database Requirements

### MODIFY — Template seed data (extends F-004 seed script)

Add 6 `Template` rows to `apps/api/prisma/seed.ts`:
- 3 for Business cardTypeId: Modern, Minimal, Premium
- 3 for College cardTypeId: Academic, Modern, Creative

---

## Backend Requirements (`apps/api`)

### Endpoints

- `GET /templates?cardType=:slug` — Public template listing for card type
- `POST /admin/templates` — Admin create template metadata
- `PUT /admin/templates/:id` — Admin update template metadata / sortOrder
- `DELETE /admin/templates/:id` — Soft-deactivate template if profiles exist

---

## Frontend Requirements (`apps/web` & `packages/shared`)

### Files to CREATE

| File | Purpose |
|---|---|
| `packages/shared/src/templates/business/BusinessModern.tsx` | Business — Modern template |
| `packages/shared/src/templates/business/BusinessMinimal.tsx` | Business — Minimal template |
| `packages/shared/src/templates/business/BusinessPremium.tsx` | Business — Premium template |
| `packages/shared/src/templates/college/CollegeAcademic.tsx` | College — Academic template |
| `packages/shared/src/templates/college/CollegeModern.tsx` | College — Modern template |
| `packages/shared/src/templates/college/CollegeCreative.tsx` | College — Creative template |
| `packages/shared/src/templates/index.ts` | Registry: `{ slug → Component }` map |
| `packages/shared/src/types/template.ts` | `TemplateProps` interface |
| `apps/web/app/portal/templates/page.tsx` | Next.js portal page for template picker |
| `apps/web/components/portal/TemplatePicker.tsx` | Gallery UI: templates for customer's card type |
| `apps/web/components/portal/TemplatePreview.tsx` | Full-screen preview of a template |
| `apps/web/app/admin/templates/page.tsx` | Admin template management page |

---

## Acceptance Criteria

- [ ] `GET /templates?cardType=business` returns 3 active Business templates
- [ ] Template picker in Next.js portal shows correct templates for the customer's card type
- [ ] Customer can preview a template with their real data before committing
- [ ] Selecting a template and saving updates `Profile.templateId` and triggers `revalidateTag`
- [ ] All 6 template components render gracefully when fields are null
- [ ] All 6 templates are mobile-responsive at 375px
- [ ] Template components are React Server Components compatible
- [ ] Admin can activate/deactivate templates and set sort order

---

## Implementation Tasks

- [ ] **T-009-1:** Create `packages/shared/src/types/template.ts` with `TemplateProps` interface
- [ ] **T-009-2:** Add `sortOrder` field to `Template` model in schema; run migration
- [ ] **T-009-3:** Update seed script with 6 template rows
- [ ] **T-009-4:** Create 6 template React components in `packages/shared/src/templates/`
- [ ] **T-009-5:** Create `packages/shared/src/templates/index.ts` registry
- [ ] **T-009-6:** Create `src/routes/templates.ts` in `apps/api`
- [ ] **T-009-7:** Create `src/routes/admin/templates.ts` in `apps/api`
- [ ] **T-009-8:** Create Next.js App Router template picker page in `apps/web`
- [ ] **T-009-9:** Update `.agents/features.md` on completion
