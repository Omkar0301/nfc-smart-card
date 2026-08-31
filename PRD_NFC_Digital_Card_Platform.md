# NFC Digital Card Platform — Product Requirements Document (v2)

**Status:** Approved for planning. Implementation not yet started.
**Stack (fixed):** Next.js (frontend) · Node.js (backend) · PostgreSQL (database)

---

## Changelog — v1 → v2

This version keeps every v1 decision that was sound and changes the handful of things that would have caused real pain at scale. Nothing below changes the core product idea (permanent card → mutable backend record) or the fixed stack.

| # | Area | v1 | v2 | Why |
|---|------|----|----|-----|
| 1 | Card type data model | One database table per card type (`BusinessProfile`, `CollegeProfile`, …) | One shared `Profile` table + a `fieldSchema` config per `CardType` | Adding a vertical was a code change + migration; now it's a config change. See §7, §21. |
| 2 | Multi-tenancy | Not modeled; "Multi-company enterprise hierarchy" listed as Non-Goal | Lightweight `Organization` entity added to the schema now (no UI yet) | Employee/College cards are naturally bought and managed in bulk by an org. Adding this later would be a breaking migration. See §6, §21, §28. |
| 3 | Card lifecycle | `AVAILABLE → ASSIGNED → ACTIVE → SUSPENDED → DEACTIVATED` | Adds `PAUSED`, a customer-controlled, instantly reversible state, distinct from admin-controlled `SUSPENDED` | Closes the "lost card stays live and public" exposure window without waiting on support. See §8, §17. |
| 4 | Account recovery | Not specified | Explicit recovery flow when a customer loses access to their OTP phone number | Phone-only auth risks permanently locking someone out of editing a card they still own. See §10. |
| 5 | Field visibility defaults | Not specified (customer opts fields in/out) | Identifier-like fields (Student ID, Employee ID, home address) default **hidden**; contact fields default **visible** | Safer default given anyone with the URL can view the page. See §16. |
| 6 | Bulk card generation | Implied synchronous | Explicit background job (queued, resumable, idempotent) | Generating thousands of unique tokens shouldn't block an HTTP request or fail all-or-nothing. See §9. |
| 7 | Public profile rendering | Not specified | Server-rendered for the public profile route specifically (fast first paint, working Open Graph tags), client-rendered SPA everywhere else | The one place SEO/share-preview and mobile load speed actually matter. See §14, §25. |
| 8 | Analytics integrity | Raw event log only | Adds bot/crawler filtering and a visit-dedup window | Prevents customer-facing scan counts from being inflated by crawlers and repeat taps. See §20. |
| 9 | Employee Card | Included in initial four verticals with individual self-serve onboarding | Marked explicitly as **blocked on Organization bulk-assign** before real productization; usable stand-alone only for pilots | Companies don't want employees self-registering with personal OTP outside HR control. See §7.3, §28. |
| 10 | Development order | 9 stages, includes vertical-by-vertical rebuilds | Restructured around the config-driven model so new verticals are Stage 9 config work, not Stage 3-style rebuilds | See §27. |

Everything else — token security, QR fallback, template-per-vertical UX, admin lifecycle controls, `.vcf` save-contact, analytics event types — is carried over from v1 essentially unchanged.

---

## 1. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Next.js (App Router) | Customer Portal + Admin Portal + Public Profile SSR (`/p/[type]/[token]`). See §14, §25. |
| Backend | Node.js (Express) | REST API. Also owns the server-rendered public profile route. |
| Database | PostgreSQL | Including JSONB columns for the config-driven profile/field-schema model (§21). |
| ORM | Prisma | Chosen for migration tooling and TypeScript types shared with the frontend. Full rationale in `.agents/architecture.md`. |
| Background jobs | Postgres-backed queue (no new infra) | Bulk card generation, CSV export, image processing. Rationale in `.agents/architecture.md`. |
| File storage | S3-compatible object storage | Profile photos and template thumbnails; only the key/URL is stored in Postgres. |

This stack is fixed for the project. Any deviation (e.g., adding Redis, swapping the ORM, adding a second frontend framework) requires an explicit, written technical justification before it's adopted — see `.agents/rules.md`.

---

## 2. Product Overview

