# PRD — MORFOSCHOOLS Production Rewrite

## 1. Overview

MORFOSCHOOLS Production Rewrite adalah program rewrite bertahap dari `morfosis/morfoschools_prototype` ke repository target `morfosis/morfoschools`. Rewrite ini bukan proses copy-paste atau migrasi file mentah, melainkan **prototype-to-production modular rewrite**: setiap module dipindahkan satu per satu sambil memperbaiki arsitektur, database, security, RBAC, frontend architecture, backend architecture, dan kesiapan integrasi AI Agents.

Target akhir adalah codebase LMS sekolah Indonesia yang production-grade, multi-tenant, aman, mudah diuji per module, dapat berjalan via Docker Compose di infrastruktur VPS terbatas, dan memiliki jalur exam/CBT yang sangat reliabel.

Prototype tetap menjadi **visual dan functional reference**. Implementasi target boleh memperbaiki struktur, interaction, loading state, accessibility, database model, security boundary, dan backend architecture selama tetap menjaga visual system dan product intent dari prototype.

## 2. Goals

1. Membangun repository `morfoschools` sebagai rewrite production-grade dari `morfoschools_prototype`.
2. Memindahkan module secara bertahap dengan pola FE + BE selesai bersama per module.
3. Menjadikan security, login, RBAC, tenant isolation, dan audit sebagai fondasi sejak awal.
4. Membangun frontend architecture base yang pixel-perfect terhadap prototype, mendukung dark/light mode, tenant palette, loading state profesional, dan design consistency.
5. Membangun backend Go modular monolith yang rapi, aman, testable, dan mudah dipahami/diakses oleh AI Agents.
6. Membangun database PostgreSQL baru yang lebih solid, multi-tenant, constraint-driven, dan siap untuk academic, courses, exams, RBAC, theme, audit, serta AI runtime.
7. Menyiapkan semua tech stack utama sejak awal melalui Docker Compose: Next.js, Go API, PostgreSQL, PgBouncer, Valkey, NATS JetStream, dan optional ClickHouse profile.
8. Menjamin setiap module memiliki quality gates: tests, typecheck, browser smoke, RBAC checks, loading/error states, security notes, performance notes, OpenAPI docs, dan AI Tool Manifest.
9. Menyiapkan backend contracts agar AI Agents dapat memahami dan memakai module secara deterministic di masa depan.
10. Menyiapkan foundation untuk AI Agent Conversation Memory Runtime sesuai PRD existing agar agent tidak kehilangan context, hemat token, valid, dan tidak halusinasi.

## 3. Non-Goals / Out of Scope

1. Tidak melakukan bulk copy seluruh prototype ke repo target tanpa audit/refactor.
2. Tidak mengimplementasikan AI Agent runtime penuh sebelum backend/module core cukup stabil.
3. Tidak membangun finance module pada rewrite awal; hanya role/permission placeholder yang disiapkan.
4. Tidak membuat ClickHouse sebagai dependency wajib untuk boot aplikasi v1.
5. Tidak menjadikan external APIs seperti Google, AI provider, atau ClickHouse sebagai dependency exam critical path.
6. Tidak membuat full custom CSS editor bebas untuk tenant theme v1; tenant customization dibatasi agar aman dan konsisten.
7. Tidak memakai native browser confirm/alert/validation sebagai UX utama.
8. Tidak mengizinkan AI write action tanpa deterministic backend validation dan confirmation gate.
9. Tidak menyimpan API keys, auth tokens, exam passwords, atau secrets di AI memory.

## 4. Users & Personas

### 4.1 Master Admin

Platform-level operator yang dapat mengelola seluruh tenant/sekolah. Master admin bersifat global, tidak memiliki default tenant, dan dapat act/switch into tenant context secara eksplisit. Semua tindakan act-as harus diaudit.

### 4.2 School Admin

Admin tenant/sekolah yang mengelola user, guru, siswa, staff, guardian, academic structure, courses, exams, dan tenant settings sesuai permission.

