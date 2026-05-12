# Current Handoff — Morfoschools

Last verified: 2026-05-11.

## Why this file exists

This file is the first stop after a laptop restart or new Hermes session. It prevents the agent from guessing from partial memory.

Before answering "continue", "lanjut", or "what next", the agent must read this file, then verify against `docs/issues/morfoschools-rewrite-v2-ISSUES.md`, relevant module review docs, and `git status --short`.

## Verified repository state

Target repo:

`/home/bayw/Documents/Morfosis/morfoschools/morfoschools`

Prototype/reference repo:

`/home/bayw/Documents/Morfosis/morfoschools/morfoschools_prototype`

Prototype is read-only reference.

## Source-of-truth files checked

- `AGENTS.md`
- `docs/handoff/CURRENT.md`
- `docs/PROJECT_CONTEXT.md`
- `docs/issues/morfoschools-rewrite-v2-ISSUES.md`
- `docs/rewrite/ACADEMIC_STRUCTURE_REORDER_NOTE.md`
- `docs/rewrite/module-reviews/ISSUE-038-academic-years-terms-PLAN.md`
- `backend/internal/app/app.go`
- `backend/internal/app/users.go`
- `backend/internal/app/users_test.go`
- `backend/internal/app/platform_test.go`
- `backend/internal/platform/devseed/devseed.go`
- `backend/migrations/000005_academic_foundation.sql`
- `backend/internal/platform/docscontract/docs_contract_test.go`
- `docs/api/openapi.yaml`

## Current implementation evidence

Current target repo contains active implementation, not only planning docs.

Frontend implemented surfaces include:

- `/`
- `/login`
- `/app`
- `/app/gallery`
- `/app/users`
- `/app/tenants`
- `/ui-gallery`
- `/api/ai-chat`

Backend implementation areas include:

- app foundation
- auth/session
- RBAC middleware
- platform/tenant operations
- users API
- theme handling
- tenant logo storage
- dev seed
- migrations through tenant logo/primary admin support
- academic foundation schema through `backend/migrations/000005_academic_foundation.sql`
- academic years/terms backend route slice started in `backend/internal/app/academic.go`

Runtime smoke evidence appended in issues file on 2026-05-11 says local stack was tested against:

- Frontend: `http://127.0.0.1:1666`
- Backend: `http://127.0.0.1:18080`
- `/readyz` ready for database, NATS, and Valkey

Verified smoke journey from docs:

- master admin login
- tenant create
- tenant edit
- tenant admin bootstrap
- master admin switch tenant
- master admin users CRUD in switched tenant
- bootstrapped school admin login
- school admin tenant-scoped users CRUD

## ISSUE-038 progress in latest session

Started backend Academic Years and Terms with strict TDD.

Changed/created:

- `backend/internal/app/academic_test.go`
  - RED/GREEN handler tests for auth before DB access, RBAC, tenant-scoped list with nested terms, create academic year single-active invariant + audit, create term parent/date validation + single-active invariant + audit, archive year cascade terms + audit.
- `backend/internal/app/academic.go`
  - Registered handler implementation for:
    - `GET /api/v1/academic-years`
    - `POST /api/v1/academic-years`
    - `POST /api/v1/terms`
    - `PATCH /api/v1/academic-years/{id}/archive`
  - Uses effective tenant context, CSRF on writes, `academic:read`/`academic:write`, audit events, and tenant-scoped SQL.
- `backend/internal/app/app.go`
  - Calls `a.registerAcademicRoutes(mux)`.
- `backend/internal/platform/devseed/devseed.go`
  - Added `academic:read` and `academic:write` dev permissions.
  - Added those permissions to `school_admin` and `academic_admin` seeded roles.
- `backend/internal/platform/docscontract/docs_contract_test.go`
  - Added Academic Years/Terms OpenAPI + AI Tool Manifest contract test.
- `docs/api/openapi.yaml`
  - Added Academic Years/Terms paths and schemas.
- `docs/ai-tools/academic-years-terms.md`
  - Added AI tool manifest notes.

Verification run:

- `go test ./internal/app -run 'TestAcademic|TestListAcademic|TestCreateAcademic|TestCreateTerm|TestArchiveAcademic'` — PASS.
- `go test ./internal/app` — PASS.
- `go test ./internal/platform/docscontract -run TestAcademicYearsTermsAPIDocumentationContract` — PASS.
- `go test ./...` from `backend/` — PASS.

## ISSUE-038 frontend wiring progress

Academic Setup frontend API client and page are now implemented for the Academic Years/Terms backend slice.

Changed/created:

- `frontend/src/lib/academic-api.test.ts`
  - API client tests for list academic years, create academic year, create term, and archive academic year endpoint behavior.
- `frontend/src/lib/academic-api.ts`
  - Client functions for `GET /api/v1/academic-years`, `POST /api/v1/academic-years`, `POST /api/v1/terms`, and `PATCH /api/v1/academic-years/{id}/archive`.
- `frontend/src/config/routes.ts`
  - Added `academicSetup: "/app/academic-setup"`.
- `frontend/src/config/navigation.ts`
  - Added `Academic Setup` navigation item for `master_admin`, `school_admin`, and `academic_admin`.
- `frontend/src/config/navigation.test.ts`
  - Added route visibility assertions for Academic Setup.
- `frontend/src/app/(app)/app/academic-setup/page.tsx`
  - React Query wiring for list/create/archive mutations, toast feedback, drawer state, and confirm state.
