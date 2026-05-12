# Academic Structure Reorder Note

Last updated: 2026-05-11

## Decision

Before continuing deep Phase 6 profile modules (`ISSUE-034` Teachers, `ISSUE-035` Students, `ISSUE-036` Staff, `ISSUE-037` Guardians), prioritize the academic structure foundation from Phase 7, starting with `ISSUE-038 — Academic Years and Terms`.

This is not a scope reduction. It is a dependency reorder so teacher/student profile work can connect to real school structure instead of temporary placeholders.

## Why reorder

The current Users/Tenants bridge is now runtime-smoked for the core SaaS journey:

- master admin login;
- tenant create/edit;
- first school admin bootstrap;
- switch tenant;
- master admin users CRUD in selected tenant;
- school admin login;
- school admin users CRUD.

The next natural user-facing modules (teachers/students) depend on academic structure for a realistic LMS flow:

- teacher profiles become useful when homeroom/teaching relationships can point to real academic years, terms, class sections, subjects, and offerings;
- student profiles become useful when enrollment/class-section relationships can point to real academic years/terms/classes;
- Phase 7 schema already exists in `backend/migrations/000005_academic_foundation.sql` and should be activated through CRUD modules before profile modules accumulate UI debt;
- doing teachers/students first would force placeholder fields and later rewrites.

## Current schema foundation already available

`backend/migrations/000005_academic_foundation.sql` defines:

- `academic_years`
- `terms`
- `class_sections`
- `subjects`
- `subject_groups`
- `subject_group_members`
- `course_offerings`
- `teaching_assignments`
- `enrollments`

Relevant constraints already exist:

- all academic records are tenant-scoped;
- academic year codes are unique per tenant;
- terms are unique by tenant + academic year + code;
- class sections are unique by tenant + academic year + code and tenant + academic year + grade + name;
- subjects are unique by tenant + code;
- course offerings link class section + subject + term;
- teaching assignments link teacher + course offering;
- enrollments link student + course offering.

## Recommended execution order

1. `ISSUE-038 — Academic Years and Terms module`
2. `ISSUE-039 — Class Sections module`
3. `ISSUE-040 — Subjects module`
4. Then decide between:
   - `ISSUE-034 — Manage Teachers module`, if teacher identity/profile setup is needed before course offering assignments; or
   - `ISSUE-042 — Teaching Assignments module`, if teacher profile minimum exists and assignment flow can be implemented.
5. `ISSUE-035 — Manage Students module` once class sections are available.
6. `ISSUE-041 — Subject Groups module` and enrollment/member flows as needed for cross-class/remedial/enrichment behavior.

## ISSUE-038 recommended scope

Backend:

- Add routes for academic years and nested/related terms.
- Recommended endpoints:
  - `GET /api/v1/academic-years`
  - `POST /api/v1/academic-years`
  - `PATCH /api/v1/academic-years/{id}`
  - `PATCH /api/v1/academic-years/{id}/archive`
  - `GET /api/v1/terms?academicYearId=...`
  - `POST /api/v1/terms`
  - `PATCH /api/v1/terms/{id}`
  - `PATCH /api/v1/terms/{id}/archive`
  - optionally `POST /api/v1/terms/{id}/activate` if active-term selection needs a dedicated invariant.
- Use permissions such as `academic:read` and `academic:write`, or document and seed exact names before coding.
- Derive tenant from session/effective tenant only.
- Require CSRF for writes.
- Validate date ranges.
- Validate term date range within academic year date range.
- Enforce one active academic year / active term per tenant if product wants a single active selector; otherwise document that active is not unique yet.
- Emit audit actions:
  - `academic_years.create`
  - `academic_years.update`
  - `academic_years.archive`
  - `terms.create`
  - `terms.update`
  - `terms.archive`
  - `terms.activate` if implemented.

Frontend:

- Add `/app/academic-years` or equivalent route after confirming navigation naming.
- Copy the Users/Tenants split:
  - typed API adapter;
  - domain filter/metrics helpers;
  - page container with TanStack Query/mutations;
  - presentational content;
  - desktop/mobile list;
  - right-side form drawers;
  - centered ConfirmDialog for archive/activate confirmations;
  - skeleton/empty/error/filtered-empty states;
  - no dummy initial rows.
- UI should expose academic years and their terms in a way that does not feel like two disconnected CRUD tables. Recommended first version: academic year directory with nested term chips/rows and drawer actions for year/term.

Docs/testing:

- Add OpenAPI docs.
- Add AI Tool Manifest at `docs/ai-tools/academic-years.md` or `docs/ai-tools/ISSUE-038-academic-years-terms.md`.
- Add module review note at `docs/rewrite/module-reviews/ISSUE-038-academic-years-terms.md`.
- Add focused backend tests before implementation for auth, permission, tenant context, tenant isolation, date validation, active-term invariant, and audit.
- Add frontend adapter/domain/page tests before or alongside UI wiring.

## Open decisions before coding ISSUE-038

1. Permission names: confirmed to use simple `academic:read` / `academic:write` for first slice.
2. Active invariant: confirmed exactly one active academic year and one active term per tenant.
3. Term hierarchy: confirmed nested; terms should be managed inside/under a selected academic year rather than as a disconnected top-level CRUD table.
4. Archive policy: confirmed cascade; if an academic year is archived, archive its terms as part of the same user action. Later child records (classes/offerings/enrollments) should follow the same archive semantics when implemented, with explicit audit coverage.
5. Navigation label: confirmed `Academic Setup`. Recommended route remains `/app/academic-setup` or `/app/academic-years`; my implementation opinion is `/app/academic-setup` for the sidebar label and future expansion, with the page title showing "Academic Setup" and the primary section called "Academic Years & Terms".

## Current recommendation

Proceed to TDD implementation of `ISSUE-038` using the confirmed decisions above.