### 4.3 Academic Admin

Role operasional akademik yang membantu mengelola kelas, subject, teaching assignments, enrollments, courses, dan exams sesuai scope sekolah.

### 4.4 Teacher

Guru yang membuat course seperti Udemy/Coursera versi sekolah, membuat materi, membuat dan mengelola exam, melakukan grading, memonitor ujian, dan nantinya menggunakan AI untuk membuat soal.

### 4.5 Student

Siswa yang mengakses courses, lessons, resources, exam gate, take exam, receipts, result, dan progress.

### 4.6 Staff

Staff sekolah yang memiliki permission operasional terbatas, misalnya membantu data entry atau administrasi tertentu.

### 4.7 Guardian

Wali/orang tua yang dapat melihat informasi anak sesuai permission.

### 4.8 Finance Staff

Role placeholder untuk future finance module. Tidak ada finance module di rewrite awal.

### 4.9 AI Agent / Internal Tooling

Actor non-human yang nanti dapat mengakses backend melalui service/scoped token dan tool contracts, tetap menggunakan tenant/user/RBAC context dan audit trail.

## 5. Product Principles

1. **Security first** — Login, RBAC, session, tenant isolation, audit, and secure defaults are foundation, not afterthought.
2. **Module-by-module completion** — Module selesai hanya jika FE + BE + DB + RBAC + tests + review notes selesai.
3. **No bulk copy** — Prototype is reference; every file/module must be audited.
4. **Pixel-perfect design continuity** — Target UI follows `morfoschools_prototype` visual system, with allowed improvements in loading, accessibility, and interaction polish.
5. **Every action has feedback** — Every clickable action, especially buttons, must have professional loading/disabled/success/error feedback.
6. **Tenant-aware by default** — Domain data is tenant-scoped unless explicitly platform-global.
7. **AI-ready backend** — Every module must be documented for future AI Agents through OpenAPI and AI Tool Manifest.
8. **Exam critical path independence** — Exam gate/take/autosave/submit/receipt must not depend on external APIs.
9. **Low-spec friendly** — Architecture should work on limited VPS infrastructure and avoid unnecessary heavy dependencies.
10. **Artifact-driven workflow** — PRD → Issues → TDD implementation. Planning artifacts should be append-only after approval.

## 6. Target Tech Stack

| Layer | Technology | Requirement |
|---|---|---|
| Frontend | Next.js App Router | Required |
| Styling | Tailwind v4 + OKLCH tokens | Required |
| Forms | react-hook-form + Zod | Required |
| Data Fetching | Typed API Client + TanStack Query | Required |
| Backend | Go modular monolith | Required |
| Primary DB | PostgreSQL | Required |
| Pooling | PgBouncer | Required from Docker baseline |
| Cache/Locks/Sessions/Theme Cache | Valkey | Required |
| Queue/Shock Absorber | NATS JetStream | Required |
| Analytics | ClickHouse | Optional Docker Compose analytics profile |
| Runtime | Docker Compose | Required |
| AI Provider | OpenAI-compatible BYO/platform provider | Deferred runtime, designed upfront |

## 7. Repository Strategy

1. `morfoschools_prototype` remains the reference implementation and visual source of truth.
2. `morfoschools` is the target repository for all new rewrite artifacts and implementation.
3. Prototype should be treated as read-only except for documentation corrections explicitly requested.
4. Rewrite target should not inherit technical debt blindly.
5. Every migrated area must be classified as: `reuse`, `rewrite`, `split`, `delete`, or `defer`.

## 8. Rewrite Phases

### Phase 0 — Prototype Audit & Rewrite Blueprint

Objective: establish source inventory and target strategy before implementation.

Required artifacts:

```txt
docs/rewrite/PROTOTYPE_INVENTORY.md
docs/rewrite/MODULE_MAP.md
docs/rewrite/DATABASE_AUDIT.md
docs/rewrite/UI_SOURCE_OF_TRUTH.md
docs/rewrite/RISKS_AND_DEBT.md
```

