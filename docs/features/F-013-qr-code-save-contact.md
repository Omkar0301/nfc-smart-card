# F-013 — QR Code & Save Contact (.vcf)

**ID:** F-013  
**Priority:** 🟢 Medium  
**Phase:** 8  
**Status:** ✅ COMPLETE  
**Depends on:** F-010 (public profile page), F-008 (visibility enforcement)  
**Required by:** F-011 (QR shown in customer portal My Card screen)

---

## Purpose

Generate and display a QR code encoding the same public URL as the NFC chip, and generate a `.vcf` (vCard) file from the customer's currently public fields only — so visitors without NFC-capable phones can still access the profile, and anyone can save the contact to their phone's address book.

## User Story

**Customer:**  
_As a cardholder, I want a QR code I can show or print alongside my NFC card — so that visitors without NFC can still access my profile._

**Visitor:**  
_As a visitor viewing a public profile, I want a "Save Contact" button that downloads a `.vcf` file pre-filled with the cardholder's public contact info — so I can add them to my phone contacts in one tap._

---

## PRD Requirements Covered

- **§18** — QR code encoding the same public URL; NFC and QR always resolve to the same profile; Save Contact `.vcf` from public fields only (name, company, designation, phone, email, website)
- **§17** — Customer portal My Card screen includes "View QR" option
- **§8** — QR and NFC always resolve to the same URL (publicToken never changes)

---

## Technical Details (Option B Architecture)

- **QR Code in Next.js Portal (`apps/web`):** Client component using `qrcode.react` rendered in `app/portal/my-card/page.tsx` and `components/portal/QRCodeDisplay.tsx`. Encodes `https://{domain}/p/{cardType.slug}/{publicToken}`.
- **Save Contact (`.vcf`) Endpoint (`apps/api`):** `GET /p/:type/:token/contact.vcf` & `GET /profile/public/:token/contact.vcf` in Express. Re-runs field visibility enforcement server-side and responds with `Content-Type: text/vcard; charset=utf-8` and `Content-Disposition: attachment; filename="{Name}.vcf"`.
- **Next.js Route Handler (`apps/web`):** `app/p/[type]/[token]/contact.vcf/route.ts` proxies vCard downloads to Express API.
- **Template CTA (`packages/shared/src/templates`):** `<SaveContactButton />` component linking to the `.vcf` endpoint, integrated into all 6 template components.

---

## Acceptance Criteria

- [x] `GET /p/business/[token]/contact.vcf` returns a valid vCard with only public fields
- [x] If phone is hidden by customer, `TEL` is absent from the vCard
- [x] vCard download uses customer's name as the filename
- [x] Next.js Customer Portal My Card screen shows QR code for the card's public URL
- [x] "Download QR" saves QR as PNG; "Copy URL" copies URL to clipboard
- [x] Save Contact button appears on public profile page templates
- [x] `.vcf` for a PAUSED card returns 403 (no contact data served)

---

## Implementation Tasks

- [x] **T-013-1:** Install `qrcode.react` in `apps/web`
- [x] **T-013-2:** Create `src/services/vcf.service.ts` in `apps/api` — vCard builder using fieldSchema + visibility
- [x] **T-013-3:** Add `GET /p/:type/:token/contact.vcf` to `apps/api` public routes
- [x] **T-013-4:** Create `apps/web/components/portal/QRCodeDisplay.tsx`
- [x] **T-013-5:** Create `packages/shared/src/components/SaveContactButton.tsx`
- [x] **T-013-6:** Integrate `SaveContactButton` into template components
- [x] **T-013-7:** Update `.agents/features.md` on completion
