# Module Map

Reference repo: `/home/bayw/Documents/Morfosis/morfoschools/morfoschools_prototype`
Target repo: `/home/bayw/Documents/Morfosis/morfoschools/morfoschools`

Rule: map prototype areas to deliberate target actions. No full-copy. Every backend-wired module must finish FE + BE together.

## Clean Rewrite Scope

| Prototype Area | Target Phase / Issue | Action | Notes |
|---|---:|---|---|
| Landing `/` | Phase 1.5 / existing UI base | rewrite/port | Target route in clean scope. |
| Login `/login` | Phase 1.5 then auth wiring | rewrite/port | UI base complete; backend auth later. |
| App shell `/app` | Phase 1.5 / existing UI base | rewrite/port | Sidebar, header, theme controls, AI sidecar. |
| Gallery `/app/gallery` | Phase 1.5 / existing UI base | rewrite/port | Base component catalog. |
| UI Gallery `/ui-gallery` | Phase 1.5 / existing UI base | rewrite/port or alias | Keep as target demo/review surface if required. |
| AI Chat API `/api/ai-chat` | clean scope | rewrite minimal | Local/mock response until BYO AI runtime design. |

## Deferred Product Modules

| Prototype Area | Prototype Route / Module | Target Phase | Action | Notes |
|---|---|---:|---|---|
| Auth/RBAC/Tenant Theme | backend `auth`, `tenancy`, FE users/tenants | Phase 2 | rewrite | Security baseline required before real login wiring. |
| Identity/users | `/app/users`, backend identity/auth | Phase 2 | rewrite | Must include RBAC, audit, tenant isolation. |
| Academic classes | `/app/classes`, backend classes/academic | Phase 3+ | rewrite | Use course_offerings, teaching_assignments, enrollments model. |
| Students | `/app/students`, backend students | Phase 3+ | rewrite | Directory CRUD with backend empty/skeleton/error states. |
| Teachers | `/app/teachers` | Phase 3+ | rewrite | Teaching assignment aware. |
| Subjects | `/app/subjects` | Phase 3+ | rewrite | Academic taxonomy. |
| Subject groups | `/app/subject-groups` | Phase 3+ | rewrite | Academic grouping taxonomy. |
| Courses | `/app/courses`, backend courses | Phase 3+ | rewrite | Header/control visual pattern is canonical reference. |
| Course monitoring | `/app/course-monitoring` | Phase 3+ | rewrite/defer analytics | Must not require ClickHouse for app boot. |
| Learning | `/app/learn` | Phase 3+ | rewrite | Student journey after course foundation. |
| Exams management | `/app/exams`, backend exams management | Phase 4+ | rewrite critical | Must include expected answers/rubrics from first implementation. |
| Exam detail tabs | detail, monitor, grading, performance | Phase 4+ | rewrite critical | Preserve tabs/header conventions. |
| Exam gate | `/app/exam-gate/[id]` | Phase 4+ | rewrite critical | Required before take-exam. |
| Take exam | `/app/take-exam/[id]` | Phase 4+ | rewrite critical | Exam critical path: DB/NATS only; no Google/AI/ClickHouse dependency. |
| Exam result | `/app/exam-result/[id]` | Phase 4+ | rewrite | Student result view. |
| AI runtime | AI chat, provider integration docs | Later | design contracts first | BYO AI Agent/key policy. |
| Analytics | backend analytics/ClickHouse | Later | optional profile | Never blocks boot or exam submission. |
| Phase review route | `/app/phase-1-review` | N/A | delete/defer | Internal prototype artifact, not target product route. |

## Backend Platform Mapping

| Prototype Backend Area | Target Issue | Action | Required Notes |
|---|---:|---|---|
| Docker / service boot | ISSUE-004 | rewrite | Compose isolation, frontend port 1666, PostgreSQL, PgBouncer, Valkey, NATS. |
| Go API foundation | ISSUE-005 | rewrite | `cmd/api`, `internal/app`, health/readiness, config, logger, DB. |
| Migrations/schema | ISSUE-006 | rewrite | Embedded migration runner, UUID v7 preferred, audit/tenant columns. |
| Auth/session/RBAC | ISSUE-007+ | rewrite | Secure cookies/session, RBAC policies, rate limiting. |
| OpenAPI + AI Tool Manifests | Backend module issues | create alongside modules | Required for every backend module. |
| Inbox/shock absorber | Exam module issues | rewrite | Daily Postgres partitions + NATS JetStream relay. |

## Target Action Legend

- `rewrite/port`: intentionally recreate behavior and UX pattern in target code, with clean implementation and tests.
- `rewrite`: rebuild from requirements/audit, not copied.
- `defer`: documented reference, not in current clean scope.
- `delete/defer`: do not include in target unless later re-approved.

## Current Completion Baseline

UI base for clean scope is considered complete per user direction. Future issue execution still follows this map sequentially from ISSUE-000 onward.
