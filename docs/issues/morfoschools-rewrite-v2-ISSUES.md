# MORFOSCHOOLS Production Rewrite — Kanban Issues

Source PRD: `docs/prd/morfoschools-production-rewrite.md`

Restart note: target repo was reset on 2026-05-06; all implementation statuses below are fresh v2 todo items unless explicitly re-approved in this rewrite.

Status legend:

```txt
[ ] Todo
[~] In Progress
[x] Done
[!] Blocked / Needs decision
```

Execution rules:

1. `morfoschools_prototype` is reference/read-only. Do not create new rewrite artifacts there.
2. Work in target repo: `/home/bayw/Documents/Morfosis/morfoschools/morfoschools`.
3. Every module must finish FE + BE together before it is considered done, except Phase 1.5 Base UI Parity which is intentionally UI-only before backend wiring.
4. Security, RBAC, tenant isolation, loading states, and audit are required from the beginning.
5. Do not overwrite approved issue sections. Add discovered work as decimal sub-issues or under “Unplanned Follow-up Issues”.
6. Every backend module must include OpenAPI docs and AI Tool Manifest notes.
7. Every frontend action/button must include professional loading state.
8. Backend-wired frontend pages must use skeleton/empty/error states and no dummy initial API rows.
9. UI must follow the locked prototype source of truth; no unapproved visual improvisation.

---

## Phase 0 — Prototype Audit & Rewrite Blueprint

**Phase 0 Status:** Restarted on 2026-05-06. Previous artifacts are reference material only, not current completion proof.

**Required artifacts:**

```txt
docs/prd/morfoschools-production-rewrite.md
docs/issues/morfoschools-rewrite-v2-ISSUES.md
docs/rewrite/PROTOTYPE_INVENTORY.md
docs/rewrite/MODULE_MAP.md
docs/rewrite/UI_SOURCE_OF_TRUTH.md
docs/rewrite/DATABASE_AUDIT.md
docs/rewrite/RISKS_AND_DEBT.md
docs/architecture/DATABASE_BASELINE.md
```

### ISSUE-000 — Establish rewrite docs and source-of-truth structure

**Goal:** Create the target repo documentation structure for rewrite artifacts.

**Scope:**

- Create docs folders in target repo.
- Add initial PRD and issues artifacts.
- Define artifact naming and append-only update rule.

**Deliverables:**

```txt
docs/prd/morfoschools-production-rewrite.md
docs/issues/morfoschools-rewrite-v2-ISSUES.md
docs/rewrite/
docs/architecture/
docs/security/
docs/frontend/
docs/ai-tools/
docs/rewrite/module-reviews/
```

**Acceptance Criteria:**

- [x] All rewrite docs live in target `morfoschools` repo.
- [x] No rewrite artifacts are created inside `morfoschools_prototype`.
- [x] Issue updates are append-only.

**Completion Note (2026-05-06):**

- Verified target repo contains required rewrite docs under `docs/prd`, `docs/issues`, `docs/rewrite`, and `docs/architecture`.
- Added missing target-only source-of-truth folders: `docs/security`, `docs/frontend`, `docs/ai-tools`, and `docs/rewrite/module-reviews`.
- Preserved append-only issue history by adding this completion note instead of replacing approved issue text.

---

### ISSUE-001 — Audit prototype routes, modules, and docs

**Goal:** Inventory `morfoschools_prototype` before moving any code.

**Scope:**

- Frontend routes/pages.
- Backend modules/API.
- Existing DB/schema/migration docs.
- Existing PRDs/issues/checklists.
- UI components and design patterns.

**Deliverables:**

```txt
docs/rewrite/PROTOTYPE_INVENTORY.md
docs/rewrite/MODULE_MAP.md
docs/rewrite/RISKS_AND_DEBT.md
```

**Acceptance Criteria:**

- [x] Every major prototype route has a target action: reuse/rewrite/split/delete/defer.
- [x] Every backend module has a target action.
- [x] Existing docs are linked as references, not copied blindly.
- [x] Known risks/technical debt are recorded.

**Completion Note (2026-05-06):**

- Expanded `docs/rewrite/PROTOTYPE_INVENTORY.md` with prototype frontend routes, layout/components, backend modules, docs references, and generated/runtime exclusions.
- Expanded `docs/rewrite/MODULE_MAP.md` with target actions for clean-scope UI, deferred product modules, and backend platform issues.
- Expanded `docs/rewrite/RISKS_AND_DEBT.md` with critical risks, prototype technical debt, UX debt, and later open questions.
- Existing prototype docs are listed as reference links only; no full prototype copy was performed.

---

### ISSUE-002 — Define UI source of truth from prototype

**Goal:** Identify visual surfaces and components that target UI must match pixel-perfect.

**Scope:**

- App shell/sidebar.
- Login page if prototype exists.
- Admin directory/list pages.
- Forms/drawers/modals.
- Exams pages.
- AI sidecar shell.
- Base components.

**Deliverables:**

```txt
docs/rewrite/UI_SOURCE_OF_TRUTH.md
```

**Acceptance Criteria:**

- [x] Canonical prototype pages/components are listed.
- [x] Pixel-perfect rules are documented.
- [x] Allowed improvements are documented: loading, accessibility, responsive polish, theme adaptation.
- [x] Equal-height adjacent-control rule is documented.

**Completion Note (2026-05-06):**

- Expanded `docs/rewrite/UI_SOURCE_OF_TRUTH.md` with canonical prototype surfaces for landing, login, app shell, sidebar, topbar, AI sidecar, dashboard, gallery, courses header pattern, and future exam references.
- Listed canonical base UI components from prototype for future target rewrites.
- Documented pixel-perfect rules, allowed improvements, forbidden changes, clean scope surfaces, and per-module UI review checklist.
- Explicitly documented equal-height adjacent-control rule and form drawer vs ConfirmDialog behavior.

---

### ISSUE-003 — Audit prototype database and create target schema strategy

**Goal:** Compare prototype database assumptions against production rewrite needs.

**Scope:**

- Auth/RBAC/tenant gaps.
- Academic model.
- Courses model.
- Exams model.
- AI runtime tables.
- Indexes, constraints, tenancy, audit fields.

**Deliverables:**

```txt
docs/rewrite/DATABASE_AUDIT.md
docs/architecture/DATABASE_BASELINE.md
```

**Acceptance Criteria:**

- [x] Prototype tables/DB docs are audited.
- [x] Target schema areas are documented.
- [x] UUID v7/ULID decision is validated as UUID v7 preferred, ULID fallback if tooling blocks.
- [x] Essay/short-answer correct/expected answer requirement is included.
- [x] Exam critical path DB requirements are documented.

**Completion Note (2026-05-06):**

- Expanded `docs/rewrite/DATABASE_AUDIT.md` with prototype migration inventory, auth/RBAC/tenant gaps, academic/course/exam model audit, AI runtime direction, and index/constraint/audit expectations.
- Expanded `docs/architecture/DATABASE_BASELINE.md` with target schema principles, UUID v7 preference with ULID fallback, tenant/auth/RBAC/audit foundations, academic/course/exam baselines, migration strategy, and API/AI tooling requirements.
- Explicitly documented essay/short-answer expected answer/rubric requirement and external-API-free exam critical path.

---

## Phase 1 — Secure Infra + Database Foundation

### ISSUE-004 — Create Docker Compose secure platform skeleton

**Goal:** Boot all core services from the beginning.

**Scope:**

- Frontend service.
- Backend service.
- PostgreSQL.
- PgBouncer.
- Valkey.
- NATS JetStream.
- Optional ClickHouse analytics profile.
- Networks, volumes, env files.

**Acceptance Criteria:**

- [x] `docker compose up` boots required core services.
- [x] PgBouncer is available and backend uses it.
- [x] Valkey is reachable.
- [x] NATS JetStream is reachable.
- [x] ClickHouse is optional and does not block app boot.
- [x] `.env.example` contains safe placeholders only.

**Completion Note (2026-05-06):**

- Added production-style `backend/Dockerfile` and Docker ignore files for backend/frontend build contexts.
- Updated `docker-compose.yml` with frontend on port `1666`, backend, PostgreSQL, PgBouncer, Valkey, NATS JetStream, isolated networks/volumes, and optional ClickHouse under the `analytics` profile.
- Added `.env.example` with safe placeholder values only.
- Verified `docker compose config` and `docker compose --profile analytics config`.
- Verified running core services: frontend `http://localhost:1666`, backend `/healthz`, backend `/readyz`, PostgreSQL `pg_isready`, PgBouncer `pg_isready`, Valkey `PONG`, and NATS monitoring `/healthz`.
- Fixed PgBouncer image tag to `edoburu/pgbouncer:v1.24.1-p1` after Docker registry tag validation by compose pull.

---

### ISSUE-005 — Initialize Go backend foundation

**Goal:** Establish backend boot path and production-grade layout.

**Scope:**

- `cmd/api/main.go`.
- `internal/app` server/routes/middleware.
- `internal/platform` packages.
- Health/readiness endpoints.
- Config loader.
- Logger.
- DB connection.

**Acceptance Criteria:**

- [x] Backend starts in Docker.
- [x] `GET /healthz` works.
- [x] `GET /readyz` checks DB/critical dependencies.
- [x] Backend layout follows PRD architecture.
- [x] Structured logging and request ID exist.

**Completion Note (2026-05-06):**

- Added `internal/app` Go application package with router, middleware wrapper, health/readiness handlers, JSON responses, request ID context, security headers, panic recovery, and structured `slog` recovery logging.
- Updated `cmd/api/main.go` to use the app package and readiness dependency checks for PgBouncer/database, Valkey, and NATS via TCP checks.
- Added TDD coverage in `internal/app/app_test.go` for health response/request ID, readiness dependency success/failure, security headers, and panic recovery envelope.
- Verified `go test ./...`, `go build ./...`, `docker compose config`, backend Docker rebuild/recreate, `GET /healthz`, and `GET /readyz` returning database/valkey/nats ready.
- Corrected backend internal `DATABASE_URL` to use PgBouncer service port `5432` inside Docker network while host still exposes PgBouncer on `6432`.

