# Users AI Tool Manifest

## Intent
Manage tenant users for school administrators: list directory rows, create new tenant memberships, update display names and role assignments, or deactivate a tenant membership.

## Permission
Read actions require `users:read`. Mutating actions require `users:write`. Backend RBAC, session cookies, CSRF headers, and effective tenant context remain authoritative.

## Endpoint / Service Action
- `GET /api/v1/users` lists users in the effective tenant.
- `POST /api/v1/users` creates a user, membership, roles, and audit event.
- `PATCH /api/v1/users/{id}` updates display name and replaces tenant role assignments.
- `PATCH /api/v1/users/{id}/deactivate` archives the membership in the effective tenant.

## Required Fields
- Create: `email`, `displayName`, `roleCodes`.
- Update: `id`, `displayName`, `roleCodes`.
- Deactivate: `id`.

## Validation Rules
Tenant isolation is mandatory. Do not accept tenant IDs from agent input. Role codes must exist inside the effective tenant; otherwise return `role_not_found`. Missing selected tenant returns `tenant_context_required`.

## Clarification Questions
Ask which user, display name, and roles should be applied if any destructive or mutating input is ambiguous. Ask for tenant selection if the actor has no effective tenant.

## Confirmation Gate
Listing is read-only and may proceed with permission. Create, update, role replacement, and deactivate are mutating; deactivation is destructive for access and requires explicit user confirmation.

## Success Proof
Return the resulting `UserDirectoryRow` for create/update, `{ ok: true }` for deactivate, and Audit evidence with exactly one `users.create`, `users.update`, or `users.deactivate` event for mutating calls.

## Failure Cases
Expected errors include `unauthenticated`, `forbidden`, `tenant_context_required`, `validation_failed`, `role_not_found`, and `user_not_found`. On failure, do not retry destructive actions without new confirmation.

## Safety / Critical Path Notes
Tenant isolation and audit are non-negotiable. This module is not on the exam critical path and must not introduce ClickHouse, AI providers, Google APIs, or external dependencies.
