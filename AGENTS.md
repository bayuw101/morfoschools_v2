# Morfoschools Agent Instructions

This repository is the production rewrite target for Morfosis/Morfoschools.

## Mandatory bootstrap before answering "continue", "lanjut", or "next task"

Do not infer status from memory alone. Before concluding the next task, read these files in this target repo:

1. `docs/handoff/CURRENT.md`
2. `docs/PROJECT_CONTEXT.md`
3. `docs/issues/morfoschools-rewrite-v2-ISSUES.md`
4. Relevant module review notes under `docs/rewrite/module-reviews/`
5. `git status --short`

Then inspect only the relevant current code paths before planning or implementing.

## Repository boundaries

- Target repo: `/home/bayw/Documents/Morfosis/morfoschools/morfoschools`
- Prototype/reference repo: `/home/bayw/Documents/Morfosis/morfoschools/morfoschools_prototype`
- The prototype is read-only reference. Do not create rewrite artifacts or implementation changes inside `morfoschools_prototype` unless the user explicitly asks to modify the prototype.

## Product and architecture constraints

- LMS SaaS for Indonesian schools, optimized for reliable exams on limited infrastructure.
- Stack: Go modular monolith, Next.js, PostgreSQL/PgBouncer, NATS JetStream, Valkey, optional ClickHouse.
- Deployment must work through Docker Compose.
- Exam critical path must not depend on Google, AI providers, or ClickHouse.
- Essay and short-answer questions must store expected/correct answers or rubrics from the first implementation.
- Backend-wired frontend pages must use skeleton, empty, and error states with no dummy initial rows.
- Every backend module must include OpenAPI docs and AI Tool Manifest notes.
- Every module should finish FE + BE together before being marked done, except explicitly UI-only foundation phases.

## UI constraints

- Follow `docs/rewrite/UI_SOURCE_OF_TRUTH.md` and current target components.
- Prefer premium realistic Morfosis UI: OKLCH, Space Grotesk/Manrope, dense professional SaaS layout.
- Avoid generic templates, neon/AI gradients, duplicate controls, and excessive whitespace.
- App headers should stay compact and mirror the established `/app/courses`/directory pattern.
- Form drawer is pulled-right inside AppShell, non-modal/no blur overlay, background clickable/copyable, closes only via X.
- ConfirmDialog is centered.
- Controls adjacent in a toolbar should have equal height.

## Workflow

- Use Grill → PRD → Issues → TDD for new features.
- For implementation: tests first where practical, then code, then validation.
- Before editing, check dirty working tree and avoid overwriting unrelated work.
- Do not use broad copy from prototype; port deliberately through issue workflow.
- Update `docs/handoff/CURRENT.md` at the end of meaningful work so future sessions can resume without guessing.