The product is an NFC-enabled digital card platform. Physical NFC cards contain a unique, permanent URL. Tapping the card opens that URL; the backend identifies the card by its token and renders the profile currently assigned to it.

The platform supports multiple **separate card products** (Business, College/Student, Doctor, Employee, Freelancer, and others added later). Each card product has its own onboarding flow, profile fields, portal experience, public profile layout, and template library — but all card products share the same underlying NFC, auth, inventory, assignment, and admin infrastructure.

---

## 3. Core Product Concept & Principle

The physical card stores only a URL — never customer data. Example:

```
https://yourdomain.com/b/8xK29Lm92Pq
```

Flow:

```
Physical NFC Card → Stored URL → Public Website → Backend resolves token
   → Find Card → Find Assigned Customer → Find Profile → Load Template → Render Page
```

**The one rule that governs every other decision in this document:**

```
NFC Card        =  Permanent Unique Identifier (dumb, physical, never rewritten)
Customer Data   =  Stored in Backend (mutable, current)
```

Because of this, updating a profile, switching a template, or even replacing a lost card never requires reprogramming a physical chip. If a design choice anywhere in this document would violate that separation, the design choice is wrong, not the rule.

If a card hasn't been claimed yet, the visitor is routed to the activation flow (§11) instead of a profile.

---

## 4. Goals

1. Generate large batches of unique NFC card identifiers.
2. Export card data for the NFC manufacturer.
3. Program the generated URLs into physical NFC cards.
4. Let customers activate their cards and claim them after authentication.
5. Let customers create and manage profile information, per card type.
6. Support multiple card products with independent onboarding, fields, and templates.
7. Serve fast, mobile-first public profile pages.
8. Let profile data and design change freely without ever touching the physical card.
9. Give admins full inventory, customer, and lifecycle management.
10. Support card replacement, pause, suspension, and deactivation.
11. Provide scan/profile analytics that admins and customers can both trust.
12. Let a customer recover account access without permanently losing control of their card. **(new in v2)**
13. Let a customer instantly hide a lost/stolen card's public page without waiting on support. **(new in v2)**

---

## 5. Non-Goals for MVP

Not in the first version unless explicitly required:

- Drag-and-drop visual template builder
- Custom domain per customer
- Subscription/billing system
- Marketplace for templates
- Native Android/iOS apps
- AI profile generation
- Full multi-company enterprise hierarchy (org admin UI, seat management, SSO)
- Wallet passes
- Advanced CRM / marketing automation

**Note (v2):** the *data model* for organizations is included now (§21) even though the *UI* for org management is not. This is a schema decision, not a scope expansion — it costs nothing to build now and avoids a breaking migration when Employee/College bulk-issuance becomes real (§28).

---

## 6. User Roles

### 6.1 Super Admin
Manage card types & field schemas, generate cards, view inventory, export card data, manage customers, manage templates, control card lifecycle, view analytics, manage platform configuration.

### 6.2 Customer
Activate a card, create/edit a profile, choose and switch templates, preview and publish, view card info and analytics, pause/report-lost/request-replacement for their own card.

### 6.3 Public Visitor
No account required. View public profile, call/WhatsApp/email the customer, open social/website links, save contact (`.vcf`).

### 6.4 Organization Admin *(schema reserved, no UI in MVP)*
Future role scoped to a company's card pool: bulk-assign cards to employees, revoke on offboarding, set default branding. Not built in MVP; see §21 and §28.

---

## 7. Card Types & Field Schema Model

### 7.1 The config-driven approach (v2 change)

In v1, each card type had a hardcoded database table (`BusinessProfile`, `CollegeProfile`, …). That means every new vertical is a migration, a new set of CRUD endpoints, a new form component, and a new validation path — and every cross-cutting change (e.g. "add a visibility toggle to every field") has to be repeated per table.

**v2 instead defines a `CardType` with a `fieldSchema`**: a config-level list of fields (key, label, field type, required, default visibility). Onboarding forms, profile editors, and public templates are all driven by this schema instead of by per-vertical code. Adding "Freelancer" or "Creator" later means inserting a `CardType` row and three templates — not writing a new table and new endpoints.

The schema only needs to support a small set of field types to cover every vertical below:

`text`, `long_text`, `image`, `phone`, `email`, `url`, `address`, `list_of_strings` (skills/achievements), `select`.

