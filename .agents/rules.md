# Rules

> 📌 **Canonical Rules Pointer:**
> Comprehensive development and engineering rules are maintained in:
> - [`/docs/DEVELOPMENT_RULES.md`](file:///d:/nfc-new/nfc-card-platform/docs/DEVELOPMENT_RULES.md)

---

## Core Checklist (Option B)

1. **Stack:** Next.js App Router (`apps/web`) frontend, Express 5 (`apps/api`) backend, PostgreSQL database, Prisma ORM. No Redis.
2. **Public Profile SSR:** Render `/p/[type]/[token]` using Next.js App Router Server Components with `generateMetadata()` for Open Graph tags and `revalidateTag()` for cache purging.
3. **No Vertical Tables:** Card types are config rows in `CardType`. Never create a new database table per vertical (e.g., `DoctorProfile`).
4. **Chip Data:** The physical card stores only a public token, never customer PII.
5. **Visibility:** Field visibility (public/hidden) is enforced server-side before sending responses.
6. **Public Tokens:** Generated using `crypto.randomBytes()`. Never sequential or guessable.
7. **Card Claiming:** Must run inside a Prisma interactive transaction with a row lock (`SELECT ... FOR UPDATE`).
8. **Admin Security:** Verify `role === 'ADMIN'` server-side on every admin request.
9. **Customer Scoping:** Customer endpoints resolve data using `req.user.id` from JWT.
10. **Rate Limiting:** OTP, recovery, analytics, and upload endpoints must be rate-limited.
11. **Lifecycle States:** `PAUSED` (customer-controlled) and `SUSPENDED` (admin-controlled) are distinct. `DEACTIVATED` is permanent.
12. **No Test Suite:** Per product rule #18, do not add automated test suites unless explicitly requested.
