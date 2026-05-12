# Manage class sections

## Intent
Manage tenant class sections for Academic Setup. Class sections model administrative homerooms/classes for an academic year, not subject/course offerings.

## Permission
- `academic:read` for `GET /api/v1/class-sections`
- `academic:write` for `POST /api/v1/class-sections`, `PATCH /api/v1/class-sections/{id}`, and `PATCH /api/v1/class-sections/{id}/archive`

## Endpoints
- `GET /api/v1/class-sections` — list effective-tenant non-archived class sections with academic year and optional homeroom teacher summaries.
- `POST /api/v1/class-sections` — create a class section inside an effective-tenant academic year.
- `PATCH /api/v1/class-sections/{id}` — edit a non-archived effective-tenant class section.
- `PATCH /api/v1/class-sections/{id}/archive` — soft-archive an effective-tenant class section.

## Confirmation Gate
Writes require an authenticated browser session, matching CSRF token, `academic:write`, and explicit user confirmation in UI for archive actions.

## Success Proof
- Response includes `ClassSectionRow` with `academicYear` and optional `homeroomTeacher` summaries.
- Relationship checks reject academic years and homeroom teachers from another tenant.
- Audit evidence exists for `class_sections.create`, `class_sections.update`, and `class_sections.archive`.

## Failure Cases
- Missing session: `unauthenticated`.
- Missing tenant: `tenant_context_required`.
- Missing permission: `forbidden`.
- Invalid body: `validation_failed`.
- Related academic year outside tenant: `academic_year_not_found`.
- Related homeroom teacher outside tenant: `homeroom_teacher_not_found`.
- Editing archived class section: `class_section_archived`.

## Tenant isolation
All queries and writes derive tenant scope from the authenticated subject effective tenant; request body tenant IDs are ignored.
