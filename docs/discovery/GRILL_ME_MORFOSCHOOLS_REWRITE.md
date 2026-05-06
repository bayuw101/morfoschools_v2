# Grill Me — Morfoschools Production Rewrite Restart

Status: Phase 0 restarted from zero
Target repo: `/home/bayw/Documents/Morfosis/morfoschools/morfoschools`
Prototype reference: `/home/bayw/Documents/Morfosis/morfoschools/morfoschools_prototype`
Previous target contents archived at: `/home/bayw/Documents/Morfosis/morfoschools/_archives/morfoschools-reset-20260506-112710`

## Ground Rules

1. Start from Grill Me again before PRD, issues, or implementation.
2. Prototype is reference/read-only.
3. Target repo is intentionally empty except discovery/docs folders.
4. No code implementation until shared understanding is reached and PRD/issues are approved.
5. UI source of truth must be explicitly defined from prototype surfaces before coding.
6. Backend/database/security architecture must be decided before scaffolding.

## Initial User Intent

The user wants to delete/reset the current `morfoschools` target and rebuild from the beginning because the previous implementation drifted from prototype standards. The rewrite should re-establish checklist and docs from scratch.

## Open Grill Tracks

### A. Product Scope
- What is the exact MVP release scope?
- Which modules are v1 foundation vs deferred?
- Is the first milestone an interactive UI prototype, a real backend skeleton, or both together?

### B. UI Source of Truth
- Which prototype routes are canonical for login, app shell, dashboards, admin directories, courses, exams, and AI sidecar?
- Should target UI be pixel-perfect or improved-but-same-language?
- Which visual tokens are non-negotiable?

### C. Architecture Foundation
- What must exist before any product module: Docker Compose, Go API, Next.js, PostgreSQL, PgBouncer, Valkey, NATS, ClickHouse optional?
- What is the exact auth/session model?
- What tenant/RBAC model is mandatory from day one?

### D. Database Strategy
- Do we rebuild schema from zero or adapt prototype docs?
- UUID v7 vs ULID?
- Required base tables for tenants, users, roles, permissions, sessions, audit, academic, courses, exams.

### E. Rewrite Workflow
- Do we do UI-first review hubs before backend, or FE+BE per module from the start?
- What is the acceptance gate for each issue?
- What files become canonical: PRD, ISSUES, UI_SOURCE_OF_TRUTH, DATABASE_BASELINE, SECURITY_BASELINE?

## Decisions Log

### 2026-05-06 — Restart Direction

- Previous flow was acceptable; failure was execution quality and prototype adherence.
- Frontend can be directly monitored by user; backend needs more audit/discipline because user is less confident there.
- Do not improvise UI without explicit user permission.
- Frontend Phase 0 target surfaces:
  1. Login Page
  2. Dashboard with sidebar + header + AI Agents sidecar
  3. UI Gallery containing all available UI components/patterns
- These frontend surfaces must match the prototype as closely as possible.
- Backend must be approached with audit-first discipline before rewrite decisions.

### 2026-05-06 — Sequence Adjustment

- Keep the previous PRD/issues migration approach: improve repo structure, infra, backend structure, FE/BE wiring, security, and module-by-module production rewrite.
- Change the execution sequence: after infra foundation, create Base UI without backend wiring first.
- Base UI means UI-only Login, Dashboard/Admin panel shell, AI Agents sidecar, and UI Gallery.
- Purpose: user can visually monitor frontend quality before backend complexity is introduced.
- Backend remains audit-first and will be wired after UI base is approved.

## Active Grill Questions

1. Identify exact prototype source files/routes for Login, Dashboard/App Shell, AI Agents sidecar, and UI Gallery.
2. Confirm whether the base UI routes are `/login`, `/dashboard` or `/app`, and `/ui-gallery`.
3. Confirm UI Gallery component inventory.
4. Define backend audit checklist before any backend code is scaffolded.
