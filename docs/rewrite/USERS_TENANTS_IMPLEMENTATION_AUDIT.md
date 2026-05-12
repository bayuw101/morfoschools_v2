# Users and Tenants Implementation Audit

Last audited: 2026-05-11

Purpose: make the current Users/Tenants implementation pattern explicit so future sessions can continue Phase 6/7 without relearning the codebase from scratch.

## Files audited

Backend:

- `backend/internal/app/users.go`
- `backend/internal/app/users_test.go`
- `backend/internal/app/platform.go`
- `backend/internal/app/platform_test.go`
- `backend/internal/app/auth.go`
- `backend/internal/app/rbac_middleware.go`
- `backend/internal/platform/devseed/devseed.go`
- `backend/migrations/000001_auth_rbac_theme_foundation.sql`
- `backend/migrations/000002_user_profiles.sql`
- `backend/migrations/000008_primary_tenant_admin.sql`
- `backend/migrations/000009_tenant_logo_fields.sql`

Frontend:

- `frontend/src/lib/users-api.ts`
- `frontend/src/lib/users-api.test.ts`
- `frontend/src/lib/tenants-api.ts`
- `frontend/src/lib/tenants-api.test.ts`
- `frontend/src/app/(app)/app/users/page.tsx`
- `frontend/src/app/(app)/app/users/users-page.tsx`
- `frontend/src/app/(app)/app/users/user-drawers.tsx`
- `frontend/src/app/(app)/app/users/user-list.tsx`
- `frontend/src/app/(app)/app/users/user-states.tsx`
- `frontend/src/app/(app)/app/users/users-domain.ts`
- `frontend/src/app/(app)/app/tenants/page.tsx`
- `frontend/src/app/(app)/app/tenants/tenants-page.tsx`
- `frontend/src/app/(app)/app/tenants/tenant-drawers.tsx`
- `frontend/src/app/(app)/app/tenants/tenant-list.tsx`
- `frontend/src/app/(app)/app/tenants/tenant-states.tsx`
- `frontend/src/app/(app)/app/tenants/tenants-domain.ts`

Docs:

- `docs/rewrite/GOLDEN_CRUD_PATTERN.md`
- `docs/rewrite/module-reviews/ISSUE-032-users.md`
- `docs/rewrite/module-reviews/ISSUE-033.1-tenant-onboarding.md`
- `docs/ai-tools/users.md`
- `docs/ai-tools/tenants.md`
- `docs/api/openapi.yaml`

## Current backend pattern

Users module route shape:

- `GET /api/v1/users` requires `users:read` or `platform:admin`.
- `POST /api/v1/users` requires `users:write` or `platform:admin` and CSRF.
- `PATCH /api/v1/users/{id}` requires `users:write` or `platform:admin` and CSRF.
- `PATCH /api/v1/users/{id}/deactivate` requires `users:write` or `platform:admin` and CSRF.

Tenant/platform module route shape:

- `GET /api/v1/platform/tenants` requires `tenants:read` or `platform:admin`.
- `POST /api/v1/platform/tenants` requires `tenants:write` or `platform:admin` and CSRF.
- `PATCH /api/v1/platform/tenants/{id}` requires `tenants:write` or `platform:admin` and CSRF.
- `DELETE /api/v1/platform/tenants/{id}` requires `tenants:delete` or `platform:admin` and CSRF; current behavior is archival, not hard delete.
- `POST /api/v1/platform/tenants/{id}/logo` requires `tenants:write` or `platform:admin` and CSRF.
- `POST /api/v1/platform/tenants/{id}/bootstrap-admin` requires `tenants:bootstrap` or `platform:admin` and CSRF.

Shared handler conventions:

- Collection endpoints dispatch by method and apply per-method permission middleware inside the dispatcher.
- Unsafe browser writes always call `validCSRF(r)` in the handler.
- JSON responses use `writeJSON(w, status, map[string]any{"data": ...})`.
- Errors use `errPayload(r, code, message)` so request ID is included consistently.
- Tenant-scoped resources derive scope from `Subject.EffectiveTenantID`, falling back to `Subject.TenantID`.
- Tenantless platform admin may act on a selected tenant through `X-Tenant-ID`; non-platform tenant users cannot spoof tenant scope this way.
- Platform/control-plane tenant operations intentionally do not require effective tenant context; they require explicit platform/tenant-management permissions.

Transaction conventions:

- Multi-table writes use `BeginTx`, `defer tx.Rollback()`, and commit only after all invariants and audit insertion pass.
- Users create writes `users`, `tenant_memberships`, `user_roles`, then `audit_events` in one transaction.
- Users update resolves the scoped membership, updates identity display name, replaces role links, writes audit.
- Users deactivate archives only the scoped tenant membership, deletes that membership's role links, writes audit. It does not globally archive the identity.
- Tenant create writes tenant, default theme settings, default roles/permissions, then `tenants.create` audit.
- Tenant update validates lifecycle status (`active`, `suspended`, `archived`) and writes `tenants.update` audit.
- Tenant delete archives tenant, archives that tenant's memberships, deletes role links for that tenant, writes `tenants.delete` audit.
- Tenant logo upload validates type/size, writes object storage first, then persists metadata plus `tenants.logo_upload` audit in one DB transaction.
- Tenant admin bootstrap is idempotent by email and membership; it upserts user identity, password credential, active membership, `school_admin` role link, marks exactly one primary admin via `tenant_memberships.is_primary_admin`, and writes `tenants.bootstrap_admin` audit.

