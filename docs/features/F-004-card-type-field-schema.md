# F-004 — Card Type & Field Schema Management

**ID:** F-004  
**Priority:** 🔴 Critical  
**Phase:** 2  
**Status:** ⚠️ PARTIAL (model exists; no seed data, no API, no UI)  
**Depends on:** F-001, F-002  
**Required by:** F-005, F-007, F-008, F-009, F-010, F-011

---

## Purpose

Implement the config-driven card type system: seed the Business and College card types with their complete field schemas, expose admin CRUD endpoints for managing card types, and establish the field schema as the single source of truth for onboarding forms, profile editors, and public templates.

## User Story

**Admin:**  
_As a super admin, I want to create and manage card types with their field schemas from the admin portal — so that adding a new vertical (e.g. Doctor) requires only a config change, not a code change._

**System:**  
_As the platform, I need Business and College card types to exist with correct field schemas and defaultVisible flags — so that profile onboarding, form rendering, and visibility defaults work correctly out of the box._

---

## PRD Requirements Covered

- **§7.1** — Config-driven approach: `CardType.fieldSchema` as the source of truth
- **§7.2** — Business Card and College/Student Card field definitions (MVP verticals)
- **§16** — `defaultVisible` flags per field: identifier fields default hidden, contact fields default visible
- **§22** — `GET /admin/card-types`, `POST /admin/card-types`, `PUT /admin/card-types/:id`
- **§19** — Admin template management scoped to card types
- **skills.md** — Config-Driven Field Schema pattern; New Card Type Rollout workflow

---

## What Is Already Implemented

| Item                                                                                | Status   |
| ----------------------------------------------------------------------------------- | -------- |
| `CardType` model in schema (id, name, slug, description, fieldSchema JSONB, status) | ✅ REUSE |
| `CardType.slug` unique index                                                        | ✅ REUSE |
| FK relations to `NFCCard`, `Template`, `Profile`                                    | ✅ REUSE |

---

## Gaps & Missing Items

- ❌ No seed data — Business and College CardType rows do not exist
- ❌ No admin API endpoints for card type management
- ❌ No admin UI for card type management
- ❌ No shared type definitions for the fieldSchema shape
- ❌ No validation of fieldSchema structure on write

---

## Business Rules

