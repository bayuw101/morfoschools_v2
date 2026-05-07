# Morfoschools RBAC Matrix

Status: foundation contract for ISSUE-013
Date: 2026-05-07

## Security principles

- Frontend menu hiding is convenience only. Backend handlers must enforce permissions through centralized RBAC helpers.
- Tenant isolation is mandatory. A permission is valid only inside the authenticated/effective tenant unless a route explicitly allows platform administration.
- Master/platform access is explicit, auditable, and must not silently bypass tenant checks on normal tenant routes.
- Browser sessions use server-side session state. RBAC subject data is derived from `/auth/me`/session context, not from user-editable client storage.

## Permission catalog

| Permission | Purpose |
| --- | --- |
| `platform:admin` | Manage platform bootstrap and cross-tenant support. |
| `tenant:admin` | Manage tenant settings and tenant users. |
| `academic:manage` | Manage academic structure and courses. |
| `courses:teach` | Teach assigned courses. |
| `learning:access` | Access student learning surfaces. |
| `guardian:view` | View guardian/parent-facing student progress. |
| `finance:manage` | Manage finance placeholders. |
| `exams:proctor` | Proctor exams and monitor sessions. |
| `content:review` | Review learning content. |
| `tenants:read` | Read tenant directory for platform support. |
| `tenants:switch` | Switch effective tenant context for audited support. |

## Role-permission matrix

| Role | Permissions |
| --- | --- |
| `master_admin` | `platform:admin`, `tenant:admin`, `tenants:read`, `tenants:switch` |
| `school_admin` | `tenant:admin`, `academic:manage` |
| `academic_admin` | `academic:manage` |
| `teacher` | `courses:teach` |
| `student` | `learning:access` |
| `parent` | `guardian:view` |
| `finance` | `finance:manage` |
| `proctor` | `exams:proctor` |
| `content_reviewer` | `content:review` |

## Backend enforcement contract

Use `internal/platform/rbac.Authorize` for pure authorization decisions.
Use app middleware helpers for HTTP handlers:

- `WithSubject(ctx, Subject{...})` stores the authenticated subject in request context.
- `SubjectFromContext(ctx)` retrieves it.
- `requireAnyPermission("permission:code")` denies unauthenticated users with `401` and authenticated users lacking permission with `403`.
- `requireTenantPermission(tenantID, "permission:code")` additionally enforces tenant/effective-tenant match.

Expected behavior:

- Missing subject => `401 unauthenticated`.
- Missing permission => `403 forbidden`.
- Tenant mismatch => `403 forbidden`.
- Platform cross-tenant bypass is allowed only when the requirement explicitly enables it in pure RBAC policy.

## Current route scope note

The clean rewrite currently exposes only foundation routes and auth routes. Future domain API routes must wrap handlers with the RBAC middleware before implementation is marked complete.
