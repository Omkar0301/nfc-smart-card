# Skills

Reusable, project-specific implementation patterns. Each entry is a capability the agent should recognize and apply consistently rather than re-deriving per task — the "how we do X here" for recurring problem shapes in this codebase. Load the relevant one when a task matches its trigger; don't load all of them for every task.

---

### Config-Driven Field Schema
**Trigger:** adding/editing a `CardType`, building an onboarding form, building the profile editor, building the public template renderer.
**Pattern:** every field-facing UI (onboarding form, profile editor, public page section) reads `CardType.fieldSchema` and renders one component per field `type` (`text`, `long_text`, `image`, `phone`, `email`, `url`, `address`, `list_of_strings`, `select`). Never write a form/renderer specific to one vertical — extend the shared field-type renderer instead. See [`/docs/ARCHITECTURE.md`](file:///d:/nfc-new/nfc-card-platform/docs/ARCHITECTURE.md).

### New Card Type Rollout
**Trigger:** "add a Doctor/Freelancer/Creator card type."
**Pattern:** (1) insert a `CardType` row with `slug` + `fieldSchema`, (2) seed 3 `Template` rows referencing that `cardTypeId`, (3) build the template visual React Server Components (layout/colors only — they still consume the shared field renderer), (4) no new database table, no new CRUD endpoints. If a step in this rollout seems to require a new table or a vertical-specific endpoint, stop and re-check against the Config-Driven Field Schema.

### Server-Rendered Public Profile (Next.js App Router)
**Trigger:** any change to the `/p/[type]/[token]` route or the template components it renders.
**Pattern:** this route is implemented as a Next.js React Server Component in `apps/web/app/p/[type]/[token]/page.tsx`, using `generateMetadata()` for dynamic Open Graph tags (`og:title`, `og:image`, `og:url`) and Twitter Cards. It reuses template components from `packages/shared/src/templates/`. Data fetching uses Next.js fetch cache with tags (`next: { tags: ['profile-${token}'] }`).

### Cache Invalidation on Profile Change (`revalidateTag`)
**Trigger:** any endpoint or action that changes what a public profile page renders — profile save, template switch, pause/resume, card status change, visibility toggle.
**Pattern:** after the database write succeeds in `apps/api`, trigger Next.js cache revalidation via `revalidateTag('profile-${token}')` (or revalidation API route/webhook). Do this in the same request handler as the write — a stale cached public page after a save is a visible bug.

### Bulk Card Generation Job
**Trigger:** generating a batch of cards, or touching the generation job.
**Pattern:** enqueue via pg-boss inside `apps/api` rather than generating synchronously in the request handler. The worker generates `(cardNumber, publicToken)` pairs, retries on unique-constraint collision, and is resumable — a batch that fails partway should be continuable, not restarted from zero. Tag every card with a `batchId` so a defective batch can be bulk-invalidated later without touching unrelated cards.

### Transactional Card Claim
**Trigger:** implementing or touching `/cards/:token/claim`.
**Pattern:** wrap the check-and-assign in a Prisma interactive transaction using a row lock, re-verify `status = AVAILABLE` *inside* the lock (not before acquiring it), then update status and create the `CardAssignment` in the same transaction. Never split the "check" and "assign" into separate round trips.

### Field-Level Visibility Enforcement
**Trigger:** any code path that builds a response the public visitor will see.
**Pattern:** filter `Profile.data` against `Profile.fieldVisibility` (falling back to `CardType.fieldSchema[].defaultVisible`) on the server before the response leaves the API layer. Never send the full `data` object to the client and hide fields in the frontend — that's a security bug.
