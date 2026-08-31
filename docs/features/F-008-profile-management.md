# F-008 — Config-Driven Profile Management

**ID:** F-008  
**Priority:** 🔴 Critical  
**Phase:** 5  
**Status:** ⚠️ PARTIAL (Profile model exists; no API, no form, no visibility enforcement)  
**Depends on:** F-007 (claim creates the Profile row), F-004 (fieldSchema)  
**Required by:** F-009, F-010, F-011, F-015, F-016

---

## Purpose

Implement the full profile lifecycle: create/read/update the customer's profile using the config-driven field schema, apply per-field visibility defaults from the `CardType.fieldSchema`, enforce field-level visibility on the server when building the public profile response, and transition the profile from draft to published status. One implementation covers all card types — there are no vertical-specific endpoints or forms.

## User Story

**Customer:**  
_As a customer who just claimed a card, I want to fill in my profile information using a form that shows the right fields for my card type — so I can publish my profile and let people view it when they tap my card._

_As a customer, I want to control which fields are public and which are hidden — so I don't expose my home address or student ID by default._

_As a customer, I want to edit my profile at any time after publishing — so I can keep my information current without touching my physical card._

---

## PRD Requirements Covered

- **§12** — Config-driven onboarding from `CardType.fieldSchema`; one onboarding component, not one per vertical
- **§15** — Customer portal profile editing
- **§16** — Per-field visibility toggle; identifier fields default hidden; contact fields default visible; **server-side enforcement**
- **§22** — `GET /profile`, `POST /profile`, `PUT /profile`
- **§8** — ASSIGNED → ACTIVE transition on first publish
- **§21** — Profile model: data (JSONB), fieldVisibility (JSONB), status (draft/published)
- **skills.md** — Config-Driven Field Schema; Field-Level Visibility Enforcement; Cache Invalidation on Profile Change

---

## What Is Already Implemented

| Item                                                    | Status                      |
| ------------------------------------------------------- | --------------------------- |
| `Profile` model with `data` and `fieldVisibility` JSONB | ✅ REUSE                    |
| `Profile.status` draft/published                        | ✅ REUSE                    |
| `Profile` created empty on card claim (F-007)           | ✅ REUSE (once F-007 built) |
| `FieldSchemaItem` type (from F-004)                     | ✅ REUSE                    |

---

## Gaps & Missing Items

- ❌ No profile API endpoints
- ❌ No visibility default initialization on first profile open
- ❌ No server-side visibility filtering for public responses
- ❌ No profile editor UI
- ❌ No publish/unpublish mechanism
- ❌ No profile-to-card linkage resolution (via CardAssignment)

---

## Business Rules

