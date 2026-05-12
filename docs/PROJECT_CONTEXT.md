# Morfoschools Project Context

Last verified: 2026-05-11 by repo/docs/code inspection.

## Repositories

- Target production rewrite repo: `/home/bayw/Documents/Morfosis/morfoschools/morfoschools`
- Prototype/reference repo: `/home/bayw/Documents/Morfosis/morfoschools/morfoschools_prototype`
- Prototype is read-only reference. Use it for product, UI, route, schema, and behavior references only.

## Mission

Morfoschools is a production-grade LMS SaaS for Indonesian schools. The rewrite moves from prototype to a cleaner production architecture without bulk-copying prototype debt.

Primary goals:

- Reliable CBT/exam execution under constrained infrastructure.
- Multi-tenant school operations with secure RBAC and tenant isolation.
- Practical Docker Compose deployment for VPS environments.
- AI-agent-ready contracts through OpenAPI docs and AI Tool Manifests.

## Stack

- Backend: Go modular monolith.
- Frontend: Next.js, React, TypeScript, Tailwind v4 beta, OKLCH design tokens.
- Database: PostgreSQL via PgBouncer.
- Shock absorber: NATS JetStream.
- Cache/session support: Valkey.
- Analytics: optional ClickHouse profile.
- Local stack: Docker Compose.

## Source-of-truth docs

Read these before planning work:

- `AGENTS.md`
- `docs/handoff/CURRENT.md`
- `docs/prd/morfoschools-production-rewrite.md`
- `docs/issues/morfoschools-rewrite-v2-ISSUES.md`
- `docs/rewrite/PROTOTYPE_INVENTORY.md`
- `docs/rewrite/MODULE_MAP.md`
- `docs/rewrite/UI_SOURCE_OF_TRUTH.md`
- `docs/rewrite/DATABASE_AUDIT.md`
- `docs/rewrite/RISKS_AND_DEBT.md`
- `docs/architecture/DATABASE_BASELINE.md`
- `docs/rewrite/GOLDEN_CRUD_PATTERN.md`
- `docs/rewrite/BROWSER_SMOKE_PROTOCOL.md`
- `docs/security/SECURITY_REVIEW_PROTOCOL.md`
- `docs/rewrite/PERFORMANCE_REVIEW_PROTOCOL.md`

## Verified current code state summary

The target repo is no longer only a docs skeleton. It contains implementation work through foundation phases and early Phase 6:

- Docker Compose exists with frontend, backend, PostgreSQL, PgBouncer, Valkey, NATS, and optional ClickHouse profile.
- Backend has app/platform/auth/users/theme/RBAC files under `backend/internal/app`.
- Backend migrations exist through:
  - `000001_auth_rbac_theme_foundation.sql`
  - `000002_user_profiles.sql`
  - `000003_auth_security_act_as.sql`
  - `000004_platform_user_roles.sql`
  - `000005_academic_foundation.sql`
  - `000006_courses.sql`
  - `000007_exams.sql`
  - `000008_primary_tenant_admin.sql`
  - `000009_tenant_logo_fields.sql`
- Frontend has implemented app/login/dashboard/gallery/users/tenants surfaces under `frontend/src/app`.
- Users and Tenants API manifests exist under `docs/ai-tools/`.
- OpenAPI contract exists at `docs/api/openapi.yaml`.

## Current known module status from docs

- Phase 0: complete.
- Phase 1: complete.
- Phase 1.5: complete.
- Phase 2: complete.
- Phase 3: mostly documented as complete, including app shell/API client/AI sidecar shell.
- Phase 4: mostly documented as complete, but backend test helpers should be verified before relying on them.
- Phase 5: documented as complete.
- Phase 6:
  - ISSUE-032 Users: backend + frontend mutation slice documented, runtime smoke verified on 2026-05-11.
  - ISSUE-033/033.1 Tenants/onboarding: backend and frontend journey appears implemented, runtime smoke verified on 2026-05-11 for master admin create/edit tenant, bootstrap admin, switch tenant, and users CRUD in effective tenant.
  - Remaining Phase 6 modules not yet started by docs: teachers, students, staff, guardians.

## Critical continuation rule

When a future session starts after laptop restart, do not answer from memory alone. First read `docs/handoff/CURRENT.md` and the issues/module review docs, then inspect current code and git status. If the docs and code disagree, report the disagreement before proceeding.
