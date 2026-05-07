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
- Frontend login calls backend with `credentials: "include"`, `X-Tenant-ID`, and JSON `tenantId`.
- Frontend stores only a session cache for UI rendering. It must not store a raw bearer/session token.
- CORS is credential-aware for frontend port `1666` and handles preflight before auth.
- Dev seed now aligns backend role codes with frontend role names:
  - `master_admin`
  - `school_admin`
  - `academic_admin`
  - `teacher`
  - `student`
  - `parent`
  - `finance`
  - `proctor`
  - `content_reviewer`
- Frontend still accepts legacy aliases defensively:
  - `guardian -> parent`
  - `finance_staff -> finance`
  - `exam_proctor -> proctor`
  - `staff -> school_admin`
- `/app` dashboard is now role-aware, not static for all users.
- Sidebar/menu role visibility is currently limited by clean rewrite route scope:
  - Dashboard: all seeded roles
  - Gallery: staff/content/admin roles only, not student/parent/finance/proctor.

## Gaps before closing the gate

### ISSUE-012 gaps

- Rate limiter is in-memory only; acceptable for local rewrite foundation, but production multi-instance needs shared limiter or edge/gateway control.
- Session cookie `Secure` is false for local HTTP. Production config must make this environment-aware and true behind HTTPS.
- CSRF validation exists for logout/switch-tenant but must be reused consistently for future unsafe API routes.
- Login currently authenticates by email, then session tenant is derived from the first active membership. It should explicitly validate requested tenant membership when multiple tenants exist.
- Auth tests cover middleware and auth client, but backend auth handler tests should be expanded with DB-backed login/logout/me/switch-tenant scenarios.

### ISSUE-013 gaps

- RBAC engine exists as `internal/platform/rbac`, but is not yet wired as backend route middleware for protected resource APIs.
- Role-permission matrix exists in devseed code, but needs durable docs in `docs/security/` and should be treated as source-of-truth for future API route authorization.

### ISSUE-014 gaps

- `switch-tenant` exists and writes audit event, but needs stronger tests:
  - master admin can switch to active tenant
  - non-master roles cannot switch
  - invalid tenant rejected
  - audit event is written with request ID/action/resource evidence
- Frontend has effective-tenant fields in session normalization, but UI indicator needs browser smoke after backend switch.

### ISSUE-016 gaps

- Frontend session hook fetches `/auth/me`, but no global provider/cache dedup yet; multiple layout components can call the endpoint separately.
- Logout has behavior but no explicit loading/disabled state in `UserButton` yet.
- Full seeded-role browser smoke on port `1666` is still required after backend rebuild/reseed.

## Validation already run in this pass

- Backend: `go test ./...` PASS.
- Frontend focused tests and typecheck command executed:
  - `npm test -- --run src/lib/auth.test.ts src/config/navigation.test.ts 'src/app/(app)/app/dashboard-domain.test.ts'`
  - `npx tsc --noEmit`
- New RED/GREEN coverage added:
  - frontend role alias normalization
  - role-aware dashboard experiences for every seeded role
  - platform tenant controls limited to master admin

## Recommended next implementation order

1. Add backend DB-backed auth handler tests for ISSUE-012 and close any failing edge cases.
2. Wire RBAC middleware/helper into backend route patterns for ISSUE-013.
3. Add switch-tenant audit tests and frontend visible act-as indicator smoke for ISSUE-014.
4. Refactor frontend auth session into a provider/cache, add logout loading state, then smoke every seeded role for ISSUE-016.
