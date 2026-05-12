# Tenants AI Tool Manifest

## Intent
Manage platform tenant/school onboarding for master administrators: list tenants, create a new tenant, and bootstrap the first school administrator identity for that tenant.

## Permission
Listing requires `tenants:read` or `platform:admin`. Tenant creation and logo upload require `tenants:write` or `platform:admin`. First-admin bootstrap requires `tenants:bootstrap` or `platform:admin`. Backend RBAC, session cookies, CSRF headers, and audit events remain authoritative.

## Endpoint / Service Action
- `GET /api/v1/platform/tenants` lists platform tenants before or after tenant selection.
- `POST /api/v1/platform/tenants` creates a tenant, default theme settings, default tenant roles/permissions, and a `tenants.create` audit event.
- `PATCH /api/v1/platform/tenants/{id}` updates tenant `code`, `name`, and `status` (`active`, `suspended`, or `archived`).
- `POST /api/v1/platform/tenants/{id}/logo` uploads a PNG or WEBP tenant logo to configured R2-compatible object storage and stores `logoUrl`, `logoObjectKey`, and `logoContentType` on the tenant.
- `POST /api/v1/platform/tenants/{id}/bootstrap-admin` creates or links the first school admin identity, password credential, active membership, `school_admin` role assignment, and a `tenants.bootstrap_admin` audit event.

## Required Fields
- Create tenant: `code`, `name`.
- Update tenant: `tenant id`, `code`, `name`, `status`.
- Upload logo: `tenant id`, multipart form field `logo` containing PNG or WEBP, max 2 MB.
- Bootstrap admin: `tenant id`, `email`, `displayName`, `password`.

## Validation Rules
Tenant code is normalized to lowercase slug style. Tenant status must be `active`, `suspended`, or `archived`. Tenant creation does not require pre-existing tenant context. Logo upload requires a non-archived tenant and configured R2 storage. Bootstrap requires an active tenant; missing tenant-local default roles are repaired before assigning `school_admin`. Passwords must satisfy the backend password policy and are stored only as password hashes.

## Clarification Questions
Ask for the tenant/school display name and tenant code if ambiguous. Ask for the first school admin email/display name/password setup decision before bootstrap. Ask for confirmation before creating or bootstrapping production tenants.

## Confirmation Gate
Listing is read-only. Tenant creation and bootstrap are mutating platform actions and require explicit confirmation, especially because bootstrap grants administrative access.

## Success Proof
Tenant creation returns a `PlatformTenantRow` and must have one `tenants.create` audit event plus default theme and role rows. Bootstrap returns the resulting tenant user directory row and must have one `tenants.bootstrap_admin` audit event, password credential, active membership, and `school_admin` role assignment.

## Failure Cases
Expected errors include `unauthenticated`, `forbidden`, `validation_failed`, `tenant_create_failed`, `unsupported_logo_type`, `logo_too_large`, `logo_storage_unavailable`, `logo_upload_failed`, `tenant_bootstrap_failed`, and `tenant_or_role_not_found`. On failure, do not retry bootstrap with a different email/password without renewed confirmation.

## Safety / Critical Path Notes
This module is platform administration, not the exam critical path. It must not depend on ClickHouse, AI providers, Google APIs, or external webhooks. Do not expose raw passwords, cookies, CSRF tokens, or session tokens in logs or AI responses.