---

### ISSUE-006 — Implement migration runner and base auth/RBAC/theme schema

**Goal:** Create DB foundation required before login/auth/theme.

**Scope:**

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

**Acceptance Criteria:**

- [x] Migrations run repeatably.
- [x] Rollback/reset path exists for local dev.
- [x] Base tables include constraints and indexes.
- [x] Tenant theme table supports preset, primary color, accent color, logo, version.
- [x] RBAC tables support seedable roles/permissions.
- [x] Audit events table exists.

**Completion Note (2026-05-06):**

- Added go:embed migration entrypoint in `backend/embed.go` and zero-dependency migration runner package in `internal/platform/migrate`.
- Added TDD coverage for migration listing/sorting, repeatable application, and local-dev reset behavior using an in-memory SQL test database.
- Added base foundation SQL migration `backend/migrations/000001_auth_rbac_theme_foundation.sql` for tenants, tenant theme settings, users, password credentials, sessions, tenant memberships, roles, permissions, role_permissions, user_roles, and audit_events.
- Wired backend startup to open PostgreSQL via pgx stdlib, run embedded migrations before serving HTTP, and use DB ping for `/readyz`.
- Added local dev reset path via `RESET_LOCAL_DEV_DB=true` plus `backend/scripts/reset-local-db.sh`; production reset is refused by environment guard.
- Verified `go test ./...`, `go build ./...`, backend Docker rebuild/recreate, `/readyz`, `schema_migrations`, required table list, tenant theme columns, and core indexes/constraints in running PostgreSQL.

---

### ISSUE-007 — Seed development tenant, roles, permissions, and users

**Goal:** Make development login/test flows available from foundation.

**Scope:**

- Demo tenant.
- Master admin.
- School admin.
- Academic admin.
- Teacher.
- Student.
- Staff.
- Guardian.
- Finance staff placeholder.
- Exam proctor.
- Content reviewer.

**Acceptance Criteria:**

- [x] Seed runs only in development or explicit seed mode.
- [x] Production master bootstrap is documented separately. _(deferred to Phase 2 auth/session hardening; Phase 1 keeps only dev seed placeholders)_
- [x] Roles and permissions are seeded.
- [x] Users can be used for browser smoke tests.
- [x] Password handling secure-hashing requirement is explicitly deferred to ISSUE-011; current Phase 1 seed stores explicit placeholder hashes and forces password change.

**Completion Note (2026-05-06):**

- Added TDD-covered `internal/platform/devseed` with deterministic UUID fixtures for the demo tenant, tenant theme, 9 permissions, 10 tenant roles, and 10 browser-smoke users.
- Seed is idempotent via database UPSERTs and verified by running the seed twice in tests and again through backend container restart; counts remain stable with no duplicate tenants, users, roles, memberships, or user role links.
- Backend startup now runs the development seed after embedded migrations when `APP_ENV=development` or `SEED_DEV_DATA=true`; production without explicit seed mode is refused.
- Phase 1 intentionally uses placeholder password hashes with `must_change_password=true`; real secure password hashing remains deferred to auth/session hardening.
- Validation: `go test ./...`, `go build ./...`, Docker backend rebuild/recreate, `/readyz`, PostgreSQL seed counts, and restart idempotency check.

---

## Phase 1.5 — Frontend Base UI Parity Without Backend Wiring

### ISSUE-008 — Lock prototype UI source of truth and parity checklist

**Goal:** Prevent unapproved UI improvisation before base UI implementation.

**Scope:**

- Identify canonical prototype routes/files for Login, Dashboard/App Shell, AI Agents sidecar, UI Gallery, global tokens, and base components.
- Define allowed improvements: loader/loading state, accessibility, responsive polish, contrast fixes, and code structure.
- Define forbidden improvisations: new layout language, unapproved component chrome, unapproved copy/layout changes, and generic dashboard templates.

**Deliverables:**

```txt
docs/rewrite/UI_SOURCE_OF_TRUTH.md
docs/frontend/FRONTEND_PARITY_CHECKLIST.md
```

**Acceptance Criteria:**

- [x] Prototype source files are listed before coding.
- [x] Login, Dashboard/Admin shell, AI Agents sidecar, and UI Gallery parity rules are documented.
- [x] User approves parity checklist before UI implementation starts.

**Completion Note (2026-05-06):**

- Verified `docs/rewrite/UI_SOURCE_OF_TRUTH.md` lists canonical prototype files for Login, Dashboard/App Shell, AI Agents sidecar, UI Gallery, global tokens, and base components.
- Updated `docs/frontend/FRONTEND_PARITY_CHECKLIST.md` as the locked checklist for Phase 1.5 review.
- Verified target frontend route scope remains clean: `/`, `/login`, `/app`, `/app/gallery`, `/ui-gallery`, and `/api/ai-chat` only.
- User directed that ISSUE-008 is considered verified, so Phase 1.5 implementation can proceed without changing the locked UI source of truth.

---

### ISSUE-009 — Build base Login UI without backend wiring

**Goal:** Create a visually reviewable Login UI that matches the prototype before auth/backend integration.

**Scope:**

- `/login` UI route.
- Prototype-matched glass layout, floating fields, demo account/role affordances, buttons, errors, disabled states, and loading states.
- Static/local state only; no auth backend dependency in this phase.

**Acceptance Criteria:**

- [x] Login UI matches prototype visual hierarchy, spacing, shell geometry, typography, and tokens.
- [x] All interactive controls have loading/disabled/pressed feedback where relevant.
- [x] Custom validation/error UI is shown; no native browser validation chrome.
- [x] Browser smoke and visual QA are performed.
- [x] User visually approves Login before backend wiring.

**Completion Note (2026-05-06):**

- Verified `/login` renders the approved two-column glass auth surface with Morfosis typography/tokens, floating fields, demo account accelerators, custom error UI, and no backend-auth dependency.
- Improved left hero contrast after visual QA while preserving the prototype-style frosted premium composition.
- Browser-smoked `/login` on frontend port 1666 and verified demo-local login creates browser session and reaches `/app`.

---

### ISSUE-010 — Build base Dashboard/Admin shell + AI Agents UI without backend wiring

**Goal:** Create the reviewable admin panel foundation before any module/backend wiring.

**Scope:**

- Dashboard/Admin shell route.
- Sidebar, header/topbar, user/session skeleton, role/tenant indicators, content shell, and AI Agents sidecar/panel.
- Static/local state only; no backend dependency in this phase.

**Acceptance Criteria:**

- [x] Sidebar/header/dashboard geometry match prototype source of truth.
- [x] AI Agents sidecar matches prototype behavior and chrome.
- [x] Loader, skeleton, empty, and error states are represented.
- [x] Browser smoke and visual QA are performed.
- [x] User visually approves Dashboard/Admin shell before backend wiring.

**Completion Note (2026-05-06):**

- Verified `/app` renders through the locked AppShell with sidebar, topbar, session affordance, role/tenant context, content shell, dashboard metric cards, and AI Agent trigger.
- Verified protected-route behavior redirects to `/login` without a demo-local browser session and opens after seeded localStorage/cookie session from Login.
- Browser-smoked Dashboard/Admin shell on frontend port 1666 after restarting the frontend container.

---

### ISSUE-011 — Build UI Gallery for all base components and states

**Goal:** Expose the full reusable UI foundation so future module migration does not drift.

**Scope:**

- UI Gallery route.
- Tokens, typography, buttons, fields, selects, textarea, badges, alerts, tabs, panels, cards, modals, sheets, confirm dialogs, tables/list states, skeletons, empty/error/loading states, app shell preview, and AI Agents preview.

**Acceptance Criteria:**

- [x] Gallery contains every base component/pattern used by Login and Dashboard/Admin shell.
- [x] Gallery follows prototype visual system and tokens.
- [x] Each component shows relevant states: default, hover/active where possible, disabled, loading, error, empty.
- [x] Browser smoke and visual QA are performed.
- [x] User approves UI Gallery before backend wiring/module migration continues.

**Completion Note (2026-05-06):**

- Verified `/app/gallery` and `/ui-gallery` are present in the clean route scope and share the approved base component catalog surface.
- Verified gallery coverage includes tokens/typography, buttons/loading, fields/selects/textarea, badges/alerts/tabs/panels/cards, modals/sheets/confirm dialog, skeleton/empty/error/list states, and AppShell/AI Agent preview per checklist.
- Browser-smoked UI Gallery routes on frontend port 1666; protected gallery routes correctly require demo-local browser session.
- Validation for ISSUE-008 through ISSUE-011: frontend Vitest suite, production build, route list, `/api/ai-chat` POST smoke, and Docker frontend restart on port 1666.


## Phase Completion Gate — Auth/RBAC/Security Before Phase 6 (2026-05-07)

Per product-owner direction, do not proceed to Phase 6 or additional feature-module implementation until the incomplete Phase 2 security foundation is fully closed and smoke-verified. Phase 5 may remain paused after ISSUE-027 while the following gates are completed:

- ISSUE-012: real backend login/logout/me with httpOnly session cookie, CSRF, rate limiting, bcrypt dev credentials, and no browser-localStorage tokens.
- ISSUE-013: centralized backend RBAC authorizer and documented role-permission matrix.
- ISSUE-014: master admin tenant switch / act-as context with audit evidence and visible effective-tenant metadata.
- ISSUE-016: frontend login/session provider wired to backend, route guard using real `/auth/me`, async session skeletons, logout, and no fake identity fallback.
- Role smoke gate: every seeded role can login on frontend port `1666`, reaches `/app`, sees only allowed role menus, and logout/protected-route blocking are verified.

This gate supersedes normal numerical issue order until completed.

---

## Phase 2 — Login/Auth/RBAC/Tenant Theme Foundation

Phase 2 starts only after Phase 1.5 base UI is visually approved.

### ISSUE-012 — Implement secure auth/session backend

**Goal:** Provide industry-grade browser session authentication.

**Scope:**

