# Auth/RBAC/Menu Audit — ISSUE-012/013/014/016 Gate

Date: 2026-05-07
Scope: current rewrite target, backend auth/session, dev seed identities, frontend login/session/menu role visibility.

## Current confirmed state

- Backend exposes real auth routes:
  - `POST /api/v1/auth/login`
  - `POST /api/v1/auth/logout`
  - `GET /api/v1/auth/me`
  - `POST /api/v1/auth/switch-tenant`
- Browser auth uses httpOnly `morfoschools_session` cookie plus readable `morfoschools_csrf` cookie for double-submit CSRF.
- Login creates server-side sessions using hashed session tokens, and `/auth/me` resolves the session from the cookie.
- Logout requires CSRF, revokes the server-side session, and expires auth cookies.
- Login attempts are rate-limited by the backend foundation limiter. The limiter is intentionally in-memory for the local rewrite foundation; a shared/multi-instance limiter remains future production hardening.
- Frontend login calls backend with `credentials: "include"`, `X-Tenant-ID` for tenant-scoped users, and JSON `tenantId` where applicable.
- Frontend stores only UI session metadata under `morfoschools_session_cache`; it does not store a raw bearer token or raw session token in localStorage.
- CORS is credential-aware for frontend port `1666` and handles preflight before auth.
- Dev seed aligns backend role codes with frontend role names:
  - `master_admin`
  - `school_admin`
  - `academic_admin`
  - `teacher`
  - `student`
  - `parent`
  - `finance`
  - `proctor`
  - `content_reviewer`
- Frontend accepts legacy aliases defensively:
  - `guardian -> parent`
  - `finance_staff -> finance`
  - `exam_proctor -> proctor`
  - `staff -> school_admin`
- `/app` dashboard is role-aware, not static for all users.
- Sidebar/menu role visibility is limited by current clean rewrite route scope:
  - Dashboard: all seeded roles
  - Gallery: staff/content/admin roles only, not student/parent/finance/proctor.
- RBAC source of truth is documented in `docs/security/RBAC_MATRIX.md` and frontend menu hiding is explicitly not a backend security boundary.
- Master admin starts as a platform role without default tenant membership, can select an effective tenant, and switch actions are CSRF-protected, permission-checked, and audited as `tenant.switch`.
- Tenant theme backend route and no-flicker frontend contract are documented in `docs/frontend/THEME_CONTRACT.md`.

## Gate closure status

- ISSUE-012: Closed in the source-of-truth issue checklist after audit. Evidence: auth routes, httpOnly session cookie, server-side session store, CSRF on unsafe auth actions, backend rate limiter, frontend metadata-only session cache, and validation commands below.
- ISSUE-013: Closed. Evidence: centralized backend RBAC authorizer/middleware helpers, route-level permission gates, durable RBAC matrix doc, and unit coverage for allowed/denied cases.
- ISSUE-014: Closed. Evidence: platform-only master role seed invariant, tenant switch route, effective-tenant session context, tenant switch audit event, and frontend act-as visibility contract.
- ISSUE-015: Closed. Evidence: tenant theme backend route, sanitization, cache contract, default fallback, OpenAPI/schema docs, and `THEME_CONTRACT.md`.
- ISSUE-016: Closed. Evidence: backend-wired login flow, session hook/route guard, role-aware app shell/dashboard/menu, logout flow, professional loading/error states, and seeded-role smoke note in the issue completion note.

## Validation re-run during source-of-truth audit

- Backend: `go test ./...` PASS.
- Backend: `go build ./...` PASS.
- Frontend: `npm test` PASS.

## Follow-up hardening notes

These are not blockers for the clean rewrite Phase 2 gate, but should remain visible for later production hardening:

1. Replace or front the in-memory login limiter with a shared limiter for multi-instance production deployments.
2. Continue applying the CSRF helper consistently to all future unsafe cookie-authenticated API routes.
3. Add DB-backed end-to-end auth handler tests as the auth surface grows beyond the current foundation routes.
4. Keep destructive act-as operations confirmable in the frontend and auditable in the backend.
