# Morfoschools Golden CRUD Pattern

Status: Locked execution template for ISSUE-032 and later FE+BE modules.

This document defines the production pattern for every backend-wired admin module after the foundation phases. ISSUE-032 Manage Users must be implemented as the first golden module and later modules should copy this structure unless a module-specific PRD explicitly overrides it.

## Core Principle

A module is not complete when the page renders or an endpoint returns data. A module is complete only when the full vertical slice is verified:

```txt
Schema / existing tables
→ backend repository/service/handler
→ RBAC + tenant isolation + CSRF/idempotency where needed
→ audit event evidence
→ OpenAPI + AI Tool Manifest note
→ typed frontend API adapter
→ TanStack Query page integration
→ custom Zod/react-hook-form interactions
→ skeleton/empty/error/loading/success states
→ browser smoke + security review + performance note
→ module review document
```

## Required Artifacts per Module

For `ISSUE-NNN <module>` create or update:

```txt
docs/api/openapi.yaml
docs/ai-tools/ISSUE-NNN-<module>.md
docs/rewrite/module-reviews/ISSUE-NNN-<module>.md
```

If the module requires an implementation plan before coding, add:

```txt
docs/rewrite/module-reviews/ISSUE-NNN-<module>-PLAN.md
```

Do not create new rewrite artifacts in the prototype repo.

## Slice Order

### 1. Contract and RED Tests First

Before implementation, define the interface:

- endpoints and methods;
- request/response DTOs;
- permissions;
- tenant/effective-tenant behavior;
- audit actions;
- frontend route and UI states;
- browser smoke and review evidence.

Start with failing tests that prove the missing behavior. For backend modules this usually means handler-boundary tests first, then repository/service tests where needed. For frontend modules this usually means API adapter/domain-helper tests before wiring App Router pages.

### 2. Backend Foundation

Every tenant-scoped backend module must:

- derive tenant scope from authenticated session/effective tenant, never from trusted client body fields;
- reject unauthenticated requests with `401` before domain work;
- reject missing permissions with `403`;
- return a clear tenant-context-required error for tenantless users who have not selected an effective tenant;
- filter list/detail queries by effective tenant;
- validate relationship writes inside the same tenant;
- wrap multi-table writes in transactions;
- emit audit events for create/update/deactivate/delete/role assignment/link changes;
- use standard response/error envelopes;
- document pagination/filter/sort behavior.

Recommended backend endpoint shape:

```txt
GET    /api/v1/<resources>
POST   /api/v1/<resources>
GET    /api/v1/<resources>/{id}
PATCH  /api/v1/<resources>/{id}
POST   /api/v1/<resources>/{id}/deactivate
```

Use DELETE only when the product genuinely wants deletion. For school admin data, prefer deactivate/archive.

### 3. OpenAPI and AI Tool Manifest

Update OpenAPI for every exposed endpoint with:

- path, method, summary, tags;
- session/CSRF security requirements;
- request body schema;
- success response schema;
- standard error responses;
- tenant/RBAC notes in descriptions where helpful.

Add AI Tool Manifest note for future agent-callable actions. Required sections:

- Intent;
- Permissions;
- Endpoint / Service Action;
- Required Fields;
- Validation Rules;
- Clarification Questions;
- Confirmation Gate;
- Success Proof;
- Failure Cases;
- Safety / Critical Path Notes.

AI manifests do not grant access. Backend RBAC, tenant isolation, CSRF/session, and audit remain mandatory.

### 4. Frontend API Adapter

Every backend-wired page gets a typed adapter near the route or in `src/lib` when reused.

Adapter requirements:

- use the project API client with credentials and CSRF behavior;
- normalize backend payloads into UI-safe shapes;
- provide safe defaults for arrays/counts/status labels;
- never seed API-backed React state with dummy rows;
- map backend validation/global errors into form/global UI state;
- include tests for paths, methods, headers/credentials where practical, payload serialization, and error handling.

### 5. Frontend Page and Interaction Pattern

Backend-wired admin pages must include:

- skeleton state on initial load;
- empty state when no records exist;
- error state with retry action;
- search/filter/pagination where relevant;
- loading state on every action button;
- row-level loading for row actions;
- success feedback after mutations;
- custom error display for validation/global errors;
- shared ConfirmDialog for destructive/deactivation actions;
- form drawer for create/edit forms only, non-modal if that is the app shell standard;
- no native `alert`, `confirm`, or browser validation chrome;
- no fake identity/session fallback while auth is loading.

Visual hierarchy must follow the locked prototype/source-of-truth and the established sibling pages.

### 6. Module Review Note

Write the module review at:

```txt
docs/rewrite/module-reviews/ISSUE-NNN-<module>.md
```

Minimum sections:

```md
# ISSUE-NNN — <Module> Review

## Scope Delivered
## Backend Evidence
## Frontend Evidence
## RBAC and Tenant Isolation Evidence
## Audit Evidence
## Browser Smoke Evidence
## Security Review Evidence
## Performance Review Evidence
## OpenAPI / AI Tool Manifest Evidence
## Validation Commands
## Known Follow-ups
```

## Completion Gate

Do not mark an issue complete until all of these are true:

- focused backend tests pass;
- full backend tests/build pass or blocker is explicitly documented;
- focused frontend tests pass;
- full frontend tests/build pass or blocker is explicitly documented;
- browser smoke is recorded against frontend port `1666` and backend port `8080` where applicable;
- module review note exists;
- issue file has an append-only completion note with command evidence;
- no raw secrets, passwords, cookies, CSRF values, or session tokens are printed in user-facing summaries.

## ISSUE-032 Golden Users Module Expectations

ISSUE-032 should establish the pattern by delivering:

- users directory;
- create/edit/deactivate user flows;
- tenant membership and role assignment flow;
- server-side RBAC and tenant isolation;
- audit events for writes and role/membership changes;
- OpenAPI updates;
- `docs/ai-tools/ISSUE-032-users.md`;
- `docs/rewrite/module-reviews/ISSUE-032-users.md`;
- browser smoke for at least master admin in selected tenant, school admin, and denied/limited role behavior.