- `frontend/src/app/(app)/app/academic-setup/academic-setup-page.tsx`
  - Dense Academic Setup UI with header, metrics/search/filter toolbar, loading skeletons, empty/error/no-result states, year cards, nested term rows, pulled-right FormDrawer, centered ConfirmDialog, and no dummy initial rows.
- `frontend/src/app/(app)/app/tenants/tenants-page.source.test.ts`
  - Patched existing source-contract test to follow the refactored tenant drawer barrel file.

Verification run:

- `npm test -- --run src/lib/academic-api.test.ts src/config/navigation.test.ts` from `frontend/` — PASS.
- `npx tsc --noEmit` from `frontend/` — PASS.
- `npm test -- --run` from `frontend/` — PASS, 19 files / 83 tests.
- `go test ./...` from `backend/` — PASS.

## ISSUE-038 runtime smoke completion

Runtime smoke for `/app/academic-setup` is complete against local Docker Compose stack:

- Frontend: `http://127.0.0.1:1666`
- Backend: `http://127.0.0.1:18080`
- `/readyz` returned ready.

Verified school admin browser journey:

- Login via `/login` dev persona.
- Academic Setup nav item appears.
- Empty state uses real backend data only, no dummy rows.
- Create academic year succeeds.
- Add term succeeds for created year.
- Archive academic year succeeds and cascades terms; page returns to empty state.
- Toasts, pulled-right drawer, and centered confirm dialog behave like Users/Tenants patterns.

Validation run after smoke:

- `npm test -- --run src/lib/academic-api.test.ts src/config/navigation.test.ts` from `frontend/` — PASS.
- `npx tsc --noEmit` from `frontend/` — PASS.
- `go test ./...` from `backend/` — PASS.

Implementation note:

- Browser smoke exposed a date-input edge case. `frontend/src/app/(app)/app/academic-setup/academic-setup-page.tsx` now normalizes selected academic-year dates with `dateOnly(...)` before seeding term form `<input type="date">` values.

## Latest frontend polish checkpoint

Continued the active Academic Setup UI polish after context compaction.

Verified current `frontend/src/app/(app)/app/academic-setup/academic-setup-page.tsx` already follows the Users/Tenants rhythm:

- compact header with badge/context copy and primary action;
- single `Panel` wrapping `DirectoryToolbar` plus data states;
- desktop table and mobile cards;
- pulled-right shared `FormDrawer`;
- centered `ConfirmDialog`;
- shared `DatePicker` instead of native date inputs.

Focused validation run on 2026-05-11:

- `npm test -- --run src/lib/academic-api.test.ts src/config/navigation.test.ts` from `frontend/` — PASS, 2 files / 8 tests.
- `npx tsc --noEmit` from `frontend/` — PASS.

Browser note:

- Re-opened `/app/academic-setup`; session was redirected to login because the prior browser session was teacher-scoped. Snapshot/DOM check confirms no native `input[type="date"]` / `datetime-local` controls are present in the current page bundle path.

## Current verified next task

ISSUE-038 frontend polish checkpoint is complete for the current active task. The next executable work remains Phase 7 ISSUE-039 Class Sections module, then ISSUE-040 Subjects, before returning to teacher/student assignment-heavy work. Recommended next executable slice:

1. Create module review/plan note for ISSUE-039 Class Sections using `docs/rewrite/GOLDEN_CRUD_PATTERN.md`.
2. Inspect existing academic schema in `backend/migrations/000005_academic_foundation.sql` for `class_sections` fields and invariants.
3. Add backend TDD for tenant-scoped class section list/create/update/archive with RBAC/audit.
4. Add OpenAPI + AI Tool Manifest docs contract for class sections.
5. Wire frontend `/app/class-sections` only after backend tests pass.
6. Runtime smoke and update this handoff before moving to ISSUE-040 Subjects.

## Dirty working tree warning

Latest `git status --short` still shows many pre-existing modified/untracked files from the broader Users/Tenants/Foundation work, plus the Academic files listed above.

Treat this as active work. Do not reset, clean, or overwrite without explicit user approval.

## Recommended continuation command for the agent

"Bootstrap Morfoschools context from AGENTS.md and docs/handoff/CURRENT.md, verify git status, inspect ISSUE-039 Class Sections schema/docs/code paths, then start ISSUE-039 with backend TDD first."

## Last known caution

A previous assistant answer incorrectly inferred next work from session memory without reading current docs/code. Future sessions must explicitly say whether they have verified from repo/docs/code before recommending the next task.

## Academic Setup retry adjustment — 2026-05-11 late

Continued preserved active task after context compaction: Academic Year backend contract and Academic Setup UI polish.

Changed:

- `backend/migrations/000005_academic_foundation.sql`
  - `terms.starts_on` and `terms.ends_on` are now nullable.
  - Term date check now allows empty dates.
- `backend/internal/app/academic.go`
  - `POST /api/v1/academic-years` accepts one school-year field via `code`; `name` is auto-filled from `code` if omitted.
  - Creating an academic year auto-creates `ganjil` and `genap` draft terms with empty dates.
  - `POST /api/v1/terms` allows optional dates and stores empty date fields as NULL.
  - Term list/find scans nullable dates safely and returns empty strings for unset term dates.
- `backend/internal/app/academic_test.go`
  - Added regression assertion for auto-created Ganjil/Genap terms with no date values.
  - SQLite test schema now allows nullable term dates.
