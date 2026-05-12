# ISSUE-038 — Academic Years and Terms Plan

Status: Draft plan / decision checkpoint
Created: 2026-05-11

## Why this issue is next

The Users/Tenants SaaS bridge has runtime smoke evidence. Academic structure should now be implemented before deeper Teachers/Students profile work so future teacher assignments, class sections, and student enrollments attach to real tenant-scoped academic years and terms.

See:

- `docs/rewrite/USERS_TENANTS_IMPLEMENTATION_AUDIT.md`
- `docs/rewrite/ACADEMIC_STRUCTURE_REORDER_NOTE.md`
- `backend/migrations/000005_academic_foundation.sql`

## Decision checkpoint before coding

Ask/confirm these before implementation:

1. Permission names: confirmed `academic:read` and `academic:write` for first slice.
2. Active invariant: confirmed one active academic year per tenant and one active term per tenant. Activating one record should demote/close sibling active records in the same tenant scope.
3. Route/navigation label: confirmed label `Academic Setup`. Implementation opinion: use route `/app/academic-setup`, page title `Academic Setup`, and primary section copy `Academic Years & Terms` because this page can later host class/subject setup shortcuts without renaming the navigation item.
4. Archive policy: confirmed cascade. Archiving an academic year should archive its terms in the same transaction and audit the user action. Later dependent entities should follow the same archive semantics when implemented.
5. UI relationship shape: confirmed nested. Terms are managed under a selected academic year, not as a disconnected top-level CRUD table.

## Proposed backend contract

Academic years:

- `GET /api/v1/academic-years`
- `POST /api/v1/academic-years`
- `PATCH /api/v1/academic-years/{id}`
- `PATCH /api/v1/academic-years/{id}/archive`
- `POST /api/v1/academic-years/{id}/activate`

Terms:

- `GET /api/v1/terms?academicYearId=<id>`
- `POST /api/v1/terms`
- `PATCH /api/v1/terms/{id}`
- `PATCH /api/v1/terms/{id}/archive`
- `POST /api/v1/terms/{id}/activate`

DTO sketch:

```txt
AcademicYearRow:
- id
- tenantId
- code
- name
- startsOn
- endsOn
- status: draft | active | closed | archived
- termCount
- activeTermId
- activeTermName
- createdAt
- updatedAt

TermRow:
- id
- tenantId
- academicYearId
- code
- name
- startsOn
- endsOn
- status: draft | active | closed | archived
- createdAt
- updatedAt
```

Validation:

- code/name required;
- startsOn and endsOn required;
- startsOn <= endsOn;
- term date range must be inside parent academic year date range;
- status must be one of schema allowed values;
- tenant scope always from session/effective tenant;
- no client body tenant ID accepted.

Audit actions:

- `academic_years.create`
- `academic_years.update`
- `academic_years.archive`
- `academic_years.activate`
- `terms.create`
- `terms.update`
- `terms.archive`
- `terms.activate`

## Proposed backend TDD order

1. Add devseed permissions/role grants for academic read/write.
2. Add route registration in `backend/internal/app/app.go` through a new `academic.go` file.
3. RED tests in `backend/internal/app/academic_test.go`:
   - unauthenticated rejected before DB work;
   - missing permission forbidden;
   - tenantless non-platform user gets tenant_context_required;
   - list returns only effective tenant rows;
   - create validates required fields/date range and writes audit;
   - update cannot cross tenant and writes audit;
   - archive cannot cross tenant and writes audit;
   - term create validates parent year same tenant and date range within year;
   - activate enforces single active academic year/term per tenant if decision confirms that invariant.
4. Implement minimal handler/repository logic using Users/Tenants transaction pattern.
5. Run:
   - `gofmt -w backend/internal/app/academic.go backend/internal/app/academic_test.go`
   - `go test ./internal/app -run 'TestAcademic|TestTerms'`
   - `go test ./...`
   - `go build ./...`

## Proposed frontend slice

Files:

- `frontend/src/lib/academic-api.ts`
- `frontend/src/lib/academic-api.test.ts`
- `frontend/src/app/(app)/app/academic-years/page.tsx`
- `frontend/src/app/(app)/app/academic-years/academic-years-page.tsx`
- `frontend/src/app/(app)/app/academic-years/academic-year-drawers.tsx`
- `frontend/src/app/(app)/app/academic-years/academic-year-list.tsx`
- `frontend/src/app/(app)/app/academic-years/academic-year-states.tsx`
- `frontend/src/app/(app)/app/academic-years/academic-years-domain.ts`

UI behavior:

- dense header matching Users/Tenants pages;
- metrics: total years, active years, active terms, archived;
- search/filter by status;
- nested term summary per academic year row;
- right-side drawer for create/edit academic year;
- right-side drawer for create/edit term scoped to selected year;
- centered ConfirmDialog for archive/activate actions;
- skeleton/empty/error/filtered-empty states;
- toasts or success feedback for mutations;
- no dummy rows.

## Docs to update during implementation

- `docs/api/openapi.yaml`
- `docs/ai-tools/academic-years.md` or `docs/ai-tools/ISSUE-038-academic-years-terms.md`
- `docs/rewrite/module-reviews/ISSUE-038-academic-years-terms.md`
- append-only completion/update note in `docs/issues/morfoschools-rewrite-v2-ISSUES.md`
- `docs/handoff/CURRENT.md`

## Known dirty-state caution

The repo currently has many modified and untracked files from Users/Tenants implementation. Do not reset or clean. Before editing code, re-run `git status --short` and avoid overwriting unrelated active work.
