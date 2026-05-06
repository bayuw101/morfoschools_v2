# Prototype Inventory

Reference repo: `/home/bayw/Documents/Morfosis/morfoschools/morfoschools_prototype`

Audit date: 2026-05-06
Target repo: `/home/bayw/Documents/Morfosis/morfoschools/morfoschools`

Rule: prototype is read-only reference. Do not copy full prototype modules into target. Reuse means deliberate rewrite/port of contracts, UX patterns, and domain lessons only.

## Frontend Routes

| Prototype Route / Surface | Prototype Files | Target Action | Notes |
|---|---|---|---|
| `/` landing | `frontend/src/app/page.tsx`, `frontend/src/components/landing/*` | rewrite/port for clean scope | Target already has base UI surface; keep marketing polish but avoid broad module expansion. |
| `/login` | `frontend/src/app/(auth)/login/page.tsx`, `login-domain.ts` | rewrite/port | UI base complete; backend auth wiring later. |
| `/app` dashboard | `frontend/src/app/(app)/app/page.tsx`, `dashboard-domain.ts` | rewrite/port | App shell + premium dashboard source. |
| `/app/gallery` | `frontend/src/app/(app)/app/gallery/page.tsx`, `gallery-domain.ts` | rewrite/port | Component source-of-truth / UI gallery for clean rewrite. |
| `/api/ai-chat` | `frontend/src/app/api/ai-chat/route.ts` | rewrite minimal contract | Keep mock/local route until BYO provider design is approved. |
| `/app/classes` | `frontend/src/app/(app)/app/classes/*` | defer module rewrite | Academic module; FE+BE together in later issue. |
| `/app/students` | `frontend/src/app/(app)/app/students/*` | defer module rewrite | Directory CRUD later; no dummy rows once backend wired. |
| `/app/teachers` | `frontend/src/app/(app)/app/teachers/*` | defer module rewrite | Directory CRUD later. |
| `/app/users` | `frontend/src/app/(app)/app/users/*` | defer module rewrite | Auth/RBAC wiring later. |
| `/app/tenants` | `frontend/src/app/(app)/app/tenants/*` | defer module rewrite | Tenant/theme foundation later. |
| `/app/subjects` | `frontend/src/app/(app)/app/subjects/*` | defer module rewrite | Academic model later. |
| `/app/subject-groups` | `frontend/src/app/(app)/app/subject-groups/*` | defer module rewrite | Academic model later. |
| `/app/courses` | `frontend/src/app/(app)/app/courses/*` | defer module rewrite | Course offering model later; header/control style remains source reference. |
| `/app/course-monitoring` | `frontend/src/app/(app)/app/course-monitoring/*` | defer module rewrite | Analytics/monitoring later. |
| `/app/learn` | `frontend/src/app/(app)/app/learn/*` | defer module rewrite | Student learning journey later. |
| `/app/exams` | `frontend/src/app/(app)/app/exams/*` | defer critical module rewrite | Exam module must be backend-first and no external API critical dependency. |
| `/app/exams/[id]/*` | detail, monitor, grading, performance | defer critical module rewrite | Preserve tab/header patterns; backend contract later. |
| `/app/exam-gate/[id]` | `exam-gate-domain.ts`, page | defer critical module rewrite | Student must use Exam Gate before take-exam. |
| `/app/take-exam/[id]` | `take-exam-domain.ts`, page | defer critical module rewrite | Extreme reliability path. |
| `/app/exam-result/[id]` | result domain/page | defer module rewrite | Student result view later. |
| `/app/phase-1-review` | phase review files | delete/defer | Internal review artifact; not product route for clean scope. |

## Frontend Layout and Components

| Area | Prototype Files | Target Action |
|---|---|---|
| App shell | `components/layout/app-shell.tsx` | rewrite/port locked shell structure |
| Sidebar | `components/layout/sidebar.tsx` | rewrite/port navigation pattern |
| Topbar | `components/layout/topbar.tsx` | rewrite/port header controls |
| Mobile nav | `components/layout/mobile-nav.tsx` | rewrite/port responsive shell |
| AI sidecar | `components/layout/ai-chat-panel.tsx` | rewrite/port dark shell and scroll behavior |
| User menu | `components/layout/user-button.tsx` | rewrite/port later auth-aware behavior |
| Route guard | `components/security/route-guard.tsx` | rewrite later with real auth/RBAC |
| Base UI | `components/ui/*` | selective rewrite/port; keep premium custom controls, no cramped native controls |
| Exam shell | `components/exam/secure-exam-shell.tsx` | defer for exam critical path |

## Backend Source Surfaces

Prototype backend has a broad Go modular monolith implementation and is reference-only. Target backend must be rebuilt from audit-first foundations.

Major prototype backend areas:

| Area | Prototype Files | Target Action |
|---|---|---|
| API boot/server | `backend/cmd/api/main.go`, `internal/app/*` | rewrite in ISSUE-005 |
| Config/logging/db | `internal/platform/config`, `db`, HTTP health | rewrite in ISSUE-005 |
| Migration runner | `internal/platform/migrate`, `migrations/*` | rewrite in ISSUE-006 |
| Auth/session/RBAC | `internal/modules/auth`, `platform/authctx` | rewrite in ISSUE-007+ |
| Tenancy/theme | `internal/modules/tenancy`, `platform/tenantctx` | rewrite with tenant isolation baseline |
| Academic | `internal/modules/academic`, classes, students | rewrite in academic issues |
| Courses | `internal/modules/courses` | rewrite in course issues |
| Exams | `internal/modules/exams` | rewrite in exam issues; shock absorber required |
| Analytics | `internal/modules/analytics` | defer optional ClickHouse path |
| Cache/streaming | `platform/cache`, `platform/streaming` | rewrite as infra foundation |
| Seeds/scripts | `seeds/*`, `scripts/*` | reference only; create clean seed strategy later |

## Existing Prototype Docs

| Doc | Target Action |
|---|---|
| `docs/INTEGRATION_PLAN.md` | reference link only |
| `docs/LMS_INDONESIA_DEVELOPMENT_PLAN.md` | reference link only |
| `docs/NEXT_PHASE_PLAN.md` | reference link only |
| `docs/db-backend-foundation-plan.md` | reference link only |
| `docs/issues/lms_morfosis_issues.md` | reference link only |
| `docs/issues/exam-wiring.md` | reference link only |
| `docs/prd/lms_morfosis_core.md` | reference link only |
| `docs/prd/exam-wiring.md` | reference link only |
| `docs/prd/ai-agent-conversation-memory-runtime.md` | reference link only; BYO AI later |
| `docs/tdd-surface-pages-checklist.md` | reference link only |

## Generated / Runtime Folders

Ignore for rewrite source-of-truth:

- `node_modules/`
- `.next/`
- coverage/build artifacts if present
- archive folders under `/home/bayw/Documents/Morfosis/morfoschools/_archives`

## Audit Conclusion

Prototype contains valuable UX/domain references, but clean rewrite scope remains limited to approved ISSUE #0-#11 and current routes: `/`, `/login`, `/app`, `/app/gallery`, `/ui-gallery`, `/api/ai-chat`. All other prototype modules are inventoried for future FE+BE issue execution, not copied now.
