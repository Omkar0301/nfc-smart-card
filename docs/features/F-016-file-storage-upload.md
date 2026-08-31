# F-016 — File Storage & Upload (S3)

**ID:** F-016  
**Priority:** 🟢 Medium  
**Phase:** 5  
**Status:** ❌ NOT STARTED  
**Depends on:** F-002 (auth — uploads require authentication)  
**Required by:** F-008 (profile photo field), F-009 (template thumbnails in admin)

---

## Purpose

Implement secure file upload for profile photos (customer-facing) and template thumbnails (admin-facing). Files are stored in S3-compatible object storage; only the resulting object key/URL is stored in Postgres. All uploads are validated for file type and size server-side before storage.

## User Story

**Customer:**  
_As a customer editing my profile, I want to upload a profile photo — so my public page shows my face alongside my contact information._

**Admin:**  
_As a super admin managing templates, I want to upload a thumbnail image for each template — so customers can see a preview of each template in the picker._

---

## PRD Requirements Covered

- **§1** — S3-compatible object storage; only key/URL stored in Postgres
- **§24, #13** — File uploads validated (type, size) before storage; never trust client-declared MIME type
- **§7.2** — Business and College cards both have a `photo` field of type `image`
- **architecture.md §1** — S3-compatible storage (bucket name via env var)
- **rules.md #13** — Validate type AND size; never trust client-declared MIME type alone

---

## What Is Already Implemented

| Item                                                            | Status        |
| --------------------------------------------------------------- | ------------- |
| `image` field type in FieldSchema taxonomy (architecture.md §6) | ✅ REUSE      |
| `Profile.data` JSONB (stores photo URL)                         | ✅ REUSE      |
| `Template.thumbnail` string field (stores thumbnail URL)        | ✅ REUSE      |
| S3 env var reference in architecture.md                         | ✅ DOCUMENTED |

---

## Gaps & Missing Items

- ❌ No S3 client configured
- ❌ No upload endpoint
- ❌ No server-side file validation (type + size)
- ❌ No multipart form handling middleware
- ❌ No `ImageField` implementation in FieldRenderer (stubbed in F-008)
- ❌ No environment variables for S3 config in `.env.example`
- ❌ No admin thumbnail upload UI

---

## Business Rules