- `frontend/src/app/(app)/app/academic-setup/academic-setup-page.tsx`
  - New academic year drawer now shows one `School year` field instead of separate code/name fields.
  - Year submit mirrors `name` from school year code for backend compatibility.
  - New term drawer starts with empty dates; schools can fill semester dates later.
  - Added leading icons for School year, Term code, Term name, DatePicker fields, and Status select.
  - Drawer copy now explains auto-prepared Semester Ganjil/Genap.

Verification run:

- `go test ./internal/app -run 'TestAcademic|TestListAcademic|TestCreateAcademic|TestCreateTerm|TestArchiveAcademic' -count=1` from `backend/` — PASS.
- `npm test -- --run src/lib/academic-api.test.ts src/config/navigation.test.ts` from `frontend/` — PASS, 2 files / 8 tests.
- `npx tsc --noEmit` from `frontend/` — PASS.
- `go test ./...` from `backend/` — PASS.
- `go test ./internal/platform/docscontract -count=1` from `backend/` — PASS.

Known dirty state:

- Repo still has many pre-existing modified/untracked files from Users/Tenants/Foundation and Academic work. Do not reset or clean without explicit approval.

Recommended next task:

- Run a browser smoke for `/app/academic-setup` to verify the revised one-field school-year flow creates an academic year and immediately displays draft Semester Ganjil/Genap rows with `—` dates, then archive cleanup.
- After that, move to Phase 7 ISSUE-039 Class Sections with backend TDD first.

## Academic Setup UX correction — tenant context + Indonesia semester wording — 2026-05-12

Follow-up from user review:

- DatePicker clipping:
  - `frontend/src/components/ui/date-picker.tsx` now supports `popoverAlign="start" | "end"`.
  - Academic Setup uses `popoverAlign="end"` for End date fields so the calendar aligns to the right edge when the field is near the screen/drawer edge.
- User-facing terminology:
  - Replaced Academic Setup UI copy from generic “term/terms” to Indonesian-friendly “semester”.
  - Buttons/metrics/empty/archive copy now use semester language; backend/internal DTO still uses `terms` for current API/schema compatibility.
- Default semester creation:
  - `backend/internal/app/academic.go` now auto-creates Semester Ganjil and Semester Genap with predefined editable dates derived from the academic year date range:
    - Ganjil: academic year start date through Dec 31 of the start year.
    - Genap: Jan 1 of the end year through academic year end date.
  - Tests now assert two auto-created semesters and four date values.
- Tenant context menu rule:
  - `frontend/src/config/navigation.ts` adds `requiresTenantContext` to tenant-scoped modules (`Users`, `Academic Setup`).
  - These items are hidden when `session.effectiveTenantId` is empty.
  - `frontend/src/config/navigation.test.ts` adds regression coverage for platform/master admin without an effective tenant: `Tenants` stays visible, `Users` and `Academic Setup` are hidden.

Verification run:

- `go test ./internal/app -run 'TestAcademic|TestListAcademic|TestCreateAcademic|TestCreateTerm|TestArchiveAcademic' -count=1` from `backend/` — PASS.
- `npm test -- --run src/config/navigation.test.ts src/lib/academic-api.test.ts` from `frontend/` — PASS, 2 files / 9 tests.
- `npx tsc --noEmit` from `frontend/` — PASS.
- `go test ./...` from `backend/` — PASS.

Recommended next task:

- Browser smoke `/app/academic-setup` specifically checking End date calendar right alignment inside the drawer, one-field School year create flow, auto Semester Ganjil/Genap rows with predefined dates, and menu visibility when logged in as master admin without tenant context.

## Academic Setup duplicate + one-field semester correction — 2026-05-12

Follow-up from user review:

- Semester drawer simplification:
  - `frontend/src/app/(app)/app/academic-setup/academic-setup-page.tsx` now uses one `Semester` field instead of separate `Kode semester` and `Nama semester` fields.
  - The submitted term mirrors that value into both `code` and `name` for current backend/API compatibility.
  - `backend/internal/app/academic.go` now also accepts missing term `name` and mirrors `code` into `name` server-side.
- Duplicate academic year:
  - Added `POST /api/v1/academic-years/{id}/duplicate`.
  - Duplicating a tenant academic year creates the next school year by shifting the year code and date range by one year. Example: `2026-2027`, `2026-07-01` to `2027-06-30` becomes `2027-2028`, `2027-07-01` to `2028-06-30`.
  - Non-archived child terms/semesters are copied into the new year with `starts_on` and `ends_on` shifted by one year.
  - Emits `academic_years.duplicate` audit event.
- Frontend wiring:
  - `frontend/src/lib/academic-api.ts` adds `duplicateAcademicYear`.
  - Academic Setup row/mobile action menu adds `Duplicate to next year` with per-row loading state.
  - Successful duplicate invalidates the Academic Years query and shows a success toast.
- Docs:
  - `docs/api/openapi.yaml` documents the duplicate endpoint.
  - `docs/ai-tools/academic-years-terms.md` documents duplicate permission, endpoint, and audit proof.

Verification run:

- `go test ./internal/app -run 'TestAcademic|TestListAcademic|TestCreateAcademic|TestCreateTerm|TestDuplicateAcademicYear|TestArchiveAcademic' -count=1` from `backend/` — PASS.
- `go test ./internal/platform/docscontract -count=1` from `backend/` — PASS.
- `npm test -- --run src/lib/academic-api.test.ts src/config/navigation.test.ts` from `frontend/` — PASS, 2 files / 9 tests.
- `npx tsc --noEmit` from `frontend/` — PASS.
- `go test ./...` from `backend/` — PASS.
- `npm test -- --run` from `frontend/` — PASS, 19 files / 84 tests.