Acceptance criteria:

- Prototype frontend routes, backend modules, DB plans, docs, and components are inventoried.
- Each source area has target action: reuse/rewrite/split/delete/defer.
- Visual source-of-truth pages/components are identified.
- Known technical debt and risks are listed.

### Phase 1 — Secure Infra + Database Foundation

Objective: create a secure platform skeleton with DB foundation from the beginning.

Requirements:

- Docker Compose includes frontend, backend, PostgreSQL, PgBouncer, Valkey, NATS JetStream, and optional ClickHouse profile.
- Backend boots with health endpoints.
- Frontend boots with base shell placeholder.
- Migration runner is available.
- Seed system is available.
- Base schema exists for auth/RBAC/tenant/theme/audit.

Base tables:

```txt
tenants
tenant_theme_settings
users
password_credentials
sessions
tenant_memberships
roles
permissions
role_permissions
user_roles
audit_events
```

Acceptance criteria:

- `docker compose up` boots required services.
- Backend `/healthz` and `/readyz` work.
- Database migrations run repeatably.
- PgBouncer is used in app runtime.
- Valkey and NATS are reachable.
- ClickHouse can be enabled via optional profile but is not required for app boot.

### Phase 1.5 — Frontend Base UI Parity Without Backend Wiring

Objective: after infra is available, build the reviewable frontend base UI from prototype before wiring auth/backend flows. This phase exists to ensure the user can visually validate layout, loader behavior, loading states, base components, and AI-agent shell before backend complexity is introduced.

Scope:

- Login Page UI only.
- Dashboard/admin panel base with sidebar, header/topbar, user/menu states, and AI Agents sidecar UI only.
- UI Gallery containing the reusable components/patterns needed by the app.
- Prototype parity documents and browser visual QA.
- Local/static/demo state is allowed only for visual review; it must be clearly isolated and must not masquerade as backend wiring.

Requirements:

- UI must follow `morfoschools_prototype` source files and tokens; no unapproved visual improvisation.
- Every clickable action has visible pressed/loading/disabled feedback where relevant.
- Login/dashboard/gallery must include skeleton/loading/empty/error examples where appropriate.
- UI Gallery must expose the base component system before domain module pages are migrated.
- Backend integration is explicitly out of scope for this phase except typed placeholders/contracts needed to prevent later rewrites.

Acceptance criteria:

- `/login`, `/dashboard` or `/app`, and `/ui-gallery` run in browser and visually match prototype source of truth.
- App shell includes sidebar + header + AI Agents sidecar/panel.
- UI Gallery demonstrates all base components and states.
- Browser visual QA is performed before marking the phase complete.
- PRD/issues explicitly record that backend wiring comes after this UI parity checkpoint.

### Phase 2 — Login/Auth/RBAC/Tenant Theme Foundation

Objective: secure login and tenant-aware app foundation after the base UI has been visually approved, before domain module rewrite.

Backend requirements:

```txt
POST /api/v1/auth/login
POST /api/v1/auth/logout
GET  /api/v1/auth/me
GET  /api/v1/tenants/current
GET  /api/v1/tenants/current/theme
GET  /api/v1/permissions/me
```

Security/session requirements:

- Browser app uses httpOnly secure cookie session.
- Server-side sessions stored/revocable.
- CSRF protection for unsafe browser methods.
- Login rate limiting.
- Password hashing with industry-grade algorithm such as Argon2id or bcrypt.
- Seeded dev users exist only for development.
- Production master admin bootstrap should be environment-driven or explicit first-boot process.

RBAC requirements:

- Roles and permissions are seedable.
- Role model supports future modules.
- Master admin is global, has no default tenant, and can explicitly act/switch into tenant context.
- All act-as/switch-tenant actions are audited.

Initial roles:

```txt
master_admin
school_admin
academic_admin
teacher
student
staff
guardian
finance_staff
exam_proctor
content_reviewer
```

