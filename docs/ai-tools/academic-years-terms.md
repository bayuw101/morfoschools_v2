# Manage academic years and terms

## Intent
Manage tenant academic years and terms for Academic Setup.

## Permission
- `academic:read` for `GET /api/v1/academic-years`
- `academic:write` for `POST /api/v1/academic-years`, `POST /api/v1/terms`, `PATCH /api/v1/terms/{id}`, `POST /api/v1/academic-years/{id}/duplicate`, and `PATCH /api/v1/academic-years/{id}/archive`

## Endpoints
- `GET /api/v1/academic-years` — list effective-tenant academic years with nested terms.
- `POST /api/v1/academic-years` — create academic year. If status is `active`, closes the previous active academic year for that tenant.
- `POST /api/v1/terms` — create term inside an effective-tenant academic year. If status is `active`, closes the previous active term in that academic year.
- `PATCH /api/v1/terms/{id}` — edit a non-archived effective-tenant term. If status is updated to `active`, closes sibling active terms in the same academic year.
- `POST /api/v1/academic-years/{id}/duplicate` — duplicate an academic year into the next school year and copy child semester rows with dates shifted by one year.
- `PATCH /api/v1/academic-years/{id}/archive` — archive an academic year and cascade archive child terms.

## Confirmation Gate
Writes require an authenticated browser session, matching CSRF token, and explicit user confirmation in UI for archive actions.

## Success Proof
- Response includes created/listed `AcademicYearRow` and nested `TermRow` records.
- Database state preserves one active year and one active term invariant.
- Audit evidence exists for `academic_years.create`, `terms.create`, `terms.update`, `academic_years.duplicate`, and `academic_years.archive`.

## Failure Cases
- Missing session: `unauthenticated`.
- Missing tenant: `tenant_context_required`.
- Missing permission: `forbidden`.
- Term outside parent year dates: `term_outside_academic_year`.

## Tenant isolation
All queries and writes derive tenant scope from the authenticated subject effective tenant; request body tenant IDs are ignored.