Recommended next task:

- Browser smoke `/app/academic-setup` for: one-field semester drawer, duplicate row action creates next academic year with copied/adjusted semester dates, End Date datepicker right alignment, and tenant-context menu visibility.
- Then move to Phase 7 ISSUE-039 Class Sections with backend TDD first.

## Academic Setup archived-code recreate fix — 2026-05-12

Follow-up from runtime API report:

- User reproduced `POST /api/v1/academic-years` with payload `{"code":"2025-26","name":"2025-26","startsOn":"2025-06-01","endsOn":"2026-05-31","status":"draft"}` returning `500 academic_year_create_failed`.
- Root cause verified against local database: an academic year with code `2025-26` already existed for the tenant in `archived` status. The database still enforces `UNIQUE (tenant_id, code)`, so creating the same code again hit the unique constraint and the handler returned the generic create-failed envelope.

Changed:

- `backend/internal/app/academic_test.go`
  - Added regression coverage for reusing an archived academic-year code and regenerating fresh default Semester Ganjil/Genap rows.
- `backend/internal/app/academic.go`
  - `POST /api/v1/academic-years` now checks for an archived academic year with the same tenant/code.
  - If found, it restores/reuses that archived row by updating name, date range, and requested status.
  - It removes old child terms for that restored year and recreates default Semester Ganjil/Genap rows using the requested date range.
  - If no archived row exists, it keeps the normal insert behavior.

Verification run:

- `go test ./internal/app -run 'TestCreateAcademicYearReusesArchivedYearCodeWithFreshDefaultSemesters|TestCreateAcademicYearValidatesDatesEnforcesSingleActiveAndAudits|TestAcademic|TestListAcademic|TestCreateTerm|TestArchiveAcademic' -count=1 -v` from `backend/` — PASS.
- `go test ./...` from `backend/` — PASS.
- `docker compose up -d --build backend` from repo root — PASS, backend image rebuilt and container restarted.

Runtime note:

- A direct authenticated curl smoke against `http://127.0.0.1:18080/api/v1/academic-years` was attempted after rebuild, but the command was blocked by the execution safety layer before it ran. Do not infer runtime POST verification from curl; backend tests and Docker rebuild are verified.

Known dirty state:

- Repo still has many pre-existing modified/untracked files from Users/Tenants/Foundation and Academic work. Do not reset or clean without explicit approval.

Recommended next task:

- Browser smoke `/app/academic-setup` and retry creating `2025-26` from the UI/runtime API. Expected behavior: it should restore/reuse the archived row instead of returning `academic_year_create_failed`, then display Semester Ganjil/Genap with dates derived from 2025-06-01 through 2026-05-31.
- After runtime smoke passes, continue Phase 7 ISSUE-039 Class Sections with backend TDD first.


## Academic Setup edit semester completion — 2026-05-12

Continued preserved active task after context compaction: missing edit semester feature plus duplicate/recreate verification.

Changed:

- `backend/internal/app/academic.go`
  - Added `PATCH /api/v1/terms/{id}` route.
  - Validates CSRF, effective tenant, `academic:write`, non-archived parent year/term, date range inside the parent academic year, and single-active-semester invariant.
  - Emits `terms.update` audit event.
- `backend/internal/app/academic_test.go`
  - Added regression coverage for editing one semester, mirroring the single UI field into code/name, updating dates/status, closing prior active sibling when edited semester becomes active, and auditing.
- `frontend/src/lib/academic-api.ts` / `frontend/src/lib/academic-api.test.ts`
  - Added `updateTerm` client for `PATCH /api/v1/terms/{id}` and route/header regression coverage.
- `frontend/src/app/(app)/app/academic-setup/page.tsx`
  - Added term edit drawer state, update mutation, success/error toasts, and query invalidation.
- `frontend/src/app/(app)/app/academic-setup/academic-setup-page.tsx`
  - Added desktop/mobile Edit semester action.
  - Reuses the pulled-right `FormDrawer` in `term-edit` mode and pre-fills semester, dates, and status.
- `docs/api/openapi.yaml`
  - Added `PATCH /api/v1/terms/{id}` and `UpdateTermRequest`.
- `docs/ai-tools/academic-years-terms.md`
  - Added term update endpoint/permission/audit proof.
- `backend/internal/platform/docscontract/docs_contract_test.go`
  - Added doc contract snippets for `PATCH /api/v1/terms/{id}`, `UpdateTermRequest`, and `terms.update`.

Verification run:

- `go test ./internal/app -run 'TestNextAcademicYearCodePreservesShortYearFormat|TestDuplicateAcademicYearCreatesNextYearWithAdjustedTermsAndAudits|TestUpdateTermEditsSingleSemesterDatesStatusAndAudits' -count=1` from `backend/` — PASS.
- `go test ./internal/platform/docscontract -run TestAcademicYearsTermsAPIDocumentationContract -count=1` from `backend/` — PASS.
- `npm test -- --run src/lib/academic-api.test.ts src/config/navigation.test.ts` from `frontend/` — PASS, 2 files / 9 tests.
- `npx tsc --noEmit` from `frontend/` — PASS.
- `go test ./...` from `backend/` — PASS.
- `npm test -- --run` from `frontend/` — PASS, 19 files / 84 tests.

Known dirty state:

- Repo still has many pre-existing modified/untracked files from Users/Tenants/Foundation and Academic work. Do not reset or clean without explicit approval.