Tenant theme requirements:

- Tenant can use preset + primary color + accent color + logo.
- Theme config is stored in DB.
- Tenant theme is cached in Valkey.
- Initial render must not blink/flicker.
- Dark/light preference is local browser preference.
- Theme values are injected as CSS variables before UI paint where possible.
- Fallback is Morfosis default theme.

Acceptance criteria:

- User can login/logout.
- `/auth/me` returns user, tenant context, roles, and permissions.
- Master admin can explicitly select tenant context.
- Unauthorized routes/actions are blocked.
- Theme renders without visible color blinking.
- Dark/light toggle works locally.

### Phase 3 — Frontend Architecture Base

Objective: build the pixel-perfect frontend foundation before domain modules.

Requirements:

- App shell follows `morfoschools_prototype` visual system.
- Sidebar/navigation are role-aware.
- Dark/light and tenant palette tokens are integrated.
- Base components are implemented/refactored from prototype as needed.
- Every clickable action supports professional loading state.
- Forms use react-hook-form + Zod.
- Data fetching uses typed API client + TanStack Query.
- Backend-wired pages must not show dummy initial rows.
- AI chat sidecar UI shell is included, but AI runtime is deferred.

Required components:

```txt
Button
InputField
TextareaField
SelectField
FloatingSelect / Combobox
SearchInput
Modal
ConfirmDialog
RightPullSheet
Tabs
Badge / StatusPill
DataTable / ListTable
MetricCard
EmptyState
Skeleton
Toast
FormSection
PageHeader
AppShell
Sidebar
RBACGuard
AIChatPanel shell
```

Interaction contract:

- All buttons have idle/hover/focus/loading/disabled states.
- Mutating actions use loading feedback and success/error feedback.
- Destructive actions use custom ConfirmDialog, never native confirm.
- Form validation uses UI components, never browser native validation messages.
- Adjacent controls must have equal height and consistent spacing.

Acceptance criteria:

- Base shell visually matches prototype.
- Light/dark mode works without layout/color flicker.
- Tenant palette changes are smooth and validated.
- All foundation components have consistent loading/disabled behavior.
- TanStack Query and typed API client are ready for modules.

### Phase 4 — Backend Architecture Base

Objective: establish Go backend architecture for all modules.

Required structure:

```txt
backend/
  cmd/
    api/
      main.go
  internal/
    app/
      server.go
      routes.go
      middleware.go
    platform/
      config/
      db/
      migrate/
      logger/
      httpx/
      auth/
      rbac/
      tenant/
      audit/
      validation/
      ids/
      security/
    modules/
      identity/
      tenants/
      users/
      academic/
      courses/
      exams/
      ai/
    shared/
      pagination/
      errors/
      time/
  migrations/
  seeds/
```

Middleware requirements:

```txt
Request ID
Structured logging
Recovery
CORS
Security headers
Auth/session
Tenant resolution
RBAC authorization
Rate limiting
Body size limit
CSRF for browser unsafe methods
Idempotency key for critical writes
Audit event writer
```

API requirements:

- Standard error envelope.
- Standard pagination/filter/sort pattern.
- Request validation convention.
- OpenAPI documentation convention.
- AI Tool Manifest convention.
- Test helpers for auth, tenant, RBAC, DB, handlers, services.

Standard error envelope:

```json
{
  "error": {
    "code": "forbidden",
    "message": "You do not have access to this resource.",
    "details": {},
    "requestId": "req_..."
  }
}
```

Acceptance criteria:

- New module can be added using established backend template.
- AuthContext and TenantContext are available to handlers/services.
- RBAC checks are centralized and testable.
- Audit events can be emitted for writes.
- Error responses are consistent.

### Phase 5 — Domain Database Baseline

Objective: design and migrate core domain schema before module rewrites.

ID strategy:

```txt
UUID v7 preferred; ULID acceptable fallback if implementation constraints appear.
```

Multi-tenancy:

- Shared-schema multi-tenancy.
- Tenant-scoped domain tables include `tenant_id`.
- Tenant queries must be indexed and policy-enforced.

Common fields for tenant domain tables:

```txt
tenant_id
created_at
updated_at
created_by
updated_by
deleted_at optional
```

Target schema areas:

Platform/Auth:

```txt
tenants
tenant_theme_settings
users
password_credentials
sessions
tenant_memberships
roles
permissions
role_permissions
user_roles
audit_events
```

User Profiles:

```txt
teachers
students
staff_profiles
guardians
student_guardians
```

Academic:

```txt
academic_years
terms
class_sections
subjects
subject_groups
subject_group_members
course_offerings
teaching_assignments
enrollments
```

Courses:

```txt
courses
course_modules
course_lessons
course_resources
course_offerings
course_assignment_rules
course_progress
lesson_progress
```

Exams:

```txt
exams
exam_sections
exam_questions
exam_question_options
exam_targets
exam_gate_windows
exam_prerequisites
exam_eligible_students
exam_attempts
exam_responses
exam_submission_inbox
exam_submission_receipts
exam_integrity_events
exam_grading_tasks
exam_grade_results
```

AI Runtime reserved/planned:

```txt
ai_provider_configs
ai_conversations
ai_messages
ai_conversation_states
ai_memories
ai_tool_invocations
ai_generation_jobs
ai_draft_questions
```

Acceptance criteria:

- Schema supports auth/RBAC/theme from foundation.
- Academic model separates administrative classes from academic assignments.
- Courses support Udemy/Coursera-like learning while remaining school-aware.
- Exams support materialized eligibility and low-cost critical path.
- Essay and short-answer questions include `correct_answer` or structured expected answer/rubric fields so AI-assisted auto grading can compare student responses against authoritative answers.
- AI runtime schema is planned even if not fully implemented yet.

### Phase 6 — User & School Administration Modules

Objective: implement identity and school administration as first functional modules after foundation.

Modules:

```txt
Manage Users
Tenants/Schools
Teachers
Students
Staff
Guardians
Student-Guardian linking
```

Acceptance criteria:

- FE + BE CRUD complete per module.
- Tenant scope enforced.
- RBAC enforced.
- Loading states exist for every action.
- Empty/loading/error states exist.
- Audit events emitted for writes.
- OpenAPI and AI Tool Manifest updated.
- Module review notes written.

### Phase 7 — Academic Structure Modules

Modules:

```txt
Academic Years
Terms/Semesters
Class Sections
Subjects
Subject Groups
Teaching Assignments
Enrollments
```

Acceptance criteria:

- Supports Indonesian school academic structure.
- Supports flexible subject groups/rombongan belajar.
- Supports teacher assignments.
- Supports student enrollments.
- Tenant and RBAC policies are enforced.

### Phase 8 — Courses / Learning Modules

Objective: build Courses as school-aware Udemy/Coursera-like learning module.

Course philosophy:

- Courses can be created by teacher or admin according to permission.
- Courses are reusable across academic years/terms.
- Courses have draft/published/archive status.
- Courses can be assigned to class sections and individual students.
- Courses track student progress.
- Courses may contain modules, lessons, resources, quizzes/assignments later.

Modules:

```txt
Courses
Course Modules
Lessons
Resources
Course Offerings
Course Assignment Rules
Enrollments
Progress
```

Recommended model:

```txt
courses — reusable content package
course_offerings — course offered in academic/tenant context
course_assignment_rules — target class/student/group rules
enrollments — materialized student membership/progress context
```

Acceptance criteria:

- Teacher/admin can create and manage courses.
- Course content is structured into modules/lessons/resources.
- Course can be assigned to class or individual student.
- Student progress is tracked.
- External video/docs remain metadata/reference where possible.

### Phase 9 — Exam Management Modules

Modules:

```txt
Exam Directory
Exam Create/Edit
Exam Sections
Questions
Targets
Gate Windows
Prerequisites
Publish Flow
Materialized Eligibility
```