1. **Only the S3 key/URL is stored in Postgres** — never binary data in the database. (PRD §1, architecture.md §1)
2. **All file validation happens on the server** — before the file reaches S3. Never trust the client-declared `Content-Type`. Validate by reading magic bytes (file signature). (rules.md #13)
3. **Allowed file types for profile photos:** JPEG, PNG, WebP. Max size: 5 MB.
4. **Allowed file types for template thumbnails:** JPEG, PNG, WebP. Max size: 2 MB.
5. **Image storage key convention:**
   - Profile photos: `profiles/{userId}/{timestamp}-{random}.{ext}`
   - Template thumbnails: `templates/{templateId}/{timestamp}-{random}.{ext}`
6. **Bucket access:** S3 bucket is configured with public read access for profile photos and template thumbnails (they appear on public pages). No presigned URLs needed for reads.
7. **Old photo cleanup:** when a customer uploads a new profile photo, the old one in S3 is deleted (or marked for deletion). In MVP, deletion can be best-effort (log failures, don't fail the upload).
8. **No image resizing in MVP** — upload the image as-is after type/size validation. Image optimization can be added as a background job post-MVP.
9. **S3 provider is configurable** — endpoint, bucket name, access key, secret key are all env vars. This allows using AWS S3, MinIO, Cloudflare R2, or any S3-compatible service.

---

## Environment Variables to Add

Add to `.env.example`:

```
S3_ENDPOINT="https://s3.amazonaws.com"  # or MinIO endpoint
S3_BUCKET="nfc-card-platform"
S3_REGION="us-east-1"
S3_ACCESS_KEY="your-access-key"
S3_SECRET_KEY="your-secret-key"
S3_PUBLIC_BASE_URL="https://nfc-card-platform.s3.amazonaws.com"  # public URL prefix
```

---

## File Magic Byte Validation

Do not rely on the `Content-Type` header sent by the client. Read the first bytes of the uploaded buffer:

| Format | Magic Bytes                   |
| ------ | ----------------------------- |
| JPEG   | `FF D8 FF`                    |
| PNG    | `89 50 4E 47 0D 0A 1A 0A`     |
| WebP   | `52 49 46 46 ... 57 45 42 50` |

If the buffer does not match any allowed signature, reject the upload with `415 Unsupported Media Type`.

---

## Database Requirements

No new models needed. The upload endpoint returns a URL that is stored in `Profile.data.photo` (via `PUT /profile`) or `Template.thumbnail` (via `PUT /admin/templates/:id`). These fields already exist.

---

## Backend Requirements

### Dependencies to Add

```bash
npm install @aws-sdk/client-s3 --workspace=apps/api
npm install multer --workspace=apps/api
npm install @types/multer --workspace=apps/api --save-dev
```

**Why multer:** handles multipart/form-data parsing. Configured to store to memory (buffer), not disk — the buffer is then validated and sent to S3.

### Files to CREATE

| File                       | Purpose                                                                          |
| -------------------------- | -------------------------------------------------------------------------------- |
| `src/lib/s3.ts`            | S3 client initialization (AWS SDK v3); `uploadFile()`, `deleteFile()` utilities  |
| `src/lib/validateFile.ts`  | Magic-byte validation, size check, extension check                               |
| `src/routes/upload.ts`     | Upload endpoints for profile photo and template thumbnail                        |
| `src/middleware/multer.ts` | Multer configuration: memory storage, 10 MB raw limit (validation applied after) |

### API Endpoints

#### `POST /upload/profile-photo`

- **Auth required:** Yes (Customer)
- **Content-Type:** `multipart/form-data`
- **Body:** `file` field containing the image
- **Logic:**
  1. Multer parses the multipart body → buffer in memory
  2. Validate file size ≤ 5 MB
  3. Validate MIME type via magic bytes (JPEG / PNG / WebP only)
  4. Generate S3 key: `profiles/{userId}/{Date.now()}-{random(8)}.{ext}`
  5. Upload buffer to S3 (`PutObjectCommand`)
  6. If user already has a photo, delete the old S3 object (best-effort)
  7. Return the public URL
- **Response:** `200 { url: "https://bucket.s3.amazonaws.com/profiles/..." }`
- **Error:** `400 FILE_TOO_LARGE`, `415 INVALID_FILE_TYPE`

#### `POST /upload/template-thumbnail`

- **Auth required:** Admin
- **Content-Type:** `multipart/form-data`
- **Body:** `file` field + `templateId` field
- **Logic:** same as profile photo upload, with:
  - Size limit: 2 MB
  - S3 key: `templates/{templateId}/{timestamp}-{random}.{ext}`
- **Response:** `200 { url: "..." }`

---

## Frontend Requirements

### ImageField in FieldRenderer

The `ImageField.tsx` component (stubbed in F-008) is completed here:

```
ImageField behavior:
  - Shows current photo (if set) as a circular preview
  - "Change photo" / "Add photo" button opens file picker
  - On file selection: validate size client-side (soft warning) → call POST /upload/profile-photo
  - Show upload progress indicator
  - On success: update fieldValue in parent form state with the returned URL
  - On error: show clear error message ("File too large" / "Invalid file type")
```

### Files to CREATE/MODIFY

| File                                               | Purpose                                                                                                                                         |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/shared/FieldRenderer/ImageField.tsx`          | COMPLETE this component (stubbed in F-008) — file picker, preview, upload call, URL propagation                                                 |
| `src/shared/api/upload.ts`                         | `uploadProfilePhoto(file: File): Promise<{ url: string }>`, `uploadTemplateThumbnail(file: File, templateId: string): Promise<{ url: string }>` |
| `src/admin/TemplateManagement/ThumbnailUpload.tsx` | Admin thumbnail upload component used in TemplateForm (F-009)                                                                                   |

### Client-Side Pre-Validation

Before calling the upload endpoint, perform a lightweight client-side check:

- File size < 5 MB (show warning if larger, but still attempt — server is the authority)
- File type is `image/jpeg`, `image/png`, or `image/webp` per `file.type` (informational only — server validates by magic bytes)

---

## Validation & Error Cases

| Case                                         | Behavior                                                                              |
| -------------------------------------------- | ------------------------------------------------------------------------------------- |
| File > 5 MB (profile photo)                  | `400 { error: { code: "FILE_TOO_LARGE", maxSizeMb: 5 } }`                             |
| File > 2 MB (template thumbnail)             | `400 { error: { code: "FILE_TOO_LARGE", maxSizeMb: 2 } }`                             |
| File type not JPEG/PNG/WebP (by magic bytes) | `415 { error: { code: "INVALID_FILE_TYPE" } }`                                        |
| No file attached                             | `400 { error: { code: "NO_FILE" } }`                                                  |
| S3 upload fails                              | `500 { error: { code: "UPLOAD_FAILED" } }` — log the S3 error; don't expose internals |
| Old photo deletion fails                     | Log warning; don't fail the request — orphaned files are acceptable in MVP            |

---

## Acceptance Criteria

- [ ] `POST /upload/profile-photo` accepts JPEG, PNG, WebP up to 5 MB and returns a public URL
- [ ] `POST /upload/profile-photo` rejects files with invalid magic bytes (type spoofing attempt returns 415)
- [ ] `POST /upload/profile-photo` rejects files over 5 MB with 400
- [ ] `POST /upload/profile-photo` requires authentication (401 without JWT)
- [ ] Uploaded photo URL is saved into `Profile.data.photo` via the profile editor
- [ ] Profile photo appears on the public SSR profile page
- [ ] `POST /upload/template-thumbnail` requires admin auth
- [ ] Template thumbnail appears in the template picker UI
- [ ] S3 credentials are entirely env-var-driven (no hardcoded keys)
- [ ] `ImageField.tsx` shows current photo, upload progress, and error states
- [ ] Old photo is deleted from S3 when a new one is uploaded (best-effort)

---

## Implementation Tasks

- [ ] **T-016-1:** Add S3 env vars to `.env.example` and `.env`
- [ ] **T-016-2:** Install `@aws-sdk/client-s3` and `multer` in `apps/api`
- [ ] **T-016-3:** Create `src/lib/s3.ts` — S3 client, `uploadFile()`, `deleteFile()`
- [ ] **T-016-4:** Create `src/lib/validateFile.ts` — magic byte validator + size check
- [ ] **T-016-5:** Create `src/middleware/multer.ts` — memory-storage multer config
- [ ] **T-016-6:** Create `src/routes/upload.ts` — `POST /upload/profile-photo` + `POST /upload/template-thumbnail`
- [ ] **T-016-7:** Mount upload routes in `app.ts`
- [ ] **T-016-8:** COMPLETE `src/shared/FieldRenderer/ImageField.tsx` — picker, preview, upload call
- [ ] **T-016-9:** Create `src/shared/api/upload.ts`
- [ ] **T-016-10:** Create `src/admin/TemplateManagement/ThumbnailUpload.tsx`
- [ ] **T-016-11:** Update `.agents/features.md` on completion