Recommended next task:

- Browser smoke `/app/academic-setup` for: create/recreate archived year code, one-field semester drawer, edit semester drawer, duplicate row action creates next academic year with adjusted semester dates, End Date datepicker right alignment, and tenant-context menu visibility.
- After runtime smoke passes, move to Phase 7 ISSUE-039 Class Sections with backend TDD first.

## 2026-05-12 Academic Year duplicate regression patch

User reported runtime `500 academic_year_duplicate_failed` on:

- `POST /api/v1/academic-years/{id}/duplicate`

Root cause isolated to duplicate code generation: duplicating `2026-2027` always tried to create `2027-2028`. If that target code already existed in the tenant, PostgreSQL `UNIQUE (tenant_id, code)` failed and the handler returned generic 500.

Patched:

- `backend/internal/app/academic.go`
  - duplicate now finds the first available shifted academic year code, up to 20 years ahead.
  - term date shifting now uses the same year offset as the generated target year.
- `backend/internal/app/academic_test.go`
  - added regression test `TestDuplicateAcademicYearSkipsExistingNextYearCode`.

Verification:

- `go test ./internal/app -run 'TestDuplicateAcademicYear|TestNextAcademicYearCode' -count=1` — PASS.
- `go test ./internal/app -count=1` — PASS.

Runtime note: if browser/backend still shows old duplicate behavior, rebuild/restart the backend container/process on port 18080 before re-testing.

## 2026-05-12 Runtime backend rebuild for Academic duplicate/edit smoke

User reported browser runtime still returned `500 academic_year_duplicate_failed` for:

- `POST /api/v1/academic-years/41e2357b-7570-42b0-b827-b50e063500d5/duplicate`

Investigation in this session:

- Confirmed current source already contains duplicate skip-existing-code logic in `backend/internal/app/academic.go`.
- Confirmed runtime database source row exists:
  - tenant `d6238aa9-0ce4-418f-bbf9-5991a8b25bbe`
  - academic year `41e2357b-7570-42b0-b827-b50e063500d5`
  - code `2025-26`, status `draft`
  - default terms `ganjil` and `genap` with non-null dates.
- Confirmed backend container before rebuild was old enough to only log the original startup timestamp (`2026/05/12 02:29:18`), consistent with stale runtime image/process risk noted earlier.

Action taken:

- Ran `docker compose up -d --build backend` from repo root.
- Build completed successfully and recreated `morfoschools-backend-1`.
- Verified backend is now up on `0.0.0.0:18080->8080/tcp` and `/healthz` returns OK.
- New backend log startup timestamp: `2026/05/12 03:21:45 morfoschools api foundation listening on :8080`.

Verification limitation:

- Browser session had stale teacher-scoped login state after rebuild; full duplicate/edit browser smoke was not completed in this handoff append.
- Next immediate action is to re-login with an academic-capable account/effective tenant and retry duplicate/edit in `/app/academic-setup` against the rebuilt backend.

Recommended next task:

- Ask user to hard refresh or re-login, then retry duplicate/edit. If `500` still occurs after this rebuild, add local development error logging around `duplicateAcademicYear`/`updateAcademicYear` to expose the wrapped SQL/transaction error, then add the missing regression test before patching.

## 2026-05-12 Academic Setup runtime smoke completed + Postgres scan/runtime fixes

Continued user-requested retry/runtime smoke for `/app/academic-setup` against local Docker Compose:

- Frontend: `http://127.0.0.1:1666`
- Backend: `http://127.0.0.1:18080`
- `/readyz` returned database, NATS, and Valkey ready.

Runtime failures found and patched:

1. `POST /api/v1/academic-years` still returned `500 academic_year_create_failed` after backend rebuild.
   - Root cause: Postgres returns `date` columns as `time.Time`; `listTenantAcademicYears` scanned `starts_on` / `ends_on` directly into string fields. The create transaction succeeded, then response hydration via `findAcademicYear` failed while scanning dates, triggering rollback and generic 500.
   - Patch: `backend/internal/app/academic.go` now scans academic-year date columns into `any` and normalizes with `dateOnlyString`, matching existing term scan behavior.
2. After that patch, create still returned `500` with logged error `invalid input syntax for type uuid: ""`.
   - Root cause: `freeArchivedAcademicYearCode(..., keepYearID="")` passed an empty string into `id <> $3` against a UUID column on normal create. SQLite tests did not catch this Postgres-specific UUID typing issue.
   - Patch: `freeArchivedAcademicYearCode` now only appends `AND id <> $3` when `keepYearID` is non-empty.
   - Added temporary structured error logging around `createAcademicYear` failure to expose wrapped runtime SQL errors during local development.

Verification run after patches:

- `go test ./internal/app -run 'TestCreateAcademicYear|TestDuplicateAcademicYear|TestUpdateTerm' -count=1` from `backend/` — PASS.
- `go test ./...` from `backend/` — PASS.
- `npm test -- --run src/lib/academic-api.test.ts src/config/navigation.test.ts` from `frontend/` — PASS, 2 files / 9 tests.
- `npx tsc --noEmit` from `frontend/` — PASS.
- `docker compose build backend && docker compose up -d backend` — PASS; backend container recreated.

Runtime smoke result:

- Logged in as `academic.admin@morfoschools.local` with demo tenant context.
- API/browser-session smoke created `SMOKE-688381` academic year — `201`.
- Create response included default Semester Ganjil/Genap with predefined dates.
- Edited Semester Ganjil to `Semester Ganjil Smoke` with active status — `200`.
- Duplicated the academic year — `201`; duplicate code became `SMOKE-688381 Copy`, dates shifted one year, and copied 2 terms.
- Archived original year — `200`.
- Archived duplicate cleanup year — `200`.
- Visual check: End Date DatePicker popover opens inside the right-side FormDrawer and is not clipped by the browser edge.
- Master Admin without effective tenant context shows Dashboard/Gallery/Tenants only; Users and Academic Setup are hidden as expected.

Known dirty state:

- Repo still has many pre-existing modified/untracked files from Foundation, Users, Tenants, and Academic work. Do not reset/clean without explicit approval.
- `backend/internal/app/academic.go` is untracked in git status because the whole Academic module is part of current active work; preserve it.

Recommended next task:

- Start Phase 7 ISSUE-039 Class Sections with backend TDD first:
  1. Create `docs/rewrite/module-reviews/ISSUE-039-class-sections-PLAN.md` using `docs/rewrite/GOLDEN_CRUD_PATTERN.md`.
  2. Inspect `backend/migrations/000005_academic_foundation.sql` class_sections schema/invariants.
  3. Add tenant-scoped class section list/create/update/archive backend tests with RBAC and audit.
  4. Add OpenAPI + AI Tool Manifest docs contract.
  5. Wire frontend `/app/class-sections` only after backend tests pass.

## 2026-05-12 ISSUE-039 Class Sections backend TDD slice

Continued from the recommended Phase 7 next task and implemented the backend-first class sections slice.

Changed/created:

- `docs/rewrite/module-reviews/ISSUE-039-class-sections-PLAN.md`
  - Added class sections implementation plan from the golden CRUD pattern.
- `backend/internal/app/class_sections_test.go`
  - Added RED/GREEN tests for auth-before-DB, RBAC, effective-tenant scoping, list filtering, create relationship validation/audit, update tenant isolation/audit, and archive hiding/audit.
- `backend/internal/app/class_sections.go`
  - Added handlers/routes for:
    - `GET /api/v1/class-sections`
    - `POST /api/v1/class-sections`
    - `PATCH /api/v1/class-sections/{id}`
    - `PATCH /api/v1/class-sections/{id}/archive`
  - Uses effective tenant context, `academic:read` / `academic:write`, CSRF on writes, same-tenant academic year and homeroom teacher validation, soft archive, and audit events.
- `backend/internal/app/app.go`
  - Calls `a.registerClassSectionRoutes(mux)`.
- `backend/internal/app/academic_test.go`
  - Extended the SQLite test schema with `teachers` and `class_sections` for fast class-section handler tests.
- `docs/api/openapi.yaml`
  - Added Class Sections paths and `ClassSectionRow` / `UpsertClassSectionRequest` schemas.
- `docs/ai-tools/class-sections.md`
  - Added AI Tool Manifest notes for class sections.
- `backend/internal/platform/docscontract/docs_contract_test.go`
  - Added OpenAPI + AI Tool Manifest contract coverage for class sections.

Verification run:

- `go test ./internal/app -run 'TestClassSections|TestAppRoutesClassSections' -count=1` from `backend/` — PASS.
- `go test ./internal/platform/docscontract -count=1` from `backend/` — PASS.
- `go test ./...` from `backend/` — PASS.
- `go build ./...` from `backend/` — PASS.

Known dirty state:

- Repo still has many pre-existing modified/untracked files from Foundation, Users, Tenants, Academic, and current Class Sections work. Do not reset/clean without explicit approval.
- Current Class Sections backend files are untracked/modified as part of active work.

Recommended next task:

- Continue ISSUE-039 with frontend wiring for `/app/class-sections` after inspecting existing `/app/academic-setup` and directory page patterns:
  1. Add frontend API client tests/helpers for class sections.
  2. Add navigation route/item if not present.
  3. Build `/app/class-sections` with skeleton/empty/error states, no dummy initial rows, premium dense toolbar, and AppShell-scoped right FormDrawer.
  4. Run focused frontend tests and `npx tsc --noEmit`.
  5. Rebuild/restart backend/frontend if browser runtime needs the new endpoint, then smoke list/create/update/archive.

## 2026-05-12 ISSUE-039 Class Sections frontend wiring slice

Continued the active ISSUE-039 frontend task after context compaction. Dirty state was preserved; no reset/clean was performed.

Changed/created:

- `frontend/src/lib/academic-api.test.ts`
  - Added class section client coverage for list/create/update/archive endpoint behavior through API envelopes.
- `frontend/src/lib/academic-api.ts`
  - Added class section types and client functions for:
    - `GET /api/v1/class-sections`
    - `POST /api/v1/class-sections`
    - `PATCH /api/v1/class-sections/{id}`
    - `PATCH /api/v1/class-sections/{id}/archive`
- `frontend/src/config/routes.ts`
  - Added `classSections: "/app/class-sections"`.
- `frontend/src/config/navigation.ts`
  - Added `Class Sections` navigation item for `master_admin`, `school_admin`, and `academic_admin`, tenant-context scoped.
- `frontend/src/config/navigation.test.ts`
  - Expanded Academic navigation assertions to include Class Sections and tenant-context hiding.
- `frontend/src/app/(app)/app/class-sections/page.tsx`
  - Added React Query wiring for class section list/create/update/archive, toasts, drawer state, and confirm state.