### 7.2 Initial verticals (MVP: Business + College only, per §26)

**Business Card** — photo, name, designation, company, bio, phone, WhatsApp, email, website, Instagram, LinkedIn, Facebook, YouTube, address, Google Maps link, services.
*Future fields:* products, business hours, portfolio, booking URL, custom CTA.

**College / Student Card** — photo, name, college, course, branch, semester, student ID *(hidden by default)*, student email, phone, LinkedIn, portfolio, skills, achievements, about.

### 7.3 Verticals staged for post-MVP

**Doctor Card** — photo, name, specialization, qualification, clinic/hospital, experience, phone, WhatsApp, email, appointment URL, address, Google Maps, working hours, about.

**Employee Card** *(blocked, see below)* — photo, name, employee ID *(hidden by default)*, designation, department, company, email, phone, office location, LinkedIn, about.

> **v2 flag:** Employee Card, as specified, assumes an individual self-registers with personal OTP. Real-world buyers of employee cards are HR/IT departments who want to bulk-issue cards, control branding, and revoke access on offboarding — none of which exists until the Organization Admin role (§6.4) ships. Treat Employee Card in MVP+1 as an **individual-pilot product only**; don't market it as an enterprise product until bulk-assign and revoke exist.

**Freelancer Card** — similar shape to Business Card; genuinely single-consumer, a better "vertical #3" than Employee if you want to prove the config-driven model works for a new type without also needing Organization features.

---

## 8. NFC Card Lifecycle

```
AVAILABLE → ASSIGNED → ACTIVE ⇄ PAUSED
                           ↓        ↓
                       SUSPENDED (admin)
                           ↓
                     DEACTIVATED (permanent)
```

| Status | Meaning | Who can set it | Reversible? |
|---|---|---|---|
| `AVAILABLE` | Generated, unclaimed | System (on generation) | — |
| `ASSIGNED` | Claimed, profile not yet published | System (on claim) | — |
| `ACTIVE` | Public profile is live | System (on publish) / Customer (resume) | Yes → `PAUSED` |
| `PAUSED` **(new)** | Customer-initiated, instant, public page hidden, account and profile untouched | Customer | Yes → `ACTIVE` |
| `SUSPENDED` | Admin-initiated hold (policy, dispute, investigation) | Admin only | Yes → `ACTIVE`, admin only |
| `DEACTIVATED` | Permanent — lost/replaced card, terminated relationship | Admin | No |

`PAUSED` exists specifically so a customer who loses a card can kill the public page in one tap, without a support ticket and without going through full card replacement. `SUSPENDED` stays admin-only and is for platform-side reasons, not customer self-service.

---

## 9. Card Generation & Manufacturer Workflow

Admin selects a card type and quantity (e.g. 1,000 Business cards). **v2 change:** this runs as a background job, not a synchronous request:

```
Admin submits generation request
   → Job enqueued (card type, quantity, requested by, batch id)
   → Worker generates unique (cardNumber, publicToken) pairs, retries on collision
   → Job is resumable: a failure partway through does not require restarting from zero
   → Job completes → cards inserted as AVAILABLE → admin notified
```

Each card record: internal ID, human-readable card number (`BC-000001`), secure public token, card type, status, batch ID, timestamps.

Admin exports CSV/Excel for the manufacturer: Card Number, Card Type, NFC URL, Status. The manufacturer programs the corresponding URL into each physical card's NDEF record.

**Defective batch handling (new in v2):** admin can bulk-invalidate a batch of still-`AVAILABLE` cards (e.g. a QC-rejected print run) without affecting any `ASSIGNED`/`ACTIVE` card, and regenerate a replacement batch under a new batch ID.

**Token requirements (unchanged from v1):** cryptographically random, sufficiently long, never sequential or guessable (`/b/1`, `/b/2` are explicitly disallowed).

---

## 10. Customer Authentication & Account Recovery

### 10.1 Primary auth: Mobile OTP

```
Activate Card → Enter Mobile Number → Send OTP → Verify OTP → Create/Login Account → Claim Card
```

An unauthenticated visitor can never claim a card.

### 10.2 Account recovery (new in v2)

The platform's core promise is "change your data anytime without touching the card." That's only true if the customer can always get back into their account. Phone-only OTP breaks this the moment a number changes — common enough (especially for students) that it needs a designed path, not a support-ticket workaround:

- A secondary recovery contact (email) is collected at profile creation, optional but strongly prompted.
- If OTP to the registered number fails, the customer can request recovery via the secondary email, or fall back to an admin-assisted identity check (manual, MVP-acceptable volume).
- A successful recovery re-links the existing profile and existing card assignment — it does not create a new customer record or touch the physical card.

---

## 11. Card Claiming (Activation)

```
Check card exists → Check status = AVAILABLE → Check customer authenticated
   → Assign card to customer (transactional, row-locked) → Update status → ASSIGNED
   → Create assignment record → Initialize empty profile
```

The claim operation must be transactional and locked so two people tapping the same unclaimed card at the same moment cannot both succeed (implementation detail in `.agents/architecture.md`).

---

## 12. Profile Onboarding

The onboarding form shown to the customer is generated from the claimed card's `CardType.fieldSchema` (§7.1) — there is one onboarding *component*, not one per vertical. After submitting required fields, the customer chooses a template (§13) scoped to that card type.

---

## 13. Template System

Every card type has its own template library; a Business customer only ever sees Business templates, a College customer only ever sees College templates.

```
business/  → Modern · Minimal · Premium
college/   → Academic · Modern · Creative
```

Each template defines layout, typography, colors, photo/name placement, CTA style, section order, social icon style, responsive behavior, and (optionally) light animation — and must render correctly with any subset of fields hidden (§16), since visibility is per-customer. Mobile-first, since NFC scans happen on phones. No visual template builder in MVP (§5) — templates are hand-built frontend components that read the field schema + profile data.

Customer can preview before publishing.

---

## 14. Public Profile Pages

Permanent per card:

```
https://yourdomain.com/b/8xK29Lm92Pq
```

Changing phone, photo, company, socials, or template never changes this URL, and the physical card is never rewritten.

**Rendering (updated in v2):** this specific route is server-rendered via Next.js App Router Server Components (`app/p/[type]/[token]/page.tsx`) so that:
- first paint is fast on mobile networks right after a tap, and
- Open Graph / meta tags are present via `generateMetadata()` for link previews (§25).

Everywhere else in the product (Customer Portal, Admin Portal) is rendered using Next.js App Router routes.

---

## 15. Customer Portal

`Dashboard · My Profile · My Card · Templates · Preview · Analytics · Settings`

Customer can: edit profile, change photo, update contact/social/bio fields, update vertical-specific fields, change template, preview, publish/unpublish where supported, and (new) pause/resume their card from the same screen as card info.

---

## 16. Profile Visibility & Data Control

Each field can be toggled public/hidden by the customer. **v2 default policy:** contact fields (phone, email, WhatsApp, social links) default **visible**; identifier-like or address-like fields (Student ID, Employee ID, home address) default **hidden**, requiring an explicit opt-in. Only fields marked public render on the public page.

---

## 17. Card Management (Customer-Facing)

```
My NFC Card
Card Number: BC-000001
Status: ACTIVE
Public URL: yourdomain.com/b/8xK29Lm92Pq

[View profile] [Copy URL] [View QR] [Pause card] [Report lost] [Request replacement]
```

**Pause (new in v2):** instantly sets status to `PAUSED` (§8) — the public page immediately shows "unavailable," the profile and account are untouched, and the customer can resume just as instantly. This is the fast path; **Report lost / Request replacement** remains the permanent path (deactivate old card, issue and assign a new one, profile carries over unchanged — unchanged from v1).

---

## 18. QR Code & Save Contact

Every card also gets a QR code encoding the same public URL, for visitors without NFC-capable phones or with NFC disabled — NFC and QR always resolve to the identical profile.

Public profiles support **Save Contact**, generating a `.vcf` from the customer's currently *public* fields only (name, company, designation, phone, email, website).

---

## 19. Admin Portal

**Dashboard:** total/available/assigned/active/paused/suspended/deactivated cards, total customers, total views, total scans — filterable by card type.

**Card management:** search, filter by type/status, view card + assigned customer, assign, suspend, deactivate, replace, export. Bulk generation status (job progress, not blocking) is visible here too (§9).

**Template management:** create, upload preview, assign to card type, activate/deactivate, mark free/premium, set order, update configuration.

---

## 20. Analytics