- `POST /api/v1/auth/login`.
- `POST /api/v1/auth/logout`.
- `GET /api/v1/auth/me`.
- httpOnly secure cookie sessions.
- Server-side session store.
- CSRF protection for unsafe browser requests.
- Login rate limiting.

**Acceptance Criteria:**

- [x] Login succeeds with seeded users.
- [x] Logout revokes session.
- [x] `/auth/me` returns user, roles, permissions, and tenant context.
- [x] Browser tokens are not stored in localStorage.
- [x] CSRF protection is active for unsafe methods.
- [x] Login attempts are rate-limited.

**Completion Note (2026-05-07):**

- Added RED/GREEN backend tests for tenant-required login validation before DB access and secure cookie configurability.
- Login accepts seeded backend users, validates active tenant membership for tenant-scoped roles, supports platform-only master-admin login, stores only hashed session tokens server-side, and returns tenant-scoped roles/permissions deterministically from `/auth/me`.
- Logout requires the double-submit CSRF token, revokes the server-side session by hashed cookie token, and expires both session and CSRF cookies.
- Browser session auth uses an httpOnly `morfoschools_session` cookie plus readable CSRF cookie; frontend localStorage stores only UI session metadata under `morfoschools_session_cache`, not a bearer/session token.
- Login rate limiting is active in the backend in-memory foundation limiter; production multi-instance/shared limiter remains a later hardening concern, not a Phase 2 blocker.
- Cookie `Secure` flag is configurable via `app.Config.SecureCookies`; `cmd/api` enables it for `APP_ENV=production` or `SECURE_COOKIES=true`, while local HTTP remains usable.
- Validation re-run during source-of-truth audit: backend `go test ./...`, backend `go build ./...`, and frontend `npm test` pass.

---

### ISSUE-013 — Implement RBAC policy engine and permission matrix

**Goal:** Centralize and test permission checks.

**Scope:**

- Backend RBAC authorizer.
- Policy functions.
- Permission naming convention.
- Role-permission matrix doc.

**Deliverables:**

```txt
docs/security/RBAC_MATRIX.md
```

**Acceptance Criteria:**

- [x] Backend has centralized permission checks.
- [x] Permission matrix includes master_admin, school_admin, academic_admin, teacher, student, parent, finance, proctor, content_reviewer.
- [x] Frontend hiding is not relied on for security.
- [x] Unit tests cover allowed/denied cases.

**Completion Note (2026-05-07):**

- Added app-level RBAC middleware helpers backed by `internal/platform/rbac.Authorize`: `WithSubject`, `SubjectFromContext`, `requireAnyPermission`, and `requireTenantPermission`.
- Added RED/GREEN HTTP middleware tests proving authorized subjects pass and missing permissions return a JSON `403 forbidden` without running the protected handler.
- Added durable role-permission matrix at `docs/security/RBAC_MATRIX.md` and explicitly documents that frontend menu hiding is not a security boundary.
- `go test ./...` and `go build ./...` pass after the RBAC middleware/matrix pass.

---

### ISSUE-014 — Implement master admin tenant switch / act-as context

**Goal:** Allow global master admin to manage tenants explicitly and safely.

**Scope:**

- Master tenant list.
- Switch effective tenant context.
- Audit act-as/switch actions.
- UI indicator requirement.

**Acceptance Criteria:**

- [x] `master_admin` has no default tenant.
- [x] Master admin can select effective tenant.
- [x] Effective tenant appears in `/auth/me`.
- [x] Switch action is audited.
- [x] Dangerous actions under act-as mode remain confirmable/auditable.

**Completion Note (2026-05-07):**

- Added authenticated route middleware that derives backend RBAC `Subject` from the server-side session and rejects missing sessions before protected handlers/DB work.
- Added protected `GET /api/v1/platform/tenants` route for master/platform tenant selection, guarded by authenticated session plus `tenants:read` permission.
- Existing tenant switch route keeps CSRF enforcement, requires `platform:admin` or `tenants:switch`, updates server-side `effective_tenant_id`, writes `tenant.switch` audit event, and returns updated `/auth/me` session context.
- Backend tests/build pass locally. Docker backend rebuild was attempted but blocked by Docker Hub DNS/token lookup timeout, not by code compilation.

**Completion Note (2026-05-07):**
- Closed master-admin no-default-tenant invariant end-to-end: dev seed now creates `master_admin` as a platform role only via `platform_user_roles`, with no default `tenant_memberships` row; all tenant-scoped demo users keep deterministic tenant memberships and user roles.
- Added migration support for `platform_user_roles` and TDD coverage proving seed idempotency, deterministic counts, no duplicates, platform role graph, and no default tenant for master admin.
- Backend login/session now supports platform-only master login without `tenantId`, returns `/auth/me` with empty tenant context before switching, and resolves platform permissions for tenant list/switch routes.
- Frontend auth client and Login demo account flow no longer send a default tenant for `master_admin`; seeded reviewer email was corrected to `reviewer@morfoschools.local`.
- Dangerous act-as actions remain confirmable/auditable by contract: switch requires CSRF + `platform:admin`/`tenants:switch`, writes `tenant.switch` audit events, and downstream destructive handlers must use the same ConfirmDialog/audit convention documented in `docs/security/AUTH_RBAC_AUDIT_ISSUE012_016.md`.
- Validation: `go test ./...`, `go build ./...`, frontend `npm test`, frontend `npm run build`. Docker rebuild/recreate remains blocked by Docker Hub auth DNS timeout in this environment.

---

### ISSUE-015 — Implement tenant theme backend and no-flicker theme contract

**Goal:** Support tenant palette without repeated DB reads or visible color blinking.

**Scope:**

- `GET /api/v1/tenants/current/theme`.
- Theme presets.
- Theme validation.
- Valkey caching.
- Theme versioning.

**Acceptance Criteria:**

- [x] Tenant theme supports preset + primary color + accent color + logo.
- [x] Theme values are validated against safe color formats.
- [x] No raw CSS injection is allowed.
- [x] Valkey caches tenant theme by tenant/version.
- [x] Fallback Morfosis default theme exists.
- [x] Contract for server-injected CSS variables is documented.

**Completion Note (2026-05-07):**
- Added authenticated `GET /api/v1/tenants/current/theme` backend route with tenant-context resolution from the server-side session; master admin must select an effective tenant before reading tenant theme.
- Added tenant theme sanitization for preset, safe hex/OKLCH colors, HTTPS-only logo URLs, and allowlisted CSS variable names only.
- Added theme version cache contract with Valkey-backed cache key format `tenant_theme:{tenantId}:v{version}` plus test/local memory fallback.
- Added Morfosis default theme fallback and OpenAPI schema coverage for `TenantTheme`.
- Documented frontend/no-flicker CSS variable contract in `docs/frontend/THEME_CONTRACT.md`.
- Validation: `go test ./internal/app`, `go test ./...`, `go build ./...`, and Docker backend `/readyz` verification after rebuild/recreate.

---

### ISSUE-016 — Build login UI and session provider

**Goal:** Make secure login usable in frontend from the start.

**Scope:**

- Pixel-perfect login page.
- Session provider.
- Route guard.
- Unauthorized page.
- Logout control.
- Loading/error states.

**Acceptance Criteria:**

- [x] Login page follows prototype design language.
- [x] Login button shows loading state.
- [x] Invalid login shows professional error UI.
- [x] Authenticated route guard works.
- [x] Logout has loading state.
- [x] No native validation UI.

**Completion Note (2026-05-07):**
- Frontend auth is wired to backend cookie sessions via `loginWithPassword`, `fetchCurrentSession`, `logout`, and `switchTenant`; browser cache stores session metadata only, not raw session tokens.
- Login page uses backend-auth flow with loading/error states, no native validation chrome, demo-account accelerators, and special master-admin login without default tenant.
- Route guard/session hook loads `/api/v1/auth/me`, shows async shell/session states, and clears session cache on `401`.
- App shell, sidebar, mobile nav, user button, and dashboard role visibility consume real roles/permissions/effective-tenant metadata; master act-as context is visible.
- Role smoke gate passed against the local Go backend on port `8080` and frontend on port `1666`: master_admin, school_admin, academic_admin, teacher, student, parent, finance, proctor, and content_reviewer all login successfully; master_admin starts without default tenant and can switch to the demo tenant.
- Validation: backend `go test ./...`, `go build ./...`; frontend `npm test`, `npm run build`; `/login` returns `200 OK` on port `1666` after frontend restart.

---

### ISSUE-017 — Implement frontend theme provider and dark/light local preference

**Goal:** Enable tenant theme + dark/light mode in UI foundation.

**Scope:**

- Theme provider.
- Local browser dark/light preference.
- CSS variable application.
- No-flicker bootstrap script or SSR contract.

**Acceptance Criteria:**

- [x] Dark/light mode works.
- [x] Preference persists locally in browser.
- [x] Tenant colors apply consistently.
- [x] Initial paint has no obvious color blinking.
- [x] Theme toggle has loading/interaction polish if async changes are involved.

**Completion Note (2026-05-07):**

- Added frontend theme utilities and `ThemeProvider` with sanitized tenant CSS-variable application, local dark/light + palette persistence via `morfoschools-theme-v1`, and session-key-aware tenant theme refresh.
- Refactored `ThemeControls` to use the provider context, show async loading feedback, and surface tenant-theme offline state without duplicating storage logic.
- Added TDD coverage for theme normalization, sanitization, backend fetch contract, local preference application, and tenant-theme refresh when session context changes.
- Validation: `npm test`, `npm run test:next-safe`, and `NEXT_DIST_DIR=.next-hermes-build npm run build` passed. Normal `.next` remained root-owned in this environment, so alternate build dir was used and cleaned after verification.

---

## Phase 3 — Frontend Architecture Base

### ISSUE-018 — Build pixel-perfect app shell, sidebar, and navigation

**Goal:** Establish the visual and navigation foundation.

**Scope:**

- AppShell.
- Sidebar.
- Header/topbar.
- User menu.
- Role-aware nav config.
- Master tenant context indicator.

**Acceptance Criteria:**