Acceptance criteria:

- Teacher/admin can create exams.
- Questions support MC/essay/short-answer as needed.
- MC questions include answer key/options.
- Essay and short-answer questions include correct answer / expected answer and optional rubric metadata to support future AI-assisted auto grading.
- Exam publish calculates materialized eligibility.
- Runtime gate does not perform heavy target/prerequisite joins.
- RBAC prevents unauthorized exam access or management.

### Phase 10 — Exam Critical Path

Modules:

```txt
Exam Gate
Take Exam
Autosave
Submit
Receipt
Integrity Events
Attempt Locking
```

Critical rule:

```txt
No external API dependency in exam critical path.
```

Reliability requirements:

- Autosave is cheap and resilient.
- Submit writes append-only durable record and returns digital receipt quickly.
- Inbox pattern + NATS JetStream is used for shock absorption where applicable.
- Materialized eligibility is used for gate/runtime checks.
- Student receives verifiable receipt.
- External APIs such as Google, AI provider, and ClickHouse are not required for exam taking/submission.

Acceptance criteria:

- Student can pass gate, take exam, autosave, submit, and receive receipt.
- Submit path remains durable under load-oriented design.
- Integrity/security events are append-only and tenant-scoped.
- Attempt locking prevents double-submit/race issues.

### Phase 11 — Teacher Operations

Modules:

```txt
Exam Monitor
Grading
Performance
Reports/Export
```

Acceptance criteria:

- Teacher/admin can monitor attempts.
- Manual grading works for essay/short-answer.
- AI-assisted auto grading can use correct answer / expected answer fields for essay and short-answer evaluation when AI runtime is enabled.
- Performance views do not block critical exam path.
- Reports/exports are tenant-scoped.

### Phase 12 — AI Agent Runtime

Objective: implement ChatGPT-class AI runtime after core backend modules are stable.

Reference PRD:

```txt
morfoschools_prototype/docs/prd/ai-agent-conversation-memory-runtime.md
```

Provider requirements:

- Supports BYO base URL/IP, API key, and model.
- Supports platform default provider.
- Provider priority:
  1. user BYO
  2. tenant BYO
  3. platform default
- API keys encrypted at rest and never exposed to frontend.

Runtime requirements:

- Frontend sends `conversationId + latestMessage + session`, not full message history.
- Backend persists conversations/messages.
- Backend maintains typed conversation state.
- Context builder assembles compact curated context.
- Tool/backend actions are deterministic and auditable.
- AI never claims write success without successful backend response.
- Long-running or long-output flows such as question generation should use jobs/drafts/batches rather than relying on one giant chat response.
- AI-assisted essay/short-answer grading uses stored correct answer / expected answer / rubric fields as authoritative references, not only the model's general knowledge.

Acceptance criteria:

- Long conversation remains coherent without sending full history.
- Context builder enforces budget and preserves critical state.
- AI tool invocations are logged.
- Memory is tenant-scoped and redacted.
- Question generation produces structured drafts before confirmed insertion.

## 9. Frontend Requirements

### 9.1 Visual System

- Must match `morfoschools_prototype` as visual source of truth.
- Allowed improvements: loading, accessibility, responsive behavior, interaction feedback, error states, and theme adaptation.
- Use OKLCH-based palette and premium school SaaS aesthetic.
- Avoid generic/basic templates and AI-looking neon gradients.

### 9.2 Dark/Light + Tenant Palette

- App supports dark and light mode.
- User mode preference is local browser preference.
- Tenant color palette is stored in DB.
- Tenant theme supports preset + primary color + accent color + logo.
- Initial paint should not visibly blink due to theme fetch.
- Tenant theme values should be resolved server-side or cached before render where possible.
- Valkey caches tenant theme by tenant ID/version.

### 9.3 Loading State Standard

Every button/action must have:

```txt
idle
hover
focus-visible
loading
disabled
success/error feedback where applicable
```

Mutating actions must:

- prevent duplicate submit/click where necessary,
- show per-action or per-row loading state,
- use toast/status feedback,
- use custom ConfirmDialog for destructive actions.

### 9.4 Data UX

Backend-wired pages must include:

- skeleton loading,
- empty state,
- error state,
- no dummy/mock initial rows,
- safe API normalizers,
- consistent table/list controls,
- equal-height adjacent controls.

## 10. Backend Requirements

### 10.1 AuthContext

Backend must derive a consistent context for every request:

```go
type AuthContext struct {
    UserID string
    TenantID *string
    EffectiveTenantID *string
    Roles []string
    Permissions []string
    SessionID *string
    ActorType string // user, service, ai_agent
    ActingAs *string
}
```

### 10.2 Tenant Isolation

- Tenant-scoped endpoints must require effective tenant context.
- Master admin global actions must be separated from tenant-scoped actions.
- All tenant-scoped queries must include tenant filters.
- Cross-tenant access attempts return forbidden/not found according to security policy.

### 10.3 RBAC

- Permission checks must be centralized and testable.
- Frontend RBAC hiding is convenience only; backend RBAC is source of truth.
- AI/service tokens must not bypass RBAC unless explicitly platform-internal and audited.

### 10.4 Audit

Audit writes and sensitive reads/actions:

```txt
login/logout
master tenant switch
create/update/delete users
role changes
tenant theme changes
course publish/assignment
exam publish
exam gate/security events
exam submit/manual grade
AI provider config changes
AI tool invocations/write actions
```

## 11. AI Tool Manifest Requirements

Every module should include AI-facing documentation in addition to OpenAPI.

Example manifest sections:

```txt
Intent name
User phrases
Required permission
Endpoint/service action
Required fields
Optional fields
Validation rules
Clarification questions
Confirmation required
Success proof
Failure cases
Audit event
```

Example success proof rule:

> AI may only say “berhasil dibuat/disimpan” after backend returns successful status and verifiable resource ID or saved record.

## 12. Module Definition of Done

A module is complete only when:

```txt
[ ] Prototype source audited
[ ] Target data model decided
[ ] Migration written
[ ] Backend API implemented
[ ] Backend tests pass
[ ] RBAC enforced
[ ] Audit events emitted for writes
[ ] OpenAPI updated
[ ] AI Tool Manifest updated
[ ] Frontend implemented with real API
[ ] All buttons/actions have loading states
[ ] Empty/loading/error states implemented
[ ] No dummy initial API rows
[ ] Typecheck/tests pass
[ ] Browser smoke pass
[ ] Security notes added
[ ] Performance notes added
[ ] Module review notes written
```

Module review notes path:

```txt
docs/rewrite/module-reviews/<module>.md
```

Review notes should include:

```txt
Implemented routes
Backend endpoints
Seeded test users
Manual test steps
RBAC cases
Loading/error states checked
Known limitations
Next follow-up
```

## 13. Security Requirements

1. Browser tokens must not be stored in localStorage.
2. Use httpOnly secure cookies for browser sessions.
3. Use CSRF protection for unsafe browser requests.
4. Rate-limit login and sensitive endpoints.
5. Use secure password hashing.
6. All tenant data must be tenant-scoped.
7. All write actions should emit audit events.
8. Destructive actions require confirmation in UI.
9. AI write actions require deterministic backend execution and confirmation gates.
10. Theme customization must be validated to prevent CSS injection.
11. BYO AI provider keys must be encrypted at rest and never logged/exposed.
12. Exam passwords/secrets must not be stored in AI memory or logs.

## 14. Performance & Reliability Requirements

1. App must remain low-spec VPS friendly.
2. PgBouncer should be used for backend DB connections.
3. Valkey should cache tenant theme and other short-lived data where useful.
4. NATS JetStream should be available for shock absorber workflows.
5. ClickHouse is optional and must not block app boot.
6. Exam critical path must rely on local app services and primary storage only.
7. Exam eligibility should be materialized before runtime spikes.
8. Submit/autosave paths should avoid heavy joins and external calls.
9. Frontend should avoid layout/theme flicker and unnecessary repeated theme DB reads.
10. Bundle and page performance should be monitored during module implementation.