**Events captured:** `SCAN`, `PROFILE_VIEW`, `PHONE_CLICK`, `WHATSAPP_CLICK`, `EMAIL_CLICK`, `INSTAGRAM_CLICK`, `LINKEDIN_CLICK`, `WEBSITE_CLICK`, `SAVE_CONTACT`.

Customer dashboard shows views (today/week/month/total) and button-click breakdowns; admin dashboard aggregates across the platform and per card type.

**v2 additions:**
- **Bot/crawler filtering** — events from known crawler user agents are flagged (`isBot`) at write time and excluded from customer-facing counts, so numbers aren't inflated by link-preview fetchers.
- **Dedup window** — repeated scans from the same visitor within a short window count as one `PROFILE_VIEW`, not one per tap.

**Privacy (unchanged from v1):** collect only what's needed for aggregate analytics; never expose visitor personal information to customers; design with applicable privacy requirements in mind.

---

## 21. Backend Data Model

Conceptual model (exact Prisma schema lives in `.agents/architecture.md` — not duplicated here to avoid the two documents drifting apart).

- **User** — id, name, email, phone, role, status, timestamps.
- **Organization** *(new, schema-only in MVP)* — id, name, status, timestamps. Nullable owner of a pool of cards; unused by any UI until post-MVP org features ship.
- **CardType** — id, name, slug, description, **fieldSchema (JSON, new)**, status, timestamps.
- **NFCCard** — id, cardNumber, publicToken, cardTypeId, **organizationId (nullable, new)**, status, batchId, timestamps.
- **CardAssignment** — id, cardId, userId, assignedAt, unassignedAt, status, timestamps. Doubles as assignment history (unchanged from v1).
- **Template** — id, cardTypeId, name, slug, thumbnail, isActive, isPremium, configuration, timestamps.
- **Profile** *(replaces `BusinessProfile`/`CollegeProfile`/… — new in v2)* — id, userId, cardTypeId, templateId, **data (JSONB)**, **fieldVisibility (JSONB)**, status (draft/published), timestamps.
- **ProfileEvent** — id, cardId, profileId, eventType, timestamp, metadata, **isBot (boolean, new)**.

One `Profile` table serves every card type; `data` holds field values keyed by the owning `CardType.fieldSchema`, and `fieldVisibility` holds the per-field public/hidden override (§16).

---

## 22. API Structure

```
Auth
POST /auth/send-otp
POST /auth/verify-otp
POST /auth/recover              (new — account recovery, §10.2)
POST /auth/logout
GET  /auth/me

Admin — Cards
POST /admin/cards/generate      (enqueues background job, §9)
GET  /admin/cards
GET  /admin/cards/:id
POST /admin/cards/:id/assign
POST /admin/cards/:id/activate
POST /admin/cards/:id/suspend
POST /admin/cards/:id/deactivate
POST /admin/cards/:id/replace
GET  /admin/cards/export
GET  /admin/jobs/:id             (new — bulk-generation job status)

Admin — Card Types
GET  /admin/card-types
POST /admin/card-types           (new — includes fieldSchema)
PUT  /admin/card-types/:id

Card Activation
GET  /cards/:token
POST /cards/:token/claim

Profile (generic — replaces per-vertical /business/profile, /college/profile)
GET  /profile
POST /profile
PUT  /profile
POST /profile/pause              (new)
POST /profile/resume             (new)

Templates
GET  /templates?cardType=:slug

Public Profile (server-rendered, §14)
GET  /p/:type/:token
```

---

## 23. Error Scenarios

| Case | Behavior |
|---|---|
| Invalid token | "Card not found." |
| `AVAILABLE` (unclaimed) | "Card not activated." + Activate CTA |
| `PAUSED` **(new)** | "This card is currently unavailable." (customer-facing message, distinct from suspended) |
| `SUSPENDED` | "This card is temporarily unavailable." |
| `DEACTIVATED` | "This card is no longer active." |
| Incomplete profile | Route to setup screen |
| Deleted customer/profile | Never expose stale private data |

---

## 24. Security Requirements