Important schema decisions:

- User identity is global in `users`.
- Tenant relationship is `tenant_memberships`.
- Roles attach to `tenant_memberships` through `user_roles`, not directly to global users.
- Exactly-one primary admin per active tenant is modeled with `tenant_memberships.is_primary_admin` and partial unique index `ux_tenant_memberships_primary_admin`.
- Teacher/student/staff/guardian profile tables already exist in `000002_user_profiles.sql` and are tenant-scoped profile tables linked to `users` by `(tenant_id, user_id)` style constraints.
- Academic structure tables already exist in `000005_academic_foundation.sql`, including academic years, terms, class sections, subjects, subject groups, course offerings, teaching assignments, and enrollments.

Audit actions already used:

- `users.create`
- `users.update`
- `users.deactivate`
- `tenants.create`
- `tenants.update`
- `tenants.delete`
- `tenants.logo_upload`
- `tenants.bootstrap_admin`

## Current frontend pattern

Users page:

- `frontend/src/app/(app)/app/users/page.tsx` owns TanStack Query state, mutations, selected record state, and auth session awareness.
- `UsersPageContent` is presentational and receives data/loading/error/mutation state via props.
- `users-api.ts` provides typed API calls using the shared API client.
- Platform master admin without effective tenant loads active tenants for create-user tenant selection.
- Tenant admin/effective-tenant context uses the current tenant from session and does not show dummy tenant data.
- UI includes skeleton, empty, filtered-empty, and error states.
- Create/edit use right-side `FormDrawer` via `UserFormDrawer`.
- Deactivate uses centered `ConfirmDialog` with row-level loading.
- Directory layout uses `DirectoryToolbar`, metrics, search, status filter, desktop table, and mobile cards.

Tenants page:

- `frontend/src/app/(app)/app/tenants/page.tsx` owns TanStack Query state, mutations, selected tenant state, switch/delete confirmation state, and toast state.
- `TenantsPageContent` is presentational and receives all mutation/loading/error state via props.
- `tenants-api.ts` provides typed API calls for list/create/update/delete/logo/bootstrap admin.
- Tenant create success moves directly into the first-admin drawer for onboarding continuity.
- Switch tenant uses `switchTenant(tenantId)` and invalidates all queries; the backend intentionally preserves the existing CSRF token after switch.
- Delete is archival but the UI label currently says delete; confirm text clarifies archival.
- UI includes skeleton, empty, filtered-empty, and error states, plus action toasts.
- Tenant forms and logo/admin forms live in `tenant-drawers.tsx`; list actions live in `tenant-list.tsx`.

Shared frontend conventions to copy:

- Keep page containers dense and consistent with `/app/courses`/directory pattern.
- Backend-wired pages must not initialize with dummy rows.
- Use custom controls, not native alert/confirm/browser validation chrome.
- Every mutation gets visible loading state and mutation error surfacing.
- Separate API adapter, domain filtering/metrics helpers, page state container, presentational content, list rendering, drawers, and states.

## Verification evidence already recorded

Module review docs record focused backend tests, full backend tests/build, frontend tests/typecheck, and 2026-05-11 runtime smoke.

Runtime smoke covered:

- master admin login;
- tenant create/edit;
- first admin bootstrap;
- master admin switch tenant;
- master admin users CRUD in selected tenant;
- bootstrapped school admin login;
- school admin users CRUD.

## Known mismatches / cautions

- The issues file still has unchecked ISSUE-032 and ISSUE-033.1 acceptance boxes even though append-only runtime smoke evidence says those paths passed. Do not rewrite approved checkboxes unless asked; prefer append-only completion notes.
- `git status --short` is very dirty with many modified/untracked implementation and docs files. Do not reset or clean.
- Newly created tenants currently seed `school_admin`, `teacher`, and `student` roles only. `parent` is not seeded yet.
- `switch-tenant` preserves the existing CSRF token and does not return a new one.
- Users create currently inserts a fresh global `users` row and does not upsert by email except bootstrap admin. If later profile modules need link-to-existing-user behavior, design that deliberately instead of copying create-user blindly.
- List endpoints currently return full arrays without pagination. Future larger modules should document pagination/filter/sort decisions before scaling.

## Recommended reusable slice for next modules

1. Read schema for the target table and relationship tables.
2. Add focused RED handler tests for auth, permission, tenant context, list tenant isolation, create/update/deactivate, relationship validation, and audit event count.
3. Implement route registration with per-method permissions and CSRF for writes.
4. Use transaction for multi-table writes and audit insertion.
5. Add/extend OpenAPI and AI Tool Manifest.
6. Add typed frontend adapter and adapter tests.
7. Add page state container with TanStack Query and mutations.
8. Add presentational content/list/drawer/states using existing Users/Tenants layout style.
9. Run focused tests, package tests, typecheck, and browser smoke.
10. Add module review note and append-only issue completion note.