## 15. User Stories

### Foundation

1. As a master admin, I want to login securely so I can manage tenants from a global account.
2. As a master admin, I want to explicitly switch into a tenant context so that tenant actions are clear and auditable.
3. As a school admin, I want a role-aware sidebar so I only see modules I can access.
4. As any user, I want every action button to show loading feedback so I know the app is processing.
5. As a tenant admin, I want to set school branding so the LMS feels owned by my school.
6. As a user, I want dark/light mode so the app is comfortable to use.

### Administration

7. As a school admin, I want to manage users, teachers, students, staff, and guardians so school data is complete.
8. As a school admin, I want RBAC enforced server-side so users cannot access data outside their permissions.
9. As a guardian, I want to see only my linked student data so privacy is preserved.

### Academic

10. As an academic admin, I want to manage academic years, terms, classes, subjects, and subject groups so school structure matches Indonesian operations.
11. As a teacher, I want teaching assignments to be explicit so course/exam permissions are correct.

### Courses

12. As a teacher, I want to create reusable courses with modules and lessons so students can learn like a structured online course.
13. As a teacher/admin, I want to assign courses to classes or individual students so learning can be targeted.
14. As a student, I want course progress tracked so I know what I have completed.

### Exams

15. As a teacher, I want to create and publish exams with questions, targets, and schedules so students can take assessments.
16. As a teacher creating essay or short-answer questions, I want to define the correct/expected answer so AI-assisted grading has an authoritative reference.
17. As a student, I want to pass an exam gate before taking an exam so access rules are clear.
18. As a student, I want autosave and reliable submit receipt so my answers are safe.
19. As a teacher, I want monitor/grading/performance tools so I can operate exams effectively.

### AI

20. As a teacher, I want AI to help draft questions without losing context so I can create exams faster.
21. As a teacher, I want AI-assisted essay grading to compare against correct/expected answers so grading is more valid and less hallucinated.
22. As an admin, I want AI actions to validate backend data before claiming success so I can trust the agent.
23. As a tenant, I want to use BYO AI provider or platform default so AI usage can match our policy/cost.

## 16. Success Metrics

1. Secure platform skeleton boots via Docker Compose.
2. Login/RBAC/theme foundation works before domain modules.
3. Each module can be functionally tested immediately after completion.
4. Every backend-wired page has loading/empty/error state and no dummy initial API rows.
5. Every button/action has professional loading feedback.
6. Backend modules are documented with OpenAPI and AI Tool Manifest.
7. Tenant isolation and RBAC checks are covered by tests for sensitive modules.
8. Exam critical path remains independent from external APIs.
9. Essay/short-answer questions persist correct/expected answer data for future AI-assisted grading.
10. AI runtime, when implemented, can handle long conversations via server-side memory/context builder.
11. UI remains visually consistent with `morfoschools_prototype` while supporting dark/light and tenant palette.

## 17. Open Questions / Deferred Decisions

1. Exact AI question generation batching and validation strategy will be decided during AI Runtime phase.
2. Exact production master admin bootstrap process needs implementation decision during Phase 1/2.
3. Whether OpenAPI will be manually maintained or generated from Go route/schema definitions remains to be decided.
4. Exact UUID v7 library/tooling choice for Go/PostgreSQL should be validated during backend foundation.
5. Exact load test targets for exam critical path should be finalized before Phase 10.

## 18. Related Existing References

```txt
morfoschools_prototype/docs/prd/lms_morfosis_core.md
morfoschools_prototype/docs/db-backend-foundation-plan.md
morfoschools_prototype/docs/prd/ai-agent-conversation-memory-runtime.md
morfoschools_prototype/docs/prd/exam-wiring.md
morfoschools_prototype/docs/tdd-surface-pages-checklist.md
```