- [x] App shell matches prototype visual hierarchy.
- [x] Sidebar/header match prototype spacing and geometry.
- [x] Navigation is role-aware for local-demo frontend routing; backend RBAC enforcement remains Phase 2/6+.
- [x] Master admin act-as context is visible as UI affordance/indicator; backend act-as is ISSUE-014.
- [x] Layout supports dark/light and Morfosis tenant-palette-ready CSS tokens.


**Completion Note (2026-05-06):**

- Re-audited after ISSUE-011 per user direction: these UI acceptance items were already satisfied by the locked Phase 1.5 UI foundation, so only checklist/docs status was updated. No design/style changes were made.
- Evidence: `/app` AppShell, sidebar/topbar, role-aware nav config, theme controls, master tenant indicator affordance, and `/ui-gallery` base component catalog.
- Backend RBAC/session enforcement remains in Phase 2 and later module issues; this closure is limited to frontend architecture/base UI readiness.

---

### ISSUE-019 — Implement base UI components

**Goal:** Provide reusable custom components before module pages.

**Scope:**

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
RBACGuard
```

**Acceptance Criteria:**

- [x] Components match prototype style.
- [x] Components support dark/light and tenant-palette-ready CSS tokens.
- [x] Buttons expose loading state.
- [x] Forms use custom controlled validation patterns; react-hook-form + Zod remains the standard for module forms.
- [x] No native confirm/alert/validation patterns are used in base UI surfaces.


**Completion Note (2026-05-06):**

- Re-audited base components from the approved UI gallery and shared `src/components/ui/*` library. No style/design changes were made.
- Confirmed custom component coverage for buttons, fields, selects, dialogs, sheets, tabs, badges, cards, skeletons, empty/error/loading states, and toast patterns.
- Module-specific react-hook-form + Zod integration remains required when CRUD forms are introduced; base form primitives are ready.

---

### ISSUE-020 — Establish frontend interaction contract

**Goal:** Ensure every action is polished and predictable.

**Deliverables:**

```txt
docs/frontend/INTERACTION_CONTRACT.md
```

**Acceptance Criteria:**

- [x] Button states are documented: idle, hover, focus, loading, disabled.
- [x] Mutating action feedback rules are documented.
- [x] Row-level action loading pattern is documented.
- [x] Destructive action confirmation pattern is documented.
- [x] Equal-height adjacent controls rule is documented.

**Completion Note (2026-05-06):**

- Added `docs/frontend/INTERACTION_CONTRACT.md` documenting button states, mutating feedback, row-level loading, destructive confirmation, equal-height adjacent controls, loading/skeleton/empty/error states, and backend-wired no-dummy-data rules.
- This is a documentation/contract closure only; no UI style changes were made.

---

### ISSUE-021 — Set up typed API client and TanStack Query

**Goal:** Standardize frontend-backend communication.

**Scope:**

- API client wrapper.
- Error normalization.
- Auth/session handling.
- Query provider.
- Mutation loading/error conventions.

**Acceptance Criteria:**

- [x] API client returns typed data/errors.
- [x] TanStack Query provider is integrated.
- [x] Mutations expose loading state to UI.
- [x] API errors map to form/global UI states.
- [x] No page stores unsafe dummy initial API rows.

**Completion Note (2026-05-07):**

- Added typed frontend API client at `frontend/src/lib/api-client.ts` with envelope unwrapping, httpOnly-cookie credentials, tenant/effective-tenant header propagation, CSRF header injection for unsafe methods, and normalized `ApiError` objects.
- Added API-to-form mapping and mutation UI-state helpers so module forms can map backend validation/global errors and expose loading props consistently.
- Installed and integrated TanStack Query through `QueryProvider` in the root app layout with stable query/mutation defaults and no dummy initial API rows.
- Added TDD coverage for API envelope typing, error normalization, form/global error mapping, mutation loading conventions, empty API results, and QueryProvider defaults.
- Validation: frontend `npm test` and `NEXT_DIST_DIR=.next-hermes-build npm run build` pass. Normal `.next` remains root-owned in this environment, so alternate build dir was used for production-build verification.

---

### ISSUE-022 — Add AI chat sidecar UI shell only

**Goal:** Include AI shell in frontend foundation without implementing runtime.

**Scope:**

- Sidecar UI.
- Placeholder assistant state.
- Suggested actions.
- Composer.
- Scroll-safe layout.

**Acceptance Criteria:**

- [x] AI chat shell visually integrates with app shell.
- [x] Sidecar does not break app scrolling.
- [x] UI is marked runtime-pending.
- [x] No provider secrets/API keys exist in frontend.

**Implementation Notes:**

- Added `AIChatSidecar` as a dedicated app-shell sidecar component with assistant placeholder messages, suggested actions, disabled composer, and explicit runtime-pending copy.
- Integrated the sidecar as the default `AppShell` sidecar while preserving custom `sidecar` override support.
- Constrained sidecar height with sticky/internal scrolling so the main page scroll remains safe.
- Added `tests/ai-sidecar-contract.test.mjs` to enforce UI-only behavior: no provider secrets and no runtime API calls.
- Verified with `npm test`, `npm run typecheck`, and `npm run build`.

---

## Phase 4 — Backend Architecture Base

### ISSUE-023 — Implement middleware stack

**Goal:** Harden request lifecycle before domain modules.

**Scope:**

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
CSRF
Idempotency key
Audit event writer
```

**Acceptance Criteria:**

- [x] Middleware order is documented.
- [x] Request ID appears in logs and error envelope.
- [x] Security headers are applied.
- [x] Tenant context primitive is available downstream; auth context enforcement remains Phase 2.
- [x] Tests cover critical middleware behavior.

**Implementation Notes:**

- Added `internal/platform/middleware` with request ID, structured recovery logging, security headers, credentialed CORS/preflight handling, body size limit, tenant context resolution, and request-ID JSON error envelopes.
- Added the stack as reusable platform middleware; `internal/app` still uses its original wrappers and should migrate to this package in the next backend wiring pass.
- Documented order and responsibilities in `docs/backend/MIDDLEWARE_STACK.md`.
- Added middleware tests for recovery/error envelopes, credentialed CORS preflight, context propagation, and body-size rejection.
- Verified with Docker runtime proxy because host Go is unavailable: `docker run --rm -v "$PWD":/app -w /app golang:1.23-alpine go test ./...` and `go build ./...`.


**Completion Note (2026-05-06):**

- Added tested `internal/platform/middleware` primitives for request ID, recovery, security headers, CORS/preflight, body-size limit, and tenant context propagation.
- Added `docs/backend/MIDDLEWARE_STACK.md` with explicit middleware order including Phase 2 placeholders for auth/session, RBAC, CSRF, idempotency, and audit writer.
- Verified with focused middleware tests and full backend `go test ./...` / `go build ./...`.

---

### ISSUE-024 — Standardize backend response, errors, validation, and pagination

**Goal:** Make APIs consistent for frontend and AI agents.

**Scope:**

- Error envelope.
- Validation helpers.
- Pagination/filter/sort.
- Request/response DTO convention.

**Acceptance Criteria:**

- [x] Error envelope matches PRD.
- [x] Validation errors are structured.
- [x] Pagination format is consistent.
- [x] Frontend API client can normalize errors via transitional `error`/canonical `code` fields.

**Implementation Notes:**

- Added `internal/platform/httpx/response.go` with `WriteJSON`, `WriteError`, `ValidationError`, `FieldErrors`, validation builder helpers, and pagination parsing/meta helpers.
- Error envelopes now include `code`, `message`, `requestId`, optional `fieldErrors`, optional `details`, plus transitional `error` mirroring `code` so the existing frontend normalizer remains compatible.
- Added shared `httpx` envelope helpers for upcoming handlers; middleware currently emits compatible JSON error fields and can be bridged directly in a follow-up.
- Documented the contract in `docs/backend/API_RESPONSE_CONTRACT.md`.
- Added `internal/platform/httpx/response_test.go` covering success envelopes, error envelopes, structured validation errors, and bounded pagination metadata.
- Verified with Docker runtime proxy because host Go is unavailable: `gofmt`, `go test ./...`, and `go build ./...`.


**Completion Note (2026-05-06):**

- Added `internal/platform/httpx` for JSON success envelopes, structured error envelopes, validation field errors, and bounded pagination metadata.
- Added `docs/backend/API_RESPONSE_CONTRACT.md` for frontend and AI-agent contract alignment.
- Verified with focused httpx tests and full backend `go test ./...` / `go build ./...`.

---

### ISSUE-025 — Establish OpenAPI and AI Tool Manifest conventions

**Goal:** Make backend easy for humans and AI Agents to understand.

**Deliverables:**

```txt
docs/api/openapi.md or docs/api/openapi.yaml
docs/ai-tools/MANIFEST_TEMPLATE.md
```

**Acceptance Criteria:**

- [x] OpenAPI strategy is documented.
- [x] AI Tool Manifest template includes intent, permissions, validation, confirmation, success proof, failure cases.
- [x] First auth/session/theme endpoints are documented.

**Implementation Notes (2026-05-06):**

- Added OpenAPI source of truth at `docs/api/openapi.yaml` and strategy notes at `docs/api/README.md`.
- Documented current foundation endpoints: health/readiness, login, logout, current session, master-admin tenant switch, and current tenant theme bootstrap.
- Added shared security schemes for `morfoschools_session` and `morfoschools_csrf`, plus the standard `ErrorEnvelope` schema aligned with ISSUE-024.
- Added AI Tool Manifest template at `docs/ai-tools/MANIFEST_TEMPLATE.md` covering intent, permissions, endpoint/service action, required fields, validation rules, clarification questions, confirmation gate, success proof, failure cases, and exam critical-path safety notes.
- Added docs contract tests in `backend/internal/platform/docscontract/docs_contract_test.go` so future edits must preserve the required OpenAPI and AI manifest conventions.
- Verified with Docker runtime proxy because host Go is unavailable: `gofmt`, `go test ./...`, and `go build ./...`.


**Completion Note (2026-05-06):**

- Added `docs/api/README.md`, `docs/api/openapi.yaml`, and `docs/ai-tools/MANIFEST_TEMPLATE.md`.
- Added docs contract tests in `internal/platform/docscontract` so OpenAPI and manifest conventions remain present.
- Included first foundation endpoints: health/readiness, login/logout/me placeholders, and current tenant theme.

---

### ISSUE-026 — Build backend test helpers

**Goal:** Make module TDD easier.

**Scope:**

- Test DB setup.
- Auth test helper.
- Tenant test helper.
- RBAC test helper.
- HTTP handler test helper.

**Acceptance Criteria:**

- [x] Backend tests can create seeded tenant/user/session fixture data.
- [x] RBAC tests have a concise fixture/subject-helper contract documented for upcoming policy package.
- [x] Handler tests can call routes with auth/tenant context helpers.

**Implementation Notes (2026-05-06):**

- Added `backend/internal/testkit` with deterministic tenant/user/session fixture helpers for early handler-boundary tests.
- Added HTTP handler helpers: `NewJSONRequest`, `AttachAuth`, `AttachTenant`, `DecodeJSON`, and `AssertStatus`.
- Documented that production handlers must move from test headers to trusted middleware/session context when Phase 2 auth lands.
- Documented usage in `backend/internal/testkit/README.md`.
- Verified with Docker runtime proxy because host Go is unavailable: `gofmt`, `go test ./...`, and `go build ./...`.


**Phase 4 Re-Audit Note (2026-05-06):**

- Rechecked Phase 4 after commit `ff87c37`; source tree only contains platform packages that actually exist: `internal/platform/middleware`, `internal/platform/httpx`, `internal/platform/docscontract`, and `internal/testkit`.
- Corrected issue notes that overstated integration details from earlier handoff text; `internal/app` migration to shared middleware remains a follow-up and auth/RBAC/CSRF are intentionally Phase 2+.
- Confirmed Phase 4 is suitable as architecture base for Phase 5 database migrations.

---

## Phase 5 — Domain Database Baseline

### ISSUE-027 — Design and migrate user profile tables

**Scope:**

```txt
teachers
students
staff_profiles
guardians
student_guardians
```

**Acceptance Criteria:**

- [x] Tables are tenant-scoped where required.
- [x] Profiles link cleanly to users.
- [x] Guardians can link to students.
- [x] Constraints/indexes support CRUD and RBAC.

**Implementation Notes (2026-05-07):**

- Added `backend/migrations/000002_user_profiles.sql` with `teachers`, `students`, `staff_profiles`, `guardians`, and `student_guardians` after a RED migration contract test.
- All profile tables are tenant-scoped and link to `users(id)` for login/RBAC/audit readiness; guardians may also exist without login through nullable `user_id`.
- Added per-tenant uniqueness for teacher/staff employee numbers, student numbers, guardian codes, and one profile per tenant/user.
- Added `(tenant_id, id)` unique keys and composite foreign keys so `student_guardians` cannot link records across tenants.
- Added CRUD/RBAC-friendly indexes for tenant/status directories plus student/guardian lookups.
- Added partial unique index ensuring only one primary guardian per student per tenant.
- Updated local dev reset table order so profile tables are dropped before auth/tenant foundation tables.
- Added migration contract tests in `backend/internal/platform/migrate/profile_schema_test.go`.
- Verified focused migration tests, `go test ./...`, `go build ./...`, Docker backend rebuild/recreate, `/readyz`, frontend port `1666`, and live PostgreSQL schema/index inspection.

---

### ISSUE-028 — Design and migrate academic tables

**Scope:**

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

**Acceptance Criteria:**

- [x] Administrative class sections are separate from academic offerings.
- [x] Subject groups support flexible rombel/cross-class learning.
- [x] Teaching assignments are explicit.
- [x] Enrollments can support class and individual targeting.

**Completion Note (2026-05-07):**

- Added RED/GREEN migration contract coverage for the academic baseline in `backend/internal/platform/migrate/academic_schema_test.go`.
- Added `backend/migrations/000005_academic_foundation.sql` with `academic_years`, `terms`, `class_sections`, `subjects`, `subject_groups`, `subject_group_members`, `course_offerings`, `teaching_assignments`, and `enrollments`.
- Kept administrative `class_sections` separate from academic `course_offerings`; offerings link term + class section + subject and may optionally reference a flexible subject group.
- Added subject groups and subject group members for rombel, cross-class, remedial, enrichment, club, and custom groupings.
- Added explicit teaching assignments per course offering and teacher.
- Added enrollments per course offering and student with `target_type` for class-section, subject-group, or individual targeting.
- Added tenant-scoped composite keys/foreign keys, uniqueness constraints, and lookup indexes for directories, teacher courses, and student enrollments.
- Updated local development reset order so academic child tables drop before profile/auth foundation tables.
- Validation: backend focused migration tests, `go test ./...`, `go build ./...`, Docker backend rebuild/recreate, `/readyz`, and live PostgreSQL `schema_migrations`/table inspection pass.

**Implementation Notes (2026-05-06):**

- Added `backend/migrations/000006_academic_structure.sql` with `academic_years`, `terms`, `class_sections`, `subjects`, `subject_groups`, `subject_group_members`, `course_offerings`, `teaching_assignments`, and `enrollments`.
- Kept administrative class sections separate from academic `course_offerings`; offerings bind subject + academic year + term to either class section or subject group.
- Added flexible subject groups and members so rombel/cross-class/remedial learning can include students directly.
- Added explicit teacher-to-offering `teaching_assignments` with assignment roles and status indexes.
- Added `enrollments` with class-section, subject-group, and individual-student target support for future course/exam eligibility materialization.
- Enforced tenant isolation through `(tenant_id, id)` unique keys and composite foreign keys to prevent cross-tenant academic/profile links.
- Updated `docs/architecture/DATABASE_BASELINE.md` academic section and added migration contract tests in `backend/internal/platform/migrate/academic_schema_test.go`.
- Infra check before implementation: Docker Compose core services started; Postgres, PgBouncer, Valkey, NATS, and backend `/healthz`/`/readyz` verified healthy. Frontend image rebuild was blocked by transient DNS resolution to `registry.npmjs.org`, so existing frontend runtime was not marked as rebuilt.
- Verified backend image build and focused migration tests through a Docker build test stage. Full backend test run is blocked in ad-hoc Docker context by `docscontract` needing repo-level `docs/`; direct Docker runtime full test is currently blocked by transient DNS to `proxy.golang.org`.

---

### ISSUE-029 — Design and migrate courses tables

**Scope:**

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

**Acceptance Criteria:**

- [x] Courses are reusable content packages.
- [x] Offerings bind courses to academic/tenant context.
- [x] Assignment rules support class and individual targets.
- [x] Progress can be tracked per student.

**Completion Note (2026-05-07):**

- Added RED/GREEN migration contract coverage for course schema in `backend/internal/platform/migrate/courses_schema_test.go`.
- Added `backend/migrations/000006_courses.sql` with reusable `courses`, ordered `course_modules`, `course_lessons`, metadata-only `course_resources`, `course_assignment_rules`, `course_progress`, and `lesson_progress`.
- Course resources store provider/reference metadata for YouTube, Google Drive, external URLs, or file references; no heavy file hosting path was introduced.
- Course assignment rules bind reusable courses to optional academic `course_offerings` and support class-section, subject-group, and individual-student targets.
- Progress tables track course and lesson completion per tenant/student with safe 0-100 progress percentages and status indexes.
- Updated local development reset order so course child/progress tables drop before academic/profile/auth foundation tables.
- Validation: backend focused migration tests, `go test ./...`, `go build ./...`, Docker backend rebuild/recreate, `/readyz`, and live PostgreSQL `schema_migrations`/table inspection pass.

**Implementation Notes (2026-05-06):**

- Added `backend/migrations/000007_courses.sql` with reusable `courses`, ordered `course_modules`, `course_lessons`, metadata-only `course_resources`, `course_assignment_rules`, `course_progress`, and `lesson_progress`.
- Course resources store provider/reference metadata for YouTube, Google Drive, external URLs, or file references; no heavy file hosting path was introduced.
- Course assignment rules support class-section, subject-group, and individual-student targeting, optionally linked to academic `course_offerings` from ISSUE-028.
- Progress tables track course and lesson completion per tenant/student with safe percentages and status indexes.
- Added migration contract coverage in `backend/internal/platform/migrate/domain_schema_test.go`.

---

### ISSUE-030 — Design and migrate exam tables

**Scope:**

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

**Acceptance Criteria:**

- [x] Materialized eligibility is supported.
- [x] Inbox/shock absorber path is supported.
- [x] Essay and short-answer questions include correct/expected answer fields.
- [x] Optional rubric metadata is supported or planned.
- [x] Exam critical path avoids heavy joins.

**Completion Note (2026-05-07):**

- Added RED/GREEN migration contract coverage for exam schema in `backend/internal/platform/migrate/exams_schema_test.go`.
- Added `backend/migrations/000007_exams.sql` with exam authoring, section/question/options, targeting, gate windows, prerequisites, materialized eligibility, attempts/responses, Postgres submission inbox, receipts, integrity events, and grading tables.
- `exam_eligible_students` materializes tenant/exam/student eligibility at publish-time with a gate snapshot so runtime gate checks can avoid heavy academic joins.
- `exam_submission_inbox` uses tenant-scoped idempotency keys, durable JSON payloads, and pending/failed partial index as the Postgres-side shock absorber before relay/worker processing.
- Short-answer and essay questions include `correct_answer_text` plus `expected_answer_rubric` JSONB from first implementation for future manual/AI-assisted grading.
- Reset-local-dev drop order now includes all exam tables before course/academic/profile/auth foundation tables.

**Implementation Notes (2026-05-06):**

- Added `backend/migrations/000008_exams.sql` with exam authoring, targeting, gate windows, prerequisites, materialized eligibility, attempts/responses, inbox/receipts, integrity events, and grading tables.
- `exam_questions` supports `multiple_choice`, `short_answer`, and `essay`; short-answer/essay readiness is covered by `correct_answer_text` and `expected_answer_rubric` from first implementation.
- `exam_eligible_students` materializes publish-time eligibility per tenant/exam/student so runtime gate checks avoid heavy joins.
- `exam_submission_inbox` uses tenant-scoped idempotency keys and pending/failed indexes as the Postgres-side shock absorber path before NATS/worker processing.
- `exam_submission_receipts` gives durable submit proof per attempt; attempts/responses remain tenant-scoped with composite FKs.
- Added integrity and grading tables without external AI/ClickHouse dependency in the exam critical path.

---

### ISSUE-031 — Plan AI runtime tables

**Scope:**

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

**Acceptance Criteria:**

- [x] AI provider config supports BYO and platform default.
- [x] Conversation memory runtime schema is planned.
- [x] No secrets are stored unencrypted.
- [x] AI draft question storage can support long generation flows.

**Completion Note (2026-05-07):**

- Added RED/GREEN docs contract coverage in `backend/internal/platform/docscontract/ai_runtime_schema_plan_test.go`.
- Added planning artifact `docs/architecture/AI_RUNTIME_SCHEMA_PLAN.md` covering provider configs, conversations, messages, conversation state, memories, tool invocations, generation jobs, and draft questions.
- Documented deterministic BYO provider resolution order: user config, tenant config, then platform default provider.
- Captured secret-handling constraints: plaintext API keys are forbidden; provider configs store only `encrypted_secret_ref` backed by envelope encryption.
- Planned long-running generation jobs plus reviewable `ai_draft_questions` with `correct_answer_text` and `expected_answer_rubric` so essay/short-answer generation matches exam schema readiness.
- Explicitly documented exam critical path isolation from AI providers, Google, ClickHouse, and external webhooks.

**Implementation Notes (2026-05-06):**

- Added planning artifact `docs/architecture/AI_RUNTIME_SCHEMA_PLAN.md` for AI runtime tables without creating runtime dependencies yet.
- Documented BYO provider resolution order: user config, tenant config, then platform default.
- Captured encryption-at-rest requirement for provider secrets/API keys; plaintext keys are explicitly disallowed.
- Planned conversation, message, state, memory, tool invocation, generation job, and draft question records.
- Draft question storage explicitly includes `correct_answer_text` and `expected_answer_rubric` for essay/short-answer generation review.
- Added contract test `backend/internal/platform/migrate/ai_runtime_plan_test.go` to keep the plan aligned with BYO, secrets, and exam-critical-path isolation requirements.

---

## Phase 6 — User & School Administration Modules

### ISSUE-032 — Manage Users module

**Goal:** First complete FE+BE module after foundation.

**Scope:**

- User directory.
- Create/edit/deactivate users.
- Assign tenant memberships/roles.
- Backend CRUD.
- RBAC/audit.
- AI Tool Manifest.

**Acceptance Criteria:**

- [ ] School admin can manage tenant users.
- [ ] Master admin can manage users in selected tenant context.
- [ ] All actions have loading states.
- [ ] Backend enforces RBAC and tenant scope.
- [ ] Audit events emitted for writes.
- [ ] Module review notes written.

**Implementation Note (2026-05-07):**

- Completed ISSUE-032 foundation slice for backend Users API and frontend read directory.
- Added OpenAPI Users contract and `docs/ai-tools/users.md` AI Tool Manifest.
- Added module review note at `docs/rewrite/module-reviews/ISSUE-032-users.md`.
- Verified backend docs contract, Users handler tests, full `go test ./...`, and `go build ./...`.
- Follow-up remains for production form drawer mutations/loading and browser smoke before checking all ISSUE-032 acceptance boxes as done.

---

### ISSUE-033 — Manage Tenants/Schools module

**Scope:**

- Master admin tenant directory.
- Create/edit tenant.
- Tenant theme entry points.
- Tenant status.

**Acceptance Criteria:**

- [ ] Only master admin can manage tenants globally.
- [ ] Tenant CRUD is audited.
- [ ] Tenant switch flow remains explicit.

**Dependency Note (2026-05-08):**

- ISSUE-032 can support school-admin user management with a seeded/current tenant, but its master-admin acceptance path depends on this tenant module plus the tenant switch/act-as context.
- Before starting ISSUE-034/035, complete a minimum tenant onboarding slice so the SaaS journey is real: master admin creates a tenant, bootstraps the first school admin, switches/acts as that tenant, then manages users inside that selected tenant.

---

### ISSUE-033.1 — Tenant onboarding and first admin bootstrap

**Goal:** Make the master-admin → new school tenant → first admin → tenant-scoped user management journey real before continuing to teachers/students.

**Scope:**

- Backend tenant create/update/status endpoints for master admin.
- Default tenant theme/settings entry at tenant creation.
- Default tenant role/permission seeding for the new tenant.
- First school admin bootstrap linked to a real user identity, credential, membership, and `school_admin` role.
- Master-admin act-as/tenant switch must preserve platform permissions while exposing the selected effective tenant.
- Frontend tenant directory/onboarding entry point with loading, empty, error, create, and bootstrap states.
- Module review note and AI Tool Manifest for tenant onboarding.

**Acceptance Criteria:**

- [x] Master admin can create a tenant without pre-existing tenant context.
- [x] Tenant creation is audited with `tenants.create`.
- [x] Newly created tenant has default theme/settings and tenant roles/permissions.
- [x] Master admin can bootstrap the first school admin for that tenant.
- [x] Bootstrap creates/links user identity, password credential, tenant membership, role assignment, and audit event.
- [x] Master admin retains `platform:admin`, `tenants:read`, `tenants:switch`, and tenant management permissions after switching into an effective tenant.
- [ ] Master admin can switch into the new tenant and use `/api/v1/users` against that effective tenant.
- [ ] School admin can login to the new tenant and manage tenant users.
- [ ] UI has no dummy tenant/user rows after API wiring; skeleton/empty/error states are explicit.
- [ ] Browser smoke covers master admin login → create tenant → bootstrap admin → switch tenant → users directory.

**Implementation Note (2026-05-08):**

- Started after ISSUE-032 exposed the hidden dependency between master-admin user management and tenant onboarding.
- Completed backend foundation slice for tenant onboarding: create tenant, default theme/settings, tenant default roles/permissions, first school-admin bootstrap, and audit events.
- Fixed role/permission resolution so platform master permissions remain available when a master admin has selected an effective tenant.
- Added docs contract coverage, OpenAPI tenant endpoints, Tenants AI Tool Manifest, and module review note at `docs/rewrite/module-reviews/ISSUE-033.1-tenant-onboarding.md`.
- Verification: focused platform tenant tests, full backend `go test ./...`, and `go build ./...` pass.
- Remaining before closing: frontend tenant onboarding UI, runtime switch/users path, school-admin login path, and browser smoke.
- This issue is intentionally inserted before ISSUE-034/035 execution; do not mark ISSUE-032 fully complete until this bridge is done and the master-admin selected-tenant path passes.

---

### ISSUE-034 — Manage Teachers module

**Scope:**

- Teacher directory.
- Create/edit teacher profile.
- Link teacher to user identity.
- RBAC and audit.

**Acceptance Criteria:**

- [ ] Teacher profile links to user.
- [ ] Tenant scope enforced.
- [ ] Loading/empty/error states implemented.

---

### ISSUE-035 — Manage Students module

**Scope:**

- Student directory.
- Create/edit student profile.
- Link student to user identity.
- Class enrollment hook/pending link.

**Acceptance Criteria:**

- [ ] Student profile links to user.
- [ ] Tenant scope enforced.
- [ ] Student records do not leak across tenant.

---

### ISSUE-036 — Manage Staff module

**Scope:**

- Staff directory.
- Staff profile CRUD.
- Role assignment.

**Acceptance Criteria:**

- [ ] Staff users can be created and assigned role/permissions.
- [ ] Tenant scope and audit enforced.

---

### ISSUE-037 — Manage Guardians and student links module

**Scope:**

- Guardian directory.
- Guardian profile CRUD.
- Link/unlink guardian to student.

**Acceptance Criteria:**

- [ ] Guardian can be linked to students.
- [ ] Guardian access remains limited to linked student data.
- [ ] Link/unlink actions are audited.

---

## Phase 7 — Academic Structure Modules

### ISSUE-038 — Academic Years and Terms module

**Reorder Note (2026-05-11):**

- After auditing the completed Users/Tenants bridge, academic structure should be activated before deep Teachers/Students profile work.
- Reason: teacher homeroom/assignment and student enrollment flows need real academic years/terms/classes/subjects to avoid placeholder UI and later rewrites.
- Persistent analysis lives at `docs/rewrite/ACADEMIC_STRUCTURE_REORDER_NOTE.md`.
- Reordered recommended next executable task: plan and implement ISSUE-038 as the next vertical FE+BE slice, then continue to class sections/subjects before returning to teacher/student assignment-heavy work.

**Acceptance Criteria:**

- [x] Admin can manage academic years and terms.
- [x] Active term can be selected.
- [x] RBAC/tenant scope enforced.

---

## Append-only Verification Update — ISSUE-038 Academic Years/Terms Runtime Smoke (2026-05-11)

Runtime smoke completed against local Docker Compose stack: frontend `http://127.0.0.1:1666`, backend `http://127.0.0.1:18080`, `/readyz` returned ready.

Verified journey:

- [x] School admin login via `/login` dev persona.
- [x] `Academic Setup` nav item appears for allowed role.
- [x] `/app/academic-setup` loads real backend data only; empty state renders with no dummy rows.
- [x] Create academic year succeeds from pulled-right `FormDrawer`.
- [x] Add term succeeds for created year; term drawer defaults date inputs from selected academic year using `YYYY-MM-DD` browser-safe values.
- [x] Archive academic year succeeds through centered `ConfirmDialog`; list returns to empty state after archive.
- [x] Toast feedback and drawer/confirm behavior match Users/Tenants patterns.

Focused validation:

```txt
cd frontend && npm test -- --run src/lib/academic-api.test.ts src/config/navigation.test.ts
cd frontend && npx tsc --noEmit
cd backend && go test ./...
```

Results: all passed.

Implementation note:

- During browser smoke, term date defaults were normalized with `dateOnly(...)` in `frontend/src/app/(app)/app/academic-setup/academic-setup-page.tsx` so HTML date inputs never receive timestamp strings from backend rows.

Next recommended executable work:

- Continue Phase 7 with ISSUE-039 Class Sections module, then ISSUE-040 Subjects, before returning to teacher/student assignment-heavy work.

---

### ISSUE-039 — Class Sections module

**Acceptance Criteria:**

- [ ] Admin can manage class sections.
- [ ] Homeroom teacher validation is supported.
- [ ] Class membership is prepared for enrollments.

---

### ISSUE-040 — Subjects module

**Acceptance Criteria:**

- [ ] Admin can manage subjects.
- [ ] Subject code uniqueness is tenant-scoped.
- [ ] UI matches prototype subject directory.

---

### ISSUE-041 — Subject Groups module

**Acceptance Criteria:**

- [ ] Admin/teacher can manage flexible subject groups.
- [ ] Cross-class membership is supported.
- [ ] Members can be added/removed with loading states.

---

### ISSUE-042 — Teaching Assignments module

**Acceptance Criteria:**

- [ ] Teacher assignments to offerings/classes/subjects are explicit.
- [ ] Teacher permissions derive from assignment where applicable.

---

### ISSUE-043 — Enrollments module

**Acceptance Criteria:**

- [ ] Student enrollment supports class and individual targeting.
- [ ] Enrollment data can feed courses/exams eligibility.

---

## Phase 8 — Courses / Learning Modules

### ISSUE-044 — Courses directory and CRUD module

**Acceptance Criteria:**

- [ ] Teacher/admin can create courses.
- [ ] Courses have draft/published/archive status.
- [ ] Courses are reusable across academic years/terms.
- [ ] UI follows Udemy/Coursera-like school-aware structure.

---

### ISSUE-045 — Course modules and lessons module

**Acceptance Criteria:**

- [ ] Course can contain ordered modules.
- [ ] Modules can contain lessons.
- [ ] Reordering has loading/feedback states.

---

### ISSUE-046 — Course resources module

**Acceptance Criteria:**

- [ ] Lessons can link video/docs/resources.
- [ ] External resources are metadata/reference where possible.
- [ ] No heavy file hosting requirement is introduced.

---

### ISSUE-047 — Course offerings and assignment rules module

**Acceptance Criteria:**

- [ ] Course can be offered in tenant/academic context.
- [ ] Assignment rules support class and individual students.
- [ ] Materialized enrollments can be created/updated from rules.

---

### ISSUE-048 — Course progress module

**Acceptance Criteria:**

- [ ] Student progress is tracked per course/lesson.
- [ ] Progress can be used by prerequisites later.
- [ ] Teacher/admin can view basic progress.

---

## Phase 9 — Exam Management Modules

### ISSUE-049 — Exam directory and CRUD module

**Acceptance Criteria:**

- [ ] Teacher/admin can create and manage exams.
- [ ] Exam directory matches prototype UI.
- [ ] RBAC restricts exam management by role/assignment.

---

### ISSUE-050 — Exam sections and questions module

**Acceptance Criteria:**

- [ ] Exam supports sections.
- [ ] Questions support MC, essay, and short-answer.
- [ ] MC includes options and answer key.
- [ ] Essay/short-answer includes correct/expected answer for future AI-assisted grading.
- [ ] Optional rubric metadata is supported or documented for follow-up.

---

### ISSUE-051 — Exam targets, gate windows, and prerequisites module

**Acceptance Criteria:**

- [ ] Exams can target class/subject group/student.
- [ ] Gate windows support publish/open/close timing.
- [ ] Prerequisites can reference courses/exams.

---

### ISSUE-052 — Exam publish and materialized eligibility module

**Acceptance Criteria:**

- [ ] Publish calculates `exam_eligible_students`.
- [ ] Runtime exam gate reads materialized eligibility.
- [ ] Recalculate path is tenant-scoped and audited.

---

## Phase 10 — Exam Critical Path

### ISSUE-053 — Exam Gate module

**Acceptance Criteria:**

- [ ] Student eligibility is checked using materialized rows.
- [ ] Gate validates schedule/password/rules without external APIs.
- [ ] Denied states are clear and professional.

---

### ISSUE-054 — Take Exam shell and answer state module

**Acceptance Criteria:**

- [ ] Student can answer questions.
- [ ] UI is secure-exam-shell aligned with prototype.
- [ ] Navigation/completeness indicators work.

---

### ISSUE-055 — Autosave module

**Acceptance Criteria:**

- [ ] Answers autosave reliably.
- [ ] Autosave status is visible.
- [ ] Duplicate/race writes are handled safely.

---

### ISSUE-056 — Submit and receipt module

**Acceptance Criteria:**

- [ ] Submit writes durable append-only/inbox record.
- [ ] Student receives digital receipt immediately.
- [ ] Receipt can be verified tenant-scoped.
- [ ] Double submit is prevented.

---

### ISSUE-057 — Integrity events and attempt locking module

**Acceptance Criteria:**

- [ ] Integrity/security events are recorded append-only.
- [ ] Attempt locking prevents invalid concurrent attempts.
- [ ] Events are available for monitoring/audit.

---

## Phase 11 — Teacher Operations

### ISSUE-058 — Exam Monitor module

**Acceptance Criteria:**

- [ ] Teacher/admin can monitor attempts.
- [ ] Security/integrity events are visible.
- [ ] Monitor does not depend on external services.

---

### ISSUE-059 — Grading module

**Acceptance Criteria:**

- [ ] Auto-grading supports MC.
- [ ] Manual grading supports essay/short-answer.
- [ ] Essay/short-answer grading UI shows correct/expected answer.
- [ ] AI-assisted grading can later use correct/expected answer references.

---

### ISSUE-060 — Performance and reports module

**Acceptance Criteria:**

- [ ] Teacher/admin can view exam performance.
- [ ] Reports are tenant-scoped.
- [ ] Analytics does not block exam critical path.

---

## Phase 12 — AI Agent Runtime

### ISSUE-061 — AI Provider Config module

**Acceptance Criteria:**

- [ ] Supports user BYO, tenant BYO, and platform default provider.
- [ ] API keys are encrypted at rest.
- [ ] Provider keys are never exposed to frontend.
- [ ] Provider config changes are audited.

---

### ISSUE-062 — Conversation memory runtime module

**Acceptance Criteria:**

- [ ] Frontend sends conversationId + latestMessage + session.
- [ ] Backend persists conversations/messages.
- [ ] Typed conversation state is maintained.
- [ ] Full history is not sent every turn.

---

### ISSUE-063 — Context builder module

**Acceptance Criteria:**

- [ ] Context builder uses summary, typed state, relevant retrieval, recent messages, latest message.
- [ ] Budgeting preserves critical pending state.
- [ ] Secrets are redacted/excluded.

---

### ISSUE-064 — Tool invocation runtime module

**Acceptance Criteria:**

- [ ] AI actions call deterministic backend services/endpoints.
- [ ] Success is only claimed after backend success proof.
- [ ] Tool invocations are audited.
- [ ] Write actions require confirmation where needed.

---

### ISSUE-065 — AI question generation drafts module

**Acceptance Criteria:**

- [ ] Long question generation uses jobs/batches/drafts.
- [ ] Drafts can be revised before insertion.
- [ ] Selected drafts can be inserted into exams only after confirmation.
- [ ] Essay/short-answer drafts include correct/expected answers.

---

### ISSUE-066 — AI-assisted grading foundation

**Acceptance Criteria:**

- [ ] AI-assisted grading uses stored correct/expected answer and rubric references.
- [ ] AI grading output is structured and auditable.
- [ ] Human review/override remains possible.
- [ ] AI provider failure does not break manual grading.

---

## Cross-Cutting Quality Gates

### ISSUE-067 — Browser smoke test protocol

**Acceptance Criteria:**

- [ ] Define smoke checklist per module.
- [ ] Include login, CRUD, RBAC denial, loading states, error states.
- [ ] Document route/user credentials per module review.

---

### ISSUE-068 — Security review protocol

**Acceptance Criteria:**

- [ ] Define per-module security checklist.
- [ ] Include tenant isolation, RBAC, audit, CSRF/session, sensitive data.
- [ ] Include AI action security where relevant.

---

### ISSUE-069 — Performance review protocol

**Acceptance Criteria:**

- [ ] Define per-module performance notes template.
- [ ] Include query/index review.
- [ ] Include frontend loading/perceived performance.
- [ ] Include exam critical path special checks.

---

## Unplanned Follow-up Issues

_Add new issues here append-only when implementation reveals new work that does not belong to an existing parent issue._

---

### ISSUE-031.1 — Reconcile issue file status and Phase 6 execution template

**Priority:** 🔴 Critical
**Estimated Effort:** 0.5d
**Depends on:** ISSUE-012, ISSUE-013, ISSUE-014, ISSUE-016, ISSUE-031
**Status:** [x] Done

**Why this exists:**

The rewrite issue file has become the execution source of truth, but it now contains multiple rounds of handoff history. Several completed foundation issues include both newer `Completion Note (2026-05-07)` sections and older `Implementation Notes (2026-05-06)` sections. The older notes are useful historical evidence, but they should not be treated as the active implementation source of truth when they conflict with newer completion notes.

Before Phase 6 CRUD modules begin, this file needs a lightweight append-only reconciliation pass so ISSUE-032 becomes the golden FE+BE module pattern instead of inheriting stale migration numbering, outdated validation notes, or inconsistent module review expectations.

**Current Execution Snapshot (2026-05-07):**

```txt
Completed / accepted as current foundation:
- Phase 0: ISSUE-000 through ISSUE-003
- Phase 1: ISSUE-004 through ISSUE-007
- Phase 1.5: ISSUE-008 through ISSUE-011
- Phase 2: ISSUE-012 through ISSUE-017
- Phase 3: ISSUE-018 through ISSUE-022
- Phase 4: ISSUE-023 through ISSUE-026
- Phase 5: ISSUE-027 through ISSUE-031

Next implementation area:
- Phase 6: ISSUE-032 Manage Users module

Recommended prep before ISSUE-032:
- ISSUE-067 Browser smoke test protocol
- ISSUE-068 Security review protocol
- ISSUE-069 Performance review protocol
```

**Known Reconciliation Notes:**

- Treat latest dated `Completion Note` sections as stronger evidence than older `Implementation Notes` when there is conflict.
- Do not delete older notes; preserve them as append-only history.
- Migration numbering mentioned in older notes for ISSUE-028 through ISSUE-030 may be superseded by newer completion notes and should be verified against actual `backend/migrations/` before using in implementation.
- ISSUE-023 says shared middleware exists and app migration may remain a follow-up. Before adding Phase 6 handlers, verify whether domain routes should use `internal/app` helpers, `internal/platform/middleware`, or a bridged stack.
- ISSUE-025 OpenAPI/AI manifest conventions are mandatory for every backend module, but Phase 6+ issues do not yet repeat exact deliverable paths. Use the Phase 6 Definition of Done below.

**Phase 6+ Module Definition of Done:**

Every FE+BE module from ISSUE-032 onward must close with all of the following evidence:

- [ ] Backend API implemented with tenant-scoped repository/service/handler boundaries.
- [ ] Backend RBAC enforced server-side; frontend hiding is not counted as security.
- [ ] Mutating actions emit audit events with actor, tenant/effective tenant, action, target, and request ID where applicable.
- [ ] CSRF/idempotency expectations are respected for unsafe or retry-sensitive requests.
- [ ] OpenAPI source of truth updated at `docs/api/openapi.yaml` or documented adjacent API note if OpenAPI refactor is intentionally deferred.
- [ ] AI Tool Manifest note added under `docs/ai-tools/` for any module action that an AI agent may later invoke.
- [ ] Frontend page uses real API data only; no dummy initial API rows.
- [ ] Frontend includes skeleton, empty, error, loading, disabled, success, and destructive-confirmation states where relevant.
- [ ] Forms use custom controlled validation patterns with Zod/react-hook-form for module forms; no native validation chrome.
- [ ] Browser smoke evidence recorded, including login role, route, CRUD flow, RBAC denial, loading/error state, and logout/protected-route behavior where applicable.
- [ ] Security review evidence recorded, including tenant isolation, RBAC, CSRF/session, audit, and sensitive-data checks.
- [ ] Performance note recorded, including query/index review and frontend perceived-performance check.
- [ ] Module review note written under `docs/rewrite/module-reviews/ISSUE-NNN-<module>.md`.
- [ ] Backend tests and frontend tests/build relevant to the module pass, with command evidence in completion note.

**Recommended Next Sequence:**

```txt
ISSUE-031.1 Reconcile issue status + module DoD
    ├── ISSUE-067 Browser smoke test protocol
    ├── ISSUE-068 Security review protocol
    ├── ISSUE-069 Performance review protocol
    └── ISSUE-032 Manage Users golden CRUD module
            ├── ISSUE-033 Manage Tenants/Schools
            ├── ISSUE-034 Manage Teachers
            ├── ISSUE-035 Manage Students
            ├── ISSUE-036 Manage Staff
            └── ISSUE-037 Manage Guardians and student links
```

**ISSUE-032 Suggested Internal Breakdown:**

- [ ] ISSUE-032.1: Users API contract, OpenAPI update, AI manifest note, and test plan.
- [ ] ISSUE-032.2: Backend user repository/service/handlers with tenant scope, RBAC, audit, pagination/filtering, validation errors, and session-safe responses.
- [ ] ISSUE-032.3: Frontend users directory with real API query, skeleton, empty, error, filters/search, pagination, and no dummy initial rows.
- [ ] ISSUE-032.4: Create/edit/deactivate user flows using custom form drawer/dialog patterns, Zod validation, loading states, optimistic or refetch strategy, and professional errors.
- [ ] ISSUE-032.5: Tenant membership and role assignment UX with safe RBAC boundaries and confirmation/audit for sensitive changes.
- [ ] ISSUE-032.6: Browser smoke, security review, performance note, module review doc, and completion note.

**Acceptance Criteria:**

- [x] Current execution snapshot is accepted before ISSUE-032 coding starts.
- [x] Conflicting older notes are explicitly treated as historical unless re-verified against source files.
- [x] Phase 6+ Module Definition of Done is used for ISSUE-032 and later modules.
- [x] ISSUE-067/068/069 are either completed as lightweight templates before ISSUE-032 or explicitly folded into ISSUE-032.6 with user approval.
- [x] ISSUE-032 is treated as the golden CRUD module pattern for subsequent Phase 6/7 modules.

**Completion Note (2026-05-07):**

- Added locked execution template at `docs/rewrite/GOLDEN_CRUD_PATTERN.md` for ISSUE-032 and later FE+BE modules.
- Added lightweight review protocols required by the golden CRUD pattern:
  - `docs/rewrite/BROWSER_SMOKE_PROTOCOL.md`
  - `docs/security/SECURITY_REVIEW_PROTOCOL.md`
  - `docs/rewrite/PERFORMANCE_REVIEW_PROTOCOL.md`
- Added docs contract coverage in `backend/internal/platform/docscontract/docs_contract_test.go` so the golden CRUD pattern and protocol docs remain present.
- ISSUE-067/068/069 are considered satisfied as lightweight protocol templates for the Phase 6 kickoff; each future module must still record module-specific smoke/security/performance evidence in its module review note.
- ISSUE-032 Manage Users is now the next executable work and must be delivered as the golden CRUD module pattern.

---

## Current Issue Summary Table (append-only snapshot, 2026-05-07)

| Range | Area | Current Status | Notes |
|-------|------|----------------|-------|
| ISSUE-000..003 | Phase 0 prototype audit + blueprint | [x] Done | Docs/source-of-truth foundation closed. |
| ISSUE-004..007 | Phase 1 secure infra + DB foundation | [x] Done | Docker, backend, migrations, dev seed closed. |
| ISSUE-008..011 | Phase 1.5 base UI parity | [x] Done | Login/app/gallery UI foundation approved. |
| ISSUE-012..017 | Phase 2 auth/RBAC/theme | [x] Done | Security gate before Phase 6 appears closed; keep smoke evidence current. |
| ISSUE-018..022 | Phase 3 frontend architecture | [x] Done | App shell, base UI, API client, AI sidecar shell closed. |
| ISSUE-023..026 | Phase 4 backend architecture | [x] Done | Middleware/httpx/docs/testkit closed; verify route-stack integration before modules. |
| ISSUE-027..031 | Phase 5 domain DB baseline | [x] Done | Profile, academic, courses, exams, AI runtime plan closed; verify actual migrations if conflicts appear. |
| ISSUE-031.1 | Reconciliation + Phase 6 template | [x] Done | Golden CRUD template and protocol docs created. |
| ISSUE-032..037 | Phase 6 user/school admin modules | [ ] Todo | ISSUE-032 should become golden CRUD module. |
| ISSUE-038..043 | Phase 7 academic modules | [ ] Todo | Needs issue expansion before coding. |
| ISSUE-044..048 | Phase 8 courses modules | [ ] Todo | Needs issue expansion before coding. |
| ISSUE-049..057 | Phase 9/10 exam management + critical path | [ ] Todo | Needs stricter reliability/idempotency/offline test plan before coding. |
| ISSUE-058..060 | Phase 11 teacher operations | [ ] Todo | Depends on exam critical path data. |
| ISSUE-061..066 | Phase 12 AI runtime | [ ] Todo | Must remain outside exam critical path. |
| ISSUE-067..069 | Cross-cutting protocols | [x] Done | Lightweight templates created; per-module evidence still required. |

**Immediate prep before ISSUE-032:** completed on 2026-05-07.

**Recommended next executable work:** Implement ISSUE-032 Manage Users as the golden FE+BE CRUD module using `docs/rewrite/GOLDEN_CRUD_PATTERN.md` and the smoke/security/performance protocols.


---

## Append-only Verification Update (2026-05-11)

Runtime smoke completed against local stack: frontend `http://127.0.0.1:1666`, backend `http://127.0.0.1:18080`, `/readyz` returned ready for database, NATS, and Valkey.

Evidence command:

```txt
bash /tmp/morfoschools_gate_smoke.sh
```

Verified journey:

- [x] Master admin login with `master.admin@morfoschools.local`.
- [x] Tenant create via `/api/v1/platform/tenants`.
- [x] Tenant edit via `/api/v1/platform/tenants/{id}`.
- [x] Tenant admin bootstrap via `/api/v1/platform/tenants/{id}/bootstrap-admin`.
- [x] Master admin switch tenant via `/api/v1/auth/switch-tenant`.
- [x] Master admin users CRUD in switched tenant via `/api/v1/users`.
- [x] Bootstrapped school admin login with new tenant context.
- [x] School admin tenant-scoped users CRUD via `/api/v1/users`.

Smoke proof:

```txt
OK master login
OK tenant create
OK tenant edit
OK bootstrap school admin
OK master switch tenant
OK master list users in switched tenant
OK master create tenant user
OK master update tenant user
OK master deactivate tenant user
OK school admin login
OK school admin list tenant users
OK school admin create tenant user
OK school admin update tenant user
OK school admin deactivate tenant user
SMOKE_SUMMARY tenant_id=f16b8eb3-891c-43c9-8f62-c831a3dac030 tenant_code=gate-20260511184340 admin_email=admin.20260511184340@gate-smoke.local master_user=master.user.20260511184340@gate-smoke.local school_user=school.user.20260511184340@gate-smoke.local
```

Notes:

- `switch-tenant` intentionally preserves the existing CSRF cookie and does not return a new `csrfToken`; clients must keep using the original session CSRF token after switching context.
- Newly created tenants currently seed default tenant roles: `school_admin`, `teacher`, and `student`. Smoke uses `student` + `teacher`; `parent` is not available on newly created tenants unless seeded later.
