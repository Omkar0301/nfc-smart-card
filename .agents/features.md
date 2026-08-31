# Completed Feature Context

Append-only log. This is the project's memory of what has actually been built — read this (not the whole codebase) to know what exists before starting a new feature. One entry per feature, added at the end of the Feature Development Cycle (`workflows.md`), never edited retroactively except to correct an error.

**Status: no features implemented yet.** Implementation has not started — this file will get its first entry when Phase 1 (Core Data Model & Auth) is complete and reviewed.

---

## Entry template

Copy this block for each new entry. Keep every field short and factual — this is a reference log, not prose documentation.

```
## [Phase N] Feature name — YYYY-MM-DD

**What was implemented:**
One or two sentences, plain description.

**Frontend (apps/web):**
- Components/pages added or changed, with paths.

**Backend (apps/api):**
- Routes/services added or changed, with paths.
- New/changed API endpoints (method + path).

**Database:**
- Schema/migration changes (models, fields). None, if unchanged.

**Data flow:**
- Brief description of how data moves through this feature (request → service → DB → response), only if non-obvious.

**Architectural decisions:**
- Anything decided during implementation that isn't already in architecture.md, and whether architecture.md was updated as a result.

**Depends on:**
- Prior features/phases this build assumes are already in place.

**Constraints / conventions introduced:**
- Anything a future feature needs to respect (naming, validation rule, invariant) that isn't already covered in rules.md or skills.md.
```
