# Rules

> 📌 **Canonical Rules Pointer:**
> Comprehensive development and engineering rules are maintained in:
> - [`/docs/DEVELOPMENT_RULES.md`](file:///d:/nfc-new/nfc-card-platform/docs/DEVELOPMENT_RULES.md)

---

## Core Checklist (Option B)

1. **Stack:** Next.js App Router (`apps/web`) frontend, Express 5 (`apps/api`) backend, PostgreSQL database, Prisma ORM. No Redis.
2. **Backend Layering (Mandatory Controller → Service → Repository):** All backend features must follow strict layering — Controllers (`src/controllers/`) handle only HTTP (Zod parse, `req`/`res`, cookies, `sendSuccess`/`sendError`), Services (`src/services/`) contain business logic and call repositories, Repositories (`src/repositories/`) handle Prisma only. No Prisma in controllers/services, no business rules in repositories. Routes (`src/routes/`) bind paths to controllers.
3. **Public Profile SSR:** Render `/p/[type]/[token]` using Next.js App Router Server Components with `generateMetadata()` for Open Graph tags and `revalidateTag()` for cache purging.
4. **No Vertical Tables:** Card types are config rows in `CardType`. Never create a new database table per vertical (e.g., `DoctorProfile`).
5. **Chip Data:** The physical card stores only a public token, never customer PII.
6. **Visibility:** Field visibility (public/hidden) is enforced server-side before sending responses.
7. **Public Tokens:** Generated using `crypto.randomBytes()`. Never sequential or guessable.
8. **Card Claiming:** Must run inside a Prisma interactive transaction with a row lock (`SELECT ... FOR UPDATE`) — transaction in repository layer, orchestrated by service.
9. **Admin Security:** Verify `role === 'ADMIN'` server-side on every admin request.
10. **Customer Scoping:** Customer endpoints resolve data using `req.user.id` from JWT.
11. **Rate Limiting:** OTP, recovery, analytics, and upload endpoints must be rate-limited.
12. **Lifecycle States:** `PAUSED` (customer-controlled) and `SUSPENDED` (admin-controlled) are distinct. `DEACTIVATED` is permanent.
13. **No Test Suite:** Per product rule #18, do not add automated test suites unless explicitly requested.
