# Feature Index — NFC Digital Card Platform

This index maps the original PRD requirements onto 17 independent, implementation-ready Feature PRDs.

---

## Technical Stack Summary

- **Frontend & Public SSR:** Next.js (App Router, React 19, TypeScript) in `apps/web`
- **Backend REST API:** Node.js (Express 5, TypeScript ESM) in `apps/api`
- **Public Profile SSR:** Next.js React Server Components (`app/p/[type]/[token]/page.tsx`) with `generateMetadata()` & `revalidateTag()`
- **Database:** PostgreSQL via Prisma ORM (`apps/api/prisma/schema.prisma`)
- **Background Jobs:** pg-boss (Postgres-native, no Redis)
- **Shared Package:** `@nfc-card/shared` (types, field schemas, template Server Components)

---

## Implementation Phase Roadmap

```
Phase 1 — Schema Foundation & Critical Fixes
  └── F-001  Database Schema Foundation (CRITICAL BLOCKER)

Phase 2 — Auth & Recovery
  ├── F-002  Mobile OTP & JWT Auth System
  └── F-003  Account Recovery via Secondary Email

Phase 3 — Admin Config & Batch Operations
  ├── F-004  Card Type & Field Schema Management (with Seed Data)
  ├── F-005  Bulk Card Generation (pg-boss Background Job)
  └── F-006  Admin Card Inventory & Lifecycle Management

Phase 4 — Card Claiming
  └── F-007  Card Claiming & Activation Flow (Transactional)

Phase 5 — Profile & Storage
  ├── F-008  Config-Driven Profile Management & Visibility Rules
  └── F-016  File Storage & S3 Upload (Profile Photo / Thumbnails)

Phase 6 — Template Engine
  └── F-009  Template Engine & MVP Template Library (6 React Server Components)

Phase 7 — Public Experience
  └── F-010  Public Profile Page (Next.js App Router SSR)

Phase 8 — Portals, Actions & Controls
  ├── F-011  Customer Portal UI (Next.js App Router)
  ├── F-012  Admin Portal UI (Next.js App Router)
  ├── F-013  QR Code & Save Contact (.vcf)
  └── F-015  Customer Card Lifecycle Controls (Pause / Resume / Lost)

Phase 9 — Analytics & Hardening
  ├── F-014  Analytics & Interaction Event Tracking
  └── F-017  Security Hardening & Rate Limiting
```

---

## Feature Master Index

| ID                                                                                              | Feature Name                        | Priority    | Phase | PRD Sections      | Primary Stack Layer             |
| ----------------------------------------------------------------------------------------------- | ----------------------------------- | ----------- | ----- | ----------------- | ------------------------------- |
| [F-001](file:///d:/nfc-new/nfc-card-platform/docs/features/F-001-database-schema-foundation.md) | Database Schema Foundation          | 🔴 Critical | 1     | §7, §8, §21       | Prisma Schema (`apps/api`)      |
| [F-002](file:///d:/nfc-new/nfc-card-platform/docs/features/F-002-authentication-otp-jwt.md)     | Mobile OTP & JWT Auth System        | 🔴 Critical | 2     | §10.1, §22, §24   | Express Auth Router             |
| [F-003](file:///d:/nfc-new/nfc-card-platform/docs/features/F-003-account-recovery.md)           | Account Recovery                    | 🟡 High     | 2     | §10.2, §22, §24   | Express Auth + Next.js UI       |
| [F-004](file:///d:/nfc-new/nfc-card-platform/docs/features/F-004-card-type-field-schema.md)     | Card Type & Field Schema Management | 🔴 Critical | 3     | §7.1, §7.2, §16   | Admin API + Prisma Seed         |
| [F-005](file:///d:/nfc-new/nfc-card-platform/docs/features/F-005-bulk-card-generation.md)       | Bulk Card Generation                | 🔴 Critical | 3     | §9, §22, §24      | `pg-boss` Worker in Express     |
| [F-006](file:///d:/nfc-new/nfc-card-platform/docs/features/F-006-admin-card-lifecycle.md)       | Admin Card Inventory & Lifecycle    | 🟡 High     | 3     | §8, §17, §19      | Admin API (`apps/api`)          |
| [F-007](file:///d:/nfc-new/nfc-card-platform/docs/features/F-007-card-claiming-activation.md)   | Card Claiming & Activation          | 🔴 Critical | 4     | §11, §22, §23     | Express Claim Service           |
| [F-008](file:///d:/nfc-new/nfc-card-platform/docs/features/F-008-profile-management.md)         | Config-Driven Profile Management    | 🔴 Critical | 5     | §12, §15, §16     | Profile API (`apps/api`)        |
| [F-009](file:///d:/nfc-new/nfc-card-platform/docs/features/F-009-template-system.md)            | Template System                     | 🟡 High     | 6     | §13, §14, §19     | `packages/shared/src/templates` |
| [F-010](file:///d:/nfc-new/nfc-card-platform/docs/features/F-010-public-profile-ssr.md)         | Public Profile Page (Next.js SSR)   | 🔴 Critical | 7     | §3, §14, §23, §25 | Next.js `app/p/[type]/[token]`  |
| [F-011](file:///d:/nfc-new/nfc-card-platform/docs/features/F-011-customer-portal-ui.md)         | Customer Portal UI                  | 🟡 High     | 8     | §15, §17          | Next.js `app/portal/*`          |
| [F-012](file:///d:/nfc-new/nfc-card-platform/docs/features/F-012-admin-portal-ui.md)            | Admin Portal UI                     | 🟡 High     | 8     | §19               | Next.js `app/admin/*`           |
| [F-013](file:///d:/nfc-new/nfc-card-platform/docs/features/F-013-qr-code-save-contact.md)       | QR Code & Save Contact (.vcf)       | 🟢 Medium   | 8     | §18               | Next.js UI + Express VCF        |
| [F-014](file:///d:/nfc-new/nfc-card-platform/docs/features/F-014-analytics.md)                  | Analytics & Event Tracking          | 🟢 Medium   | 9     | §20, §25          | Analytics API + Next.js UI      |
| [F-015](file:///d:/nfc-new/nfc-card-platform/docs/features/F-015-customer-card-lifecycle.md)    | Customer Card Lifecycle Controls    | 🟡 High     | 8     | §8, §17           | Profile API (`apps/api`)        |
| [F-016](file:///d:/nfc-new/nfc-card-platform/docs/features/F-016-file-storage-upload.md)        | File Storage & S3 Upload            | 🟢 Medium   | 5     | §1, §7.2, §24     | Upload API (`apps/api`)         |
| [F-017](file:///d:/nfc-new/nfc-card-platform/docs/features/F-017-security-hardening.md)         | Security Hardening & Rate Limiting  | 🟡 High     | 9     | §24, §25          | Express Middleware + Next.js    |