1. **One profile per (user, cardType) pair.** A customer with one Business card has one Business profile. If they ever get a second card (same type, via replacement), the same profile is reused — the new card links to the existing profile.
2. **Profile data is keyed by `CardType.fieldSchema[].key`** — e.g. `{ "name": "Alice", "phone": "+91...", "student_id": "STU001" }`. Unknown keys in `data` are ignored during validation but should be cleaned on write.
3. **`fieldVisibility` is initialized from `defaultVisible` on first profile open** — when a customer first opens the editor, the server populates `fieldVisibility` from the fieldSchema defaults (if `fieldVisibility` is `{}`). This initialization is persisted.
4. **Server-side visibility enforcement (rules.md #7, skills.md):** when building any response that goes to a public visitor, the API must filter `Profile.data` through `fieldVisibility`, falling back to `defaultVisible` for fields not in the map. Never send the full unfiltered `data` to a public endpoint.
5. **Publishing (first publish):** sets `Profile.status = "published"` and transitions `NFCCard.status = ASSIGNED → ACTIVE` in the same transaction.
6. **Unpublishing:** sets `Profile.status = "draft"` and transitions `NFCCard.status = ACTIVE → ASSIGNED`. Public page shows "profile not yet set up" for ASSIGNED status.
7. **Profile edits after publishing** — do NOT require re-publishing. A save immediately reflects on the public page. Cache invalidation (F-017/skills.md) must be triggered on save.
8. **`POST /profile`** — not a true "create" (the row was created on claim in F-007). It is the endpoint to initialize visibility defaults and submit the first onboarding data. Idempotent.
9. **Validation** — `required: true` fields in the fieldSchema must be present and non-empty on the `PUT /profile` call (not on intermediate saves, if the frontend saves incrementally). On the first publish, all required fields must pass validation.

---

## Visibility Resolution Algorithm

```
function getPublicFieldValue(fieldKey, profileData, fieldVisibility, fieldSchema):
  schemaEntry = fieldSchema.find(f => f.key === fieldKey)
  if not schemaEntry: return null  // unknown field, exclude

  isVisible = fieldKey in fieldVisibility
    ? fieldVisibility[fieldKey]         // explicit customer choice
    : schemaEntry.defaultVisible        // fall back to schema default

  if not isVisible: return null  // exclude from public response

  return profileData[fieldKey] ?? null
```

This function runs server-side for every field before building the public profile response.

---

## Backend Requirements

### Files to CREATE

| File                             | Purpose                                                               |
| -------------------------------- | --------------------------------------------------------------------- |
| `src/services/profileService.ts` | Profile CRUD, visibility init, publish/unpublish, public data builder |
| `src/routes/profile.ts`          | Customer profile endpoints (auth-gated)                               |

### API Endpoints

All profile endpoints resolve the customer's profile via their JWT (`req.user.id`) and their active `CardAssignment`. Do not accept `profileId` or `userId` from the client — look them up from the authenticated user.

#### `GET /profile`

- **Auth required:** Yes (Customer)
- **Logic:** find active `CardAssignment` for user → find `Profile` by userId + cardTypeId → if `fieldVisibility = {}`, initialize from fieldSchema defaults and persist → return full profile for editing
- **Response:** `200 { profile: { id, data, fieldVisibility, status, cardType: { fieldSchema }, card: { cardNumber, publicToken, status } } }`

#### `POST /profile`

- **Auth required:** Yes (Customer)
- **Input:** `{ data: { [key]: value }, fieldVisibility: { [key]: boolean } }` (partial — not all fields required)
- **Logic:** find existing Profile (created on claim) → validate keys against fieldSchema → merge `data` and `fieldVisibility` → save
- **Use case:** initial onboarding form submission (incremental saves before first publish)
- **Response:** `200 { profile }`

#### `PUT /profile`

- **Auth required:** Yes (Customer)
- **Input:** `{ data: { [key]: value }, fieldVisibility: { [key]: boolean }, publish?: boolean }`
- **Logic:**
  - Validate all keys against fieldSchema; strip unknown keys
  - If `publish = true`: validate required fields are present → set `Profile.status = "published"` → set `NFCCard.status = ACTIVE` (if was ASSIGNED)
  - If `publish = false` (unpublish): set `Profile.status = "draft"` → set `NFCCard.status = ASSIGNED` (if was ACTIVE)
  - Save `data` and `fieldVisibility`
  - Trigger cache invalidation for the card's public token (skills.md)
- **Response:** `200 { profile }`

#### `GET /profile/public/:token` _(internal — used by SSR route in F-010)_

- **Auth required:** No (called server-to-server within Express, not exposed to public as a standalone API)
- **Logic:** resolve token → NFCCard → CardAssignment → Profile + CardType → run visibility algorithm → return only public fields
- **Response:** filtered profile data, card status, template info — used by F-010 SSR renderer

---

## Frontend Requirements

### Shared FieldRenderer (critical for config-driven approach)

All form inputs are driven by `CardType.fieldSchema`. The `FieldRenderer` is the core reusable component:

```
FieldRenderer
  ├── TextField        (type: text, email, url, phone)
  ├── LongTextField    (type: long_text)
  ├── ImageField       (type: image — integrates F-016 upload)
  ├── AddressField     (type: address)
  ├── ListField        (type: list_of_strings — add/remove items)
  └── SelectField      (type: select)
```

Each field renders:

- The input/control appropriate for its type
- A visibility toggle (eye icon) that controls `fieldVisibility[key]`
- A lock icon if the field is a required field

### Files to CREATE

| File                                             | Purpose                                                                          |
| ------------------------------------------------ | -------------------------------------------------------------------------------- |
| `src/shared/FieldRenderer/FieldRenderer.tsx`     | Renders a single field with input + visibility toggle                            |
| `src/shared/FieldRenderer/TextField.tsx`         | Input for text, email, url, phone                                                |
| `src/shared/FieldRenderer/LongTextField.tsx`     | Textarea for long_text                                                           |
| `src/shared/FieldRenderer/ImageField.tsx`        | Image upload preview (connects to F-016)                                         |
| `src/shared/FieldRenderer/AddressField.tsx`      | Multi-line address input                                                         |
| `src/shared/FieldRenderer/ListField.tsx`         | Add/remove list items                                                            |
| `src/shared/FieldRenderer/SelectField.tsx`       | Dropdown for select type                                                         |
| `src/portal/ProfileEditor/ProfileEditor.tsx`     | Main profile edit page — renders all fields from fieldSchema using FieldRenderer |
| `src/portal/ProfileEditor/PublishBar.tsx`        | Bottom bar: Save / Publish / Unpublish buttons, validation state                 |
| `src/portal/ProfileEditor/VisibilitySummary.tsx` | Shows count of visible vs hidden fields                                          |
| `src/shared/api/profile.ts`                      | `getProfile()`, `updateProfile()`, `publishProfile()` API calls                  |

---

## Validation & Error Cases

| Case                                        | Behavior                                                                     |
| ------------------------------------------- | ---------------------------------------------------------------------------- |
| Required field missing on publish           | `400 { error: { code: "REQUIRED_FIELD_MISSING", field: "name" } }`           |
| Unknown field key in `data`                 | Strip silently on write; do not 400 (graceful handling)                      |
| Profile not found (no active assignment)    | `404 { error: { code: "NO_ACTIVE_CARD" } }`                                  |
| Publishing a profile for a PAUSED card      | `409 { error: { code: "CARD_PAUSED" } }` — must resume before publishing     |
| Unpublishing a profile for a SUSPENDED card | `409 { error: { code: "CARD_SUSPENDED" } }` — admin only can clear SUSPENDED |

---

## Acceptance Criteria

- [ ] `GET /profile` returns the authenticated user's profile with full fieldSchema
- [ ] `GET /profile` initializes `fieldVisibility` from `defaultVisible` when first opened
- [ ] `student_id` and `address`-type fields have `fieldVisibility = false` by default
- [ ] Contact/social fields have `fieldVisibility = true` by default
- [ ] `PUT /profile` with `publish = true` sets profile.status = "published" and card.status = "ACTIVE"
- [ ] `PUT /profile` with `publish = false` sets profile.status = "draft" and card.status = "ASSIGNED"
- [ ] Public profile response (internal) contains only fields where `isVisible = true`
- [ ] Hidden field values never appear in any public API response (security requirement)
- [ ] `PUT /profile` rejects publish if required fields (name) are missing
- [ ] Profile editor renders all fields from fieldSchema using FieldRenderer
- [ ] Visibility toggle per field is reflected in `fieldVisibility` on save
- [ ] Profile edits after publishing take effect immediately on the public page

---

## Implementation Tasks

- [ ] **T-008-1:** Create `src/services/profileService.ts` — CRUD, visibility init, public data builder
- [ ] **T-008-2:** Create `src/routes/profile.ts` with `GET`, `POST`, `PUT /profile`
- [ ] **T-008-3:** Implement visibility enforcement in `profileService.getPublicData()`
- [ ] **T-008-4:** Implement publish transition (Profile.status + NFCCard.status) in transaction
- [ ] **T-008-5:** Mount profile routes in `app.ts` under `/profile` (with requireAuth)
- [ ] **T-008-6:** Create `src/shared/FieldRenderer/` — all 6 field renderer components
- [ ] **T-008-7:** Create `src/portal/ProfileEditor/ProfileEditor.tsx`
- [ ] **T-008-8:** Create `src/portal/ProfileEditor/PublishBar.tsx`
- [ ] **T-008-9:** Create `src/shared/api/profile.ts`
- [ ] **T-008-10:** Wire profile editor into customer portal routing (after claim, route here)
- [ ] **T-008-11:** Update `.agents/features.md` on completion
