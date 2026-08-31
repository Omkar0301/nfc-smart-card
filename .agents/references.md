# References

Canonical external and internal references for this project.

## Internal Context & Architectural Documentation
- `PRD_NFC_Digital_Card_Platform.md` (project root) — Product spec and source of truth for requirements.
- [`/docs/PROJECT_CONTEXT.md`](file:///d:/nfc-new/nfc-card-platform/docs/PROJECT_CONTEXT.md) — High-level project summary and structure.
- [`/docs/ARCHITECTURE.md`](file:///d:/nfc-new/nfc-card-platform/docs/ARCHITECTURE.md) — Technical architecture and data flows.
- [`/docs/DATABASE_CONTEXT.md`](file:///d:/nfc-new/nfc-card-platform/docs/DATABASE_CONTEXT.md) — Database models, enums, relations, and invariants.
- [`/docs/API_CONTEXT.md`](file:///d:/nfc-new/nfc-card-platform/docs/API_CONTEXT.md) — API routing, conventions, and status codes.
- [`/docs/DEVELOPMENT_RULES.md`](file:///d:/nfc-new/nfc-card-platform/docs/DEVELOPMENT_RULES.md) — Mandatory developer and AI agent rules.
- [`.agents/features.md`](file:///d:/nfc-new/nfc-card-platform/.agents/features.md) — Log of what has been built.

## External Stack Documentation
- **Next.js (App Router):** https://nextjs.org/docs — used in `apps/web` for portal UI, `/p/[type]/[token]` SSR, `generateMetadata()`, and `revalidateTag()`.
- **React (React 19 / Server Components):** https://react.dev — used across `apps/web` and `packages/shared/src/templates/`.
- **Express 5:** https://expressjs.com — REST API backend (`apps/api`).
- **Prisma:** https://www.prisma.io/docs — schema, migrations, interactive transactions.
- **PostgreSQL JSONB:** https://www.postgresql.org/docs/current/datatype-json.html — underlies `fieldSchema` & `Profile.data`.
- **pg-boss:** https://github.com/timgit/pg-boss — Postgres-native job queue for bulk generation.
- **vCard (.vcf) Spec:** https://en.wikipedia.org/wiki/VCard — used for Save Contact feature.
- **Open Graph Protocol:** https://ogp.me — meta tags on public profile route.

## Explicitly Excluded (Do Not Use)
- Redis / BullMQ — replaced by pg-boss.
- Vite — replaced by Next.js App Router for frontend.
- Custom `ReactDOMServer` rendering inside Express — replaced by Next.js App Router Server Components.
- Any ORM other than Prisma.