1. **Card types are config, not code.** (rules.md #5) Never create a new database table per vertical.
2. **A `CardType.slug` is permanent** once cards exist for that type. It is used as the URL segment in `/p/:type/:token` and as the identifier in template queries.
3. **`fieldSchema` is an ordered array** — the order determines the form field order in onboarding and profile editor.
4. **`defaultVisible` on each field determines what renders on the public page** when the customer hasn't explicitly toggled a field. Contact fields default `true`; identifier/address fields default `false`.
5. **Supported field types** (architecture.md §6): `text`, `long_text`, `image`, `phone`, `email`, `url`, `address`, `list_of_strings`, `select`.
6. **A `CardType` with `status = "INACTIVE"` does not appear** in card generation or customer flows, but existing cards/profiles of that type are unaffected.
7. **MVP verticals are Business and College only** (PRD §26). Doctor, Employee, Freelancer are post-MVP.

---

## Field Schema Type Definition

The following TypeScript type must live in `packages/shared/src/` and be imported by both `apps/api` and `apps/web`:

```typescript
// packages/shared/src/types/fieldSchema.ts

export type FieldType =
  | 'text'
  | 'long_text'
  | 'image'
  | 'phone'
  | 'email'
  | 'url'
  | 'address'
  | 'list_of_strings'
  | 'select';

export interface FieldSchemaItem {
  key: string; // unique key within the CardType, used as key in Profile.data
  label: string; // display label shown in forms and public templates
  type: FieldType;
  required: boolean; // whether the field must be filled in onboarding
  defaultVisible: boolean; // PRD §16 — initial value for Profile.fieldVisibility[key]
  placeholder?: string; // optional hint text for form inputs
  options?: string[]; // only for type = 'select'
  helpText?: string; // optional additional guidance
}

export type FieldSchema = FieldSchemaItem[];
```

---

## Business Card Field Schema (MVP Seed Data)

Slug: `business`

| Key           | Label               | Type              | Required | Default Visible |
| ------------- | ------------------- | ----------------- | -------- | --------------- |
| `photo`       | Profile Photo       | `image`           | false    | true            |
| `name`        | Full Name           | `text`            | **true** | true            |
| `designation` | Designation / Title | `text`            | false    | true            |
| `company`     | Company Name        | `text`            | false    | true            |
| `bio`         | About / Bio         | `long_text`       | false    | true            |
| `phone`       | Phone Number        | `phone`           | false    | true            |
| `whatsapp`    | WhatsApp            | `phone`           | false    | true            |
| `email`       | Email Address       | `email`           | false    | true            |
| `website`     | Website             | `url`             | false    | true            |
| `instagram`   | Instagram           | `url`             | false    | true            |
| `linkedin`    | LinkedIn            | `url`             | false    | true            |
| `facebook`    | Facebook            | `url`             | false    | true            |
| `youtube`     | YouTube             | `url`             | false    | true            |
| `address`     | Address             | `address`         | false    | **false**       |
| `google_maps` | Google Maps Link    | `url`             | false    | true            |
| `services`    | Services Offered    | `list_of_strings` | false    | true            |

---

## College / Student Card Field Schema (MVP Seed Data)

Slug: `college`

| Key             | Label                   | Type              | Required | Default Visible              |
| --------------- | ----------------------- | ----------------- | -------- | ---------------------------- |
| `photo`         | Profile Photo           | `image`           | false    | true                         |
| `name`          | Full Name               | `text`            | **true** | true                         |
| `college`       | College / University    | `text`            | false    | true                         |
| `course`        | Course / Degree         | `text`            | false    | true                         |
| `branch`        | Branch / Specialization | `text`            | false    | true                         |
| `semester`      | Semester / Year         | `text`            | false    | true                         |
| `student_id`    | Student ID              | `text`            | false    | **false** ← identifier field |
| `student_email` | College Email           | `email`           | false    | true                         |
| `phone`         | Phone Number            | `phone`           | false    | true                         |
| `linkedin`      | LinkedIn                | `url`             | false    | true                         |
| `portfolio`     | Portfolio URL           | `url`             | false    | true                         |
| `skills`        | Skills                  | `list_of_strings` | false    | true                         |
| `achievements`  | Achievements            | `list_of_strings` | false    | true                         |
| `about`         | About / Bio             | `long_text`       | false    | true                         |

---

## Database Requirements

No new models needed. Seed data is applied via `prisma/seed.ts`.

### CREATE — Seed script `apps/api/prisma/seed.ts`

Seeds:

1. Business `CardType` row with full `fieldSchema`
2. College `CardType` row with full `fieldSchema`
3. Placeholder `Template` rows for both (actual template components are built in F-009; seed creates the DB rows with `isActive = false` until templates are complete)

---

## Backend Requirements

### Files to CREATE

| File                              | Purpose                                 |
| --------------------------------- | --------------------------------------- |
| `src/routes/admin/cardTypes.ts`   | Admin card-type CRUD routes             |
| `src/services/cardTypeService.ts` | Business logic for card type operations |

### API Endpoints

#### `GET /admin/card-types`

- **Auth required:** Admin
- **Logic:** return all `CardType` rows (including fieldSchema), ordered by `createdAt`
- **Response:** `200 { cardTypes: CardType[] }`

#### `POST /admin/card-types`

- **Auth required:** Admin
- **Input:** `{ name, slug, description?, fieldSchema: FieldSchemaItem[] }`
- **Validation:** slug must be unique, lowercase, alphanumeric + hyphens only; fieldSchema must be a valid array of `FieldSchemaItem` objects with unique keys; at least one field required
- **Logic:** validate → create `CardType` with `status = "ACTIVE"`
- **Response:** `201 { cardType: CardType }`

#### `PUT /admin/card-types/:id`

- **Auth required:** Admin
- **Input:** `{ name?, description?, fieldSchema?, status? }`
- **Validation:** if `fieldSchema` is updated, validate same rules as POST; if cards already exist for this type, adding/removing required fields is a breaking change — warn in response but allow (admin decision)
- **Logic:** validate → update `CardType`
- **Response:** `200 { cardType: CardType }`

---

## Frontend Requirements

### Files to CREATE

| File                                            | Purpose                                                                                            |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `src/admin/CardTypeManagement/CardTypeList.tsx` | Table of all card types with status, field count, action buttons                                   |
| `src/admin/CardTypeManagement/CardTypeForm.tsx` | Create/edit form with dynamic field schema builder (add/remove/reorder fields, set defaultVisible) |
| `src/shared/api/cardTypes.ts`                   | `listCardTypes()`, `createCardType()`, `updateCardType()` API calls                                |

### `packages/shared/src/types/fieldSchema.ts`

- **CREATE** — type definitions shared across web and api (see Field Schema Type Definition above)

---

## Validation & Error Cases

| Case                                    | Behavior                                                                          |
| --------------------------------------- | --------------------------------------------------------------------------------- |
| Duplicate slug                          | `409 { error: { code: "SLUG_EXISTS" } }`                                          |
| Invalid slug format                     | `400 { error: { code: "INVALID_SLUG" } }`                                         |
| Invalid fieldSchema (unknown type)      | `400 { error: { code: "INVALID_FIELD_TYPE", field: "..." } }`                     |
| Duplicate field keys within schema      | `400 { error: { code: "DUPLICATE_FIELD_KEY" } }`                                  |
| CardType not found                      | `404 { error: { code: "NOT_FOUND" } }`                                            |
| Deactivating CardType with active cards | Allow but warn: `200 { cardType, warning: "N active cards exist for this type" }` |

---

## Acceptance Criteria

- [ ] `db:seed` runs without error and creates Business + College `CardType` rows
- [ ] Business CardType has `slug = "business"`, 16 fields, `address` defaultVisible = false
- [ ] College CardType has `slug = "college"`, 14 fields, `student_id` defaultVisible = false
- [ ] All other contact/social fields in both types have `defaultVisible = true`
- [ ] `GET /admin/card-types` (admin auth) returns both seeded types with full fieldSchema
- [ ] `POST /admin/card-types` creates a new card type with valid input
- [ ] `POST /admin/card-types` rejects duplicate slug with 409
- [ ] `PUT /admin/card-types/:id` updates name, description, and fieldSchema
- [ ] `FieldSchemaItem` TypeScript type is exported from `packages/shared`
- [ ] Admin UI lists card types and allows create/edit
- [ ] Field schema builder allows adding, removing, and reordering fields with type and visibility settings

---

## Implementation Tasks

- [ ] **T-004-1:** Create `packages/shared/src/types/fieldSchema.ts` with `FieldType`, `FieldSchemaItem`, `FieldSchema` types
- [ ] **T-004-2:** Create `apps/api/prisma/seed.ts` with Business CardType seed
- [ ] **T-004-3:** Add College CardType to seed script
- [ ] **T-004-4:** Run `npm run db:seed` to verify seed works
- [ ] **T-004-5:** Create `src/services/cardTypeService.ts`
- [ ] **T-004-6:** Create `src/routes/admin/cardTypes.ts` with all 3 endpoints
- [ ] **T-004-7:** Mount card-type routes in `app.ts` under `/admin/card-types`
- [ ] **T-004-8:** Create `src/admin/CardTypeManagement/CardTypeList.tsx`
- [ ] **T-004-9:** Create `src/admin/CardTypeManagement/CardTypeForm.tsx`
- [ ] **T-004-10:** Create `src/shared/api/cardTypes.ts`
- [ ] **T-004-11:** Update `.agents/features.md` on completion