- `frontend/src/app/(app)/app/class-sections/class-sections-page.tsx`
  - Added dense directory UI with compact header, metrics/search/filter toolbar, loading skeletons, empty/error/no-result states, desktop table, mobile cards, pulled-right FormDrawer, centered ConfirmDialog, and no dummy initial rows.
  - Uses academic years from real API for selection and keeps homeroom teacher as optional ID input until teacher directory wiring exists.

Verification run:

- `npm test -- --run src/lib/academic-api.test.ts src/config/navigation.test.ts` from `frontend/` — PASS, 2 files / 12 tests.
- `npx tsc --noEmit` from `frontend/` — PASS.
- Initial `npm test -- --run` from `frontend/` timed out at 240s while Vitest was still starting; rerun with 600s completed successfully.
- `npm test -- --run` from `frontend/` — PASS, 19 files / 87 tests.
- `go test ./...` from `backend/` — PASS.

Known dirty state:

- Repo still has many pre-existing modified/untracked files from Foundation, Users, Tenants, Academic, and current Class Sections work. Do not reset/clean without explicit approval.
- Current Class Sections frontend files are untracked/modified as part of active work.

Recommended next task:

- Runtime smoke ISSUE-039 Class Sections against local Docker Compose stack:
  1. Ensure backend/frontend containers pick up class section backend + frontend changes.
  2. Login as school/admin persona with effective tenant context.
  3. Verify `/app/class-sections` nav visibility and no visibility for tenant-less platform context.
  4. Create an Academic Year if none exists, then list/create/edit/archive a Class Section.
  5. Confirm no dummy rows, loading/empty/error states, toast feedback, pulled-right FormDrawer, and centered ConfirmDialog.
  6. Update this handoff and then proceed to Phase 7 ISSUE-040 Subjects.

## 2026-05-12 ISSUE-039 runtime 404 fix

Browser reported `GET http://127.0.0.1:18080/api/v1/class-sections` returning `404 Not Found` after frontend wiring.

Root cause:

- Source code and backend tests already had `registerClassSectionRoutes(mux)` and class section handlers, but the running Docker backend container was built before the new route existed.
- The runtime binary on `127.0.0.1:18080` was stale.

Action taken:

- Rebuilt/recreated backend only with `docker compose up -d --build backend`.

Verification:

- `GET /readyz` on `127.0.0.1:18080` — `200` ready.
- Unauthenticated `GET /api/v1/class-sections` now returns `401 unauthenticated` instead of `404`, proving the route is present and protected by auth as expected.

Next runtime smoke step:

- Refresh browser/hard refresh if needed, login again if cookies/session are stale, then continue class section list/create/edit/archive smoke.
## 2026-05-12 skeleton fidelity polish

Updated loading skeletons so mobile and desktop states mirror real content structure instead of generic bars/cards.

Changed:

- `frontend/src/app/(app)/app/tenants/tenant-states.tsx`
  - Desktop table skeleton now includes tenant avatar/name/id, code pill, status pill, and action placeholders.
  - Mobile skeleton now mirrors tenant card with avatar, title, code/status chips, and kebab action.
- `frontend/src/app/(app)/app/users/user-states.tsx`
  - Desktop table skeleton now includes user avatar/name/email, roles, status, and action placeholder.
  - Mobile skeleton now mirrors user card with avatar, text stack, status/role chips, and action.
- `frontend/src/app/(app)/app/academic-setup/academic-setup-page.tsx`
  - Academic Setup loading state now has desktop year/term table skeleton and mobile academic-year card + nested semester skeleton.
- `frontend/src/app/(app)/app/class-sections/class-sections-page.tsx`
  - Class Sections loading state now has desktop class-section table skeleton and mobile class-section card skeleton.

Validation:

- `npx tsc --noEmit` from `frontend/` — PASS.
- `npm test -- src/lib/academic-api.test.ts src/lib/users-api.test.ts src/lib/tenants-api.test.ts` from `frontend/` — PASS, 3 files / 12 tests.

Note:

- `npm run typecheck` does not exist in the frontend package; use `npx tsc --noEmit`.
- An attempted test command containing unquoted route paths with `(app)` failed in shell parsing before execution; reran stable focused lib tests instead.
## 2026-05-12 class_sections_lookup_failed fix

Runtime error reported from `/api/v1/class-sections`:

```json
{
  "code": "class_sections_lookup_failed",
  "message": "Could not load class sections",
  "requestId": "req-26a1d0ba0df58ecc"
}
```

Root cause:

- `backend/internal/app/class_sections.go` selected `COALESCE(cs.homeroom_teacher_id,'')` in class section list/find queries.
- In PostgreSQL, `homeroom_teacher_id` is a UUID column, so `COALESCE(uuid_col, '')` fails with `invalid input syntax for type uuid: ""`.
- This was PostgreSQL-specific and not caught by the current SQLite-backed handler tests.

Fix:

- Removed the empty-string `COALESCE` from class section list/find queries.
- Scans `cs.homeroom_teacher_id` into `sql.NullString`, then maps it to empty string only in Go response DTO when non-null.
- Rebuilt/recreated the Docker backend so runtime uses the new binary.

Validation:

- Direct PostgreSQL reproduction before fix: `SELECT cs.id, COALESCE(cs.homeroom_teacher_id,'') FROM class_sections cs LIMIT 1;` failed with `invalid input syntax for type uuid: ""`.
- `gofmt -w internal/app/class_sections.go` — PASS.
- `go test ./internal/app -run TestClassSection` from `backend/` — PASS.
- `go test ./internal/app` from `backend/` — PASS.
- `go test ./...` from `backend/` — PASS.
- `docker compose up -d --build backend` — PASS; backend restarted and `/readyz` returns ready.

