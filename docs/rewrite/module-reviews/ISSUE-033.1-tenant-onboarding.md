# ISSUE-033.1 — Tenant Onboarding and First Admin Bootstrap Review

Status: Backend foundation slice complete (2026-05-08)

## Scope Delivered

- Backend platform tenant collection route under `/api/v1/platform/tenants` now dispatches GET and POST with method-specific permissions.
- Tenant create endpoint creates the tenant, default theme settings, default tenant roles/permissions, and one `tenants.create` audit event.
- First-admin bootstrap endpoint under `/api/v1/platform/tenants/{id}/bootstrap-admin` creates or links a user identity, password credential, active tenant membership, `school_admin` role, and one `tenants.bootstrap_admin` audit event.
- Master-admin role/permission lookup now preserves platform permissions when an effective tenant is selected, so act-as tenant context does not drop `platform:admin`, `tenants:read`, `tenants:switch`, `tenants:write`, or `tenants:bootstrap`.
- Dev seed grants master admin `tenants:write` and `tenants:bootstrap`.
- OpenAPI contract and Tenants AI Tool Manifest are documented.

## Files

- `backend/internal/app/platform.go`
- `backend/internal/app/platform_test.go`
- `backend/internal/app/auth.go`
- `backend/internal/platform/devseed/devseed.go`
- `backend/internal/platform/docscontract/docs_contract_test.go`
- `docs/api/openapi.yaml`
- `docs/ai-tools/tenants.md`
- `docs/issues/morfoschools-rewrite-v2-ISSUES.md`

## Verification

- `go test ./internal/app -run 'TestCreatePlatformTenant|TestBootstrapTenantAdmin|TestRolesAndPermissionsPreserves'`
- `go test ./...`
- `go build ./...`

## Remaining Follow-up

- Add frontend tenant directory/onboarding UI with skeleton, empty, error, create, and bootstrap flows.
- Browser smoke the full journey: master admin login → create tenant → bootstrap admin → switch tenant → users directory.
- Add runtime Docker/backend verification after frontend wiring.


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
