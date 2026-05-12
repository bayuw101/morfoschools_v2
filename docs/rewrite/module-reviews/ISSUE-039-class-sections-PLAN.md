# ISSUE-039 — Class Sections Implementation Plan

Status: Backend-first TDD kickoff for Phase 7 Academic Structure.

## Scope

Build tenant-scoped administrative class section management.

Class sections are administrative homeroom/rombel records for a tenant and academic year. They are intentionally separate from academic `course_offerings`, `subject_groups`, teaching assignments, and enrollments.

## Existing Schema

Source: `backend/migrations/000005_academic_foundation.sql`

`class_sections` fields:

- `id`
- `tenant_id`
- `academic_year_id`
- `code`
- `name`
- `grade_level`
- `homeroom_teacher_id` nullable
- `status`: `active`, `inactive`, `archived`
- `metadata`
- timestamps

Tenant invariants:

- `UNIQUE (tenant_id, id)`
- `UNIQUE (tenant_id, academic_year_id, code)`
- `UNIQUE (tenant_id, academic_year_id, grade_level, name)`
- `(tenant_id, academic_year_id)` FK to `academic_years`
- `(tenant_id, homeroom_teacher_id)` FK to `teachers`

## Backend Contract

Endpoints:

```txt
GET   /api/v1/class-sections
POST  /api/v1/class-sections
PATCH /api/v1/class-sections/{id}
PATCH /api/v1/class-sections/{id}/archive
```

Permissions:

- Read: `academic:read`
- Write: `academic:write`

Tenant scope:

- Scope comes from authenticated subject effective tenant first, then tenant.
- Client body must not be allowed to spoof tenant scope.
- Tenantless platform/master users must select/switch an effective tenant before using these endpoints.

List response:

- Returns only rows in current effective tenant.
- Includes academic year summary fields so the UI can render school-year context without extra per-row calls.
- Includes nullable homeroom teacher summary when assigned.
- Deterministic sort: active-ish status, academic year start desc, grade level, name.

Create request:

```json
{
  "academicYearId": "uuid",
  "code": "VII-A",
  "name": "Kelas 7A",
  "gradeLevel": "7",
  "homeroomTeacherId": "uuid-or-empty",
  "status": "active"
}
```

Validation:

- `academicYearId`, `code`, `name`, and `gradeLevel` are required.
- `status` defaults to `active` and must be `active`, `inactive`, or `archived`.
- Academic year must exist in same tenant and must not be archived.
- Homeroom teacher, when provided, must exist in same tenant and not be archived.
- Unique conflicts should return domain validation/conflict errors rather than generic 500 where practical.

Update request:

- Same mutable fields as create.
- Cannot update an archived class section.
- New academic year and homeroom teacher must be tenant-valid.

Archive:

- Soft archive by setting `status='archived'`.
- Archive should be idempotent enough for UI retry; if already archived, return the archived row.
- Future enrollment/course-offering dependencies may restrict archive later. For this slice, no cascade membership write exists yet.

Audit actions:

- `class_sections.create`
- `class_sections.update`
- `class_sections.archive`

## Backend TDD Plan

1. RED: unauthenticated class sections list rejects before DB/domain work.
2. RED: missing `academic:read` returns 403.
3. RED: list is tenant-scoped and excludes another tenant's same-looking section.
4. RED: create validates academic year tenant/status, optional homeroom teacher tenant/status, writes row, and emits `class_sections.create` audit.
5. RED: update edits mutable fields, rejects archived rows, validates relationships, and emits `class_sections.update` audit.
6. RED: archive soft-archives only current-tenant row and emits `class_sections.archive` audit.
7. GREEN: implement minimal handler/repository code.
8. Refactor into a dedicated `class_sections.go` if the Academic module grows too large; otherwise keep naming clear.

## Documentation Contract

Update:

- `docs/api/openapi.yaml`
- `docs/ai-tools/class-sections.md`
- `backend/internal/platform/docscontract/docs_contract_test.go`

Required OpenAPI coverage:

- all four endpoints;
- `ClassSection`, `CreateClassSectionRequest`, `UpdateClassSectionRequest` schemas;
- session/CSRF security;
- standard error responses.

## Frontend Follow-up After Backend Green

Route target:

- `/app/class-sections`

UI pattern:

- mirror `/app/academic-setup`, `/app/users`, and `/app/tenants` directory rhythm;
- compact header;
- metrics/search/filter toolbar;
- skeleton, empty, error, no-result states;
- right-pulled AppShell-scoped FormDrawer;
- centered ConfirmDialog for archive;
- no dummy initial rows;
- every input has leading icon;
- custom selects/date-safe fields only, no native browser UI chrome where app components exist.

## Non-goals for ISSUE-039

- Student membership assignment UI.
- Course offering creation.
- Subject groups.
- Teaching assignments.
- Enrollment materialization.

Those remain ISSUE-041 through ISSUE-043.