1. Public tokens random and non-guessable; never sequential.
2. Authentication required before claiming a card.
3. Card claiming is transactional and race-condition-safe.
4. One `AVAILABLE` card cannot be claimed by two users.
5. Customer APIs only touch the authenticated customer's own data.
6. Admin APIs require admin authorization.
7. Sensitive fields never public unless explicitly enabled (§16) — **enforced server-side**, not just hidden in the client.
8. File uploads validated (type, size).
9. Rate-limit OTP endpoints and public endpoints.
10. No plaintext password storage if password auth is ever added.
11. No unnecessary exposure of internal database IDs.
12. `DEACTIVATED`/`PAUSED`/`SUSPENDED` cards never continue to serve private profile data.
13. **(new)** Account recovery flow must itself be rate-limited and auditable — it's a second path into an account and needs the same scrutiny as OTP.

---

## 25. Non-Functional Requirements

**Performance/mobile:** fast load, responsive layout, large CTA buttons, readable typography, optimized images, good performance on mobile networks. Public profile route benefits from HTTP cache headers + CDN caching, invalidated on profile save (detail in `.agents/architecture.md`).

**SEO:** dynamic title, meta description, Open Graph image, social sharing metadata; no-index option for profiles that shouldn't be indexed. Reliable Open Graph rendering is the main reason §14 server-renders this one route.

**Accessibility:** public profile pages should meet basic WCAG contrast/tap-target guidelines given they're consumer-facing at platform scale.

---

## 26. MVP Scope & Success Criteria

**MVP verticals:** Business Card and College/Student Card only, 3 templates each. Doctor, Freelancer, Employee (pilot-only, see §7.3), and further verticals come after the architecture is proven — and now, thanks to §7.1, adding them is materially cheaper than it was in v1.

**Success criteria (v1 list retained, additions marked):**
- Admin can generate 1,000+ cards in bulk without blocking the request (§9).
- Every card has a unique, secure token.
- Admin can export card URLs for the manufacturer.
- A customer can scan an unassigned card and activate it.
- A card can only be claimed by an authenticated customer, race-condition-safe.
- Business and College cards have fully separate onboarding, fields, and templates — driven by config, not by separate codepaths (§7.1).
- Customer can create/edit a profile; public page reflects it correctly.
- Updating data or switching templates never touches the physical card.
- Admin can manage the full card lifecycle including `PAUSED` (new).
- Lost/replaced cards can be deactivated and replaced without profile loss.
- **(new)** Customer can pause a lost card instantly without admin involvement.
- **(new)** Customer can recover account access without permanent lockout if their phone number changes.
- Public pages are mobile-responsive and fast.
- Scan/profile analytics work reliably and aren't inflated by bots or repeat taps (new).

---

## 27. Recommended Development Order

Restructured from v1's per-vertical stages to reflect the config-driven model — see the full phase-by-phase implementation plan (with files/modules and `.agents` update points) delivered alongside this document.

1. Core data model & auth (incl. `Organization` placeholder, `CardType.fieldSchema`)
2. Admin card generation (background job) + inventory management
3. Card activation & claiming (server-rendered public route from the start)
4. Config-driven profile onboarding + Business & College field schemas
5. Template system + public profile rendering
6. Customer Portal (profile edit, template switch, preview, card mgmt, QR, save-contact)
7. Card lifecycle ops: pause, suspend, replace, lost-card, account recovery
8. Analytics (event capture, bot filtering, dashboards)
9. Hardening: rate limiting, image validation, SEO/OG, caching, mobile pass
10. *(post-MVP)* Additional verticals as config; Organization bulk-assign UI

---

## 28. Future Roadmap (Post-MVP)

Subscription plans, premium templates, custom branding, **Organization admin UI + bulk employee cards** (prerequisite for real Employee Card productization, §7.3), custom profile domains/URLs, QR customization, advanced analytics, lead capture, appointment booking, product/service sections, portfolio, reviews, digital wallet cards, white-label platform, reseller accounts, bulk ordering, order/payment management.

---

## 29. Final Product Principle

```
LAYER 1   Physical NFC Card → Unique URL
LAYER 2   Backend → Card → Customer → Profile (config-driven) → Template
LAYER 3   Public Website → Rendered digital profile
```

The physical card stays simple and permanent. The backend owns the customer/card relationship and can evolve freely — new verticals, new fields, new lifecycle states — without ever requiring a card to be reprogrammed. This separation is what makes Business, College, Doctor, Employee, and future verticals scale on shared infrastructure while staying completely distinct products from the customer's point of view.
