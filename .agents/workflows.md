# Workflows

Repeatable, multi-step procedures for feature execution and system tasks.

---

## Workflow: Feature Development Cycle

1. **Plan** — Read the target feature PRD in [`/docs/features/`](file:///d:/nfc-new/nfc-card-platform/docs/features/), and consult [`/docs/PROJECT_CONTEXT.md`](file:///d:/nfc-new/nfc-card-platform/docs/PROJECT_CONTEXT.md), [`/docs/ARCHITECTURE.md`](file:///d:/nfc-new/nfc-card-platform/docs/ARCHITECTURE.md), [`/docs/DATABASE_CONTEXT.md`](file:///d:/nfc-new/nfc-card-platform/docs/DATABASE_CONTEXT.md), and [`/docs/DEVELOPMENT_RULES.md`](file:///d:/nfc-new/nfc-card-platform/docs/DEVELOPMENT_RULES.md). Check `.agents/features.md` for completed dependencies.
2. **Implement** — Build the feature per scope using existing patterns (`.agents/skills.md`).
3. **Review** — Self-check against `/docs/DEVELOPMENT_RULES.md`. (No automated test suite required).
4. **Update Documentation** — Append an entry to `.agents/features.md`. If architectural patterns or database schema changed, update the relevant `/docs/` context files per `/docs/DEVELOPMENT_RULES.md`.
5. **Commit** — Commit code and updated documentation together.

---

## Workflow: Add a New Card Type

1. Confirm fields map onto existing taxonomy in `CardType.fieldSchema`.
2. Insert `CardType` row (`slug`, `fieldSchema`).
3. Build 3 template visual components in `packages/shared/src/templates/` reusing `FieldRenderer`.
4. Seed `Template` rows.
5. Log rollout in `.agents/features.md`.

---

## Workflow: Database Migration

1. Edit `apps/api/prisma/schema.prisma`.
2. Run `npx prisma migrate dev` in `apps/api`.
3. Update `/docs/DATABASE_CONTEXT.md`.
4. Note migration in `.agents/features.md`.
