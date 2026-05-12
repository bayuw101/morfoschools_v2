# ISSUE-032 — Manage Users Module Review

Status: Frontend mutation slice complete (2026-05-07)

## Scope Delivered

- Backend Users API registered under `/api/v1/users`.
- Tenant-scoped list, create, update, and deactivate handlers.
- Per-method RBAC: `users:read` for list and `users:write` for writes.
- Effective tenant context is authoritative; request body tenant IDs are not accepted.
- Role assignments are validated through tenant-scoped `roles` rows.
- Deactivation archives the tenant membership only and does not mutate another tenant membership.
- Audit events are emitted for `users.create`, `users.update`, and `users.deactivate` with actor, tenant, request ID, resource type, and resource ID.
- Frontend Users page consumes `/api/v1/users` with skeleton, empty, and error states and no dummy rows.
- Frontend Users page now wires create/edit/deactivate mutations through a right-pulled form drawer, role chips, non-native `ConfirmDialog`, per-action loading buttons, query invalidation, and mutation error surfacing.
- Theme provider test typing is fixed for `React.createElement`/TypeScript validation.
- OpenAPI contract and Users AI Tool Manifest are documented.

## Files

- `backend/internal/app/users.go`
- `backend/internal/app/users_test.go`
- `backend/internal/platform/docscontract/docs_contract_test.go`
- `docs/api/openapi.yaml`
- `docs/ai-tools/users.md`
- `frontend/src/lib/users-api.ts`
- `frontend/src/lib/users-api.test.ts`
- `frontend/src/app/(app)/app/users/page.tsx`
- `frontend/src/app/(app)/app/users/users-page.tsx`
- `frontend/src/app/(app)/app/users/users-page.test.ts`
- `frontend/src/lib/theme-provider.test.tsx`

## Verification

- `go test ./internal/platform/docscontract -run TestUsersAPIDocumentationContract`
- `go test ./internal/app -run 'TestUsers|TestListUsers|TestCreateUser|TestUpdateUser|TestDeactivateUser'`
- `go test ./...`
- `go build ./...`
- `npm test -- --run src/lib/theme-provider.test.tsx src/app/\(app\)/app/users/users-page.test.ts`
- `npx tsc --noEmit`

## Remaining Follow-up

- Browser smoke the full create/edit/deactivate journey against a running backend/session.
- Add any tenant-switch UX coverage needed for master admin selected-tenant context.


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