Note:

- A curl login/runtime smoke command that would create a temporary cookie jar was blocked by command approval, so browser/user-side refresh should verify `/app/class-sections` no longer shows `class_sections_lookup_failed`.
- If the page still shows the old error, hard refresh or log in again to avoid stale browser state.

## 2026-05-12 field-level validation error UX polish

User reported that validation errors should not appear as duplicate/global drawer messages; they should render per field.

Root cause:

- Shared `mapApiErrorToFormState` preserved `message` even when validation fields were available/inferred, so callers could show the same validation failure globally and per field.
- Tenant create/edit/admin drawers rendered their `error` block unconditionally even when `fieldErrors` existed.
- Academic Setup and Class Sections drawers also had global `mutationError` banners without suppressing them when `mutationFieldErrors` existed.

Changed:

- `frontend/src/lib/api-client.ts`
  - `FormErrorState.message` is now `string | null`.
  - `mapApiErrorToFormState` returns `message: null` whenever concrete or inferred field errors exist, preserving global messages only for non-field errors.
- `frontend/src/lib/api-client.test.ts`
  - Updated validation mapping tests to enforce field-only validation state.
- `frontend/src/app/(app)/app/tenants/tenant-form-drawer.tsx`
  - Suppresses drawer-level global error when field errors are present.
- `frontend/src/app/(app)/app/tenants/tenant-admin-drawer.tsx`
  - Suppresses drawer-level global error when field errors are present.
- `frontend/src/app/(app)/app/academic-setup/academic-setup-page.tsx`
  - Suppresses global mutation banner when `mutationFieldErrors` has entries.
- `frontend/src/app/(app)/app/class-sections/class-sections-page.tsx`
  - Suppresses global mutation banner when `mutationFieldErrors` has entries.
- `frontend/src/app/(app)/app/tenants/validation-errors.source.test.ts`
  - Added source-contract coverage that tenant, academic setup, and class-section forms keep validation errors field-scoped.
- `frontend/src/app/(app)/app/academic-setup/page.tsx`, `frontend/src/app/(app)/app/class-sections/page.tsx`, `frontend/src/app/(app)/app/tenants/page.tsx`
  - Toast descriptions now pass `undefined` when validation messages are intentionally field-only.

Validation:

- `npm test -- --run src/lib/api-client.test.ts` from `frontend/` — RED first, failed on expected `message: null` assertions before implementation.
- `npm test -- --run src/lib/api-client.test.ts` from `frontend/` — PASS after implementation.
- `npm test -- --run src/lib/api-client.test.ts 'src/app/(app)/app/tenants/validation-errors.source.test.ts'` from `frontend/` — PASS, 2 files / 7 tests.
- `npx tsc --noEmit` from `frontend/` — PASS.
- `npm test -- --run` from `frontend/` — PASS, 20 files / 88 tests.

Current verified next task:

- Continue ISSUE-039 Class Sections runtime/browser smoke if not yet completed after this UX polish, especially validating duplicate/required field failures in the drawer now appear inline and not as global banners.
- After smoke, update the issue ledger/runtime evidence for ISSUE-039 or move to the next Academic Structure slice depending on docs/code status.

## 2026-05-12 academic/class-section inline validation follow-up

User reported validation error messages were still not appearing in the expected field positions across Academic Setup / terms setup / related forms.

Root cause:

- Academic Years/Terms and Class Sections backend slices currently return legacy `validation_failed` payloads with only a global message, not a structured `fields` object.
- Shared frontend inference in `mapApiErrorToFormState` only understood Users/Tenants field names, so Academic Setup / Terms / Class Sections still saw global validation text unless the backend happened to return structured fields.
- Academic Setup status select also did not pass its field error into `SelectField`.

Changed:

- `frontend/src/lib/api-client.ts`
  - Expanded legacy validation inference for academic/class-section fields:
    - `academicYearId`
    - `code` / school year / semester
    - `startsOn`
    - `endsOn`
    - `gradeLevel`
    - `status`
    - `name`
  - Added word-boundary matching so `code` is not accidentally inferred from `roleCodes` and `name` is not accidentally inferred from `displayName`.
- `frontend/src/lib/api-client.test.ts`
  - Added regression coverage for Academic Setup and Class Sections legacy validation messages mapping to field-only form state.
- `frontend/src/app/(app)/app/academic-setup/academic-setup-page.tsx`
  - Wired `status` validation error into the Status `SelectField` so status errors appear under the field.
- `frontend/src/app/(app)/app/tenants/validation-errors.source.test.ts`
  - Extended source contract to assert Academic Setup status errors are field-scoped.

Validation:

- `npm test -- --run src/lib/api-client.test.ts` from `frontend/` — RED first, failed because Academic/Class Section legacy messages stayed global.
- `npm test -- --run src/lib/api-client.test.ts` from `frontend/` — PASS after mapping fix.
- `npm test -- --run src/lib/api-client.test.ts 'src/app/(app)/app/tenants/validation-errors.source.test.ts' && npx tsc --noEmit` from `frontend/` — PASS.
- `npm test -- --run` from `frontend/` — PASS, 20 files / 89 tests.

Current verified next task:

- Browser smoke Academic Setup and Class Sections forms with intentionally invalid required/date/status payloads to confirm inline placement visually in the drawer.
- Better long-term follow-up: make backend validation responses return structured `fields` for every module instead of relying on frontend legacy-message inference.
