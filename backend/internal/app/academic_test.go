package app

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	_ "modernc.org/sqlite"
)

func TestAcademicYearsRequiresAuthenticatedSessionBeforeDatabaseAccess(t *testing.T) {
	a := New(Config{}, Dependencies{})
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/academic-years", nil)

	a.Handler().ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized || !strings.Contains(rec.Body.String(), `"code":"unauthenticated"`) {
		t.Fatalf("expected academic years to require auth before DB access, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestAcademicYearsRequiresAcademicReadPermission(t *testing.T) {
	a := New(Config{}, Dependencies{})
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/academic-years", nil)
	req = req.WithContext(WithSubject(req.Context(), Subject{UserID: "u1", TenantID: "t1", Permissions: []string{"users:read"}}))

	a.requireAnyPermission("academic:read", "platform:admin")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("handler must not run without academic:read")
	})).ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden || !strings.Contains(rec.Body.String(), `"code":"forbidden"`) {
		t.Fatalf("expected academic:read RBAC denial, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestListAcademicYearsReturnsOnlyEffectiveTenantWithNestedTerms(t *testing.T) {
	db := openAcademicTestDB(t)
	seedAcademicFixture(t, db)
	a := New(Config{}, Dependencies{DB: db})
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/academic-years", nil)
	req = req.WithContext(WithSubject(req.Context(), Subject{
		UserID:            "10000000-0000-7000-8000-000000000001",
		TenantID:          "00000000-0000-7000-8000-000000000101",
		EffectiveTenantID: "00000000-0000-7000-8000-000000000101",
		Permissions:       []string{"academic:read"},
	}))

	a.listAcademicYears(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d body=%s", rec.Code, rec.Body.String())
	}
	var payload struct {
		Data struct {
			AcademicYears []struct {
				ID       string `json:"id"`
				TenantID string `json:"tenantId"`
				Code     string `json:"code"`
				Status   string `json:"status"`
				Terms    []struct {
					ID     string `json:"id"`
					Code   string `json:"code"`
					Status string `json:"status"`
				} `json:"terms"`
			} `json:"academicYears"`
		} `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode academic years response: %v body=%s", err, rec.Body.String())
	}
	if len(payload.Data.AcademicYears) != 1 {
		t.Fatalf("expected one tenant academic year, got %d: %#v", len(payload.Data.AcademicYears), payload.Data.AcademicYears)
	}
	year := payload.Data.AcademicYears[0]
	if year.ID != "ay-tenant-101-active" || year.TenantID != "00000000-0000-7000-8000-000000000101" || year.Code != "2026-2027" || year.Status != "active" {
		t.Fatalf("unexpected academic year: %#v", year)
	}
	if len(year.Terms) != 2 || year.Terms[0].Code != "ganjil" || year.Terms[0].Status != "active" || year.Terms[1].Code != "genap" {
		t.Fatalf("expected nested tenant terms ordered by start date/code, got %#v", year.Terms)
	}
	for _, year := range payload.Data.AcademicYears {
		if year.ID == "ay-other-tenant" {
			t.Fatalf("list leaked academic year from another tenant: %#v", year)
		}
	}
}

func TestCreateAcademicYearValidatesDatesEnforcesSingleActiveAndAudits(t *testing.T) {
	db := openAcademicTestDB(t)
	seedAcademicFixture(t, db)
	a := New(Config{}, Dependencies{DB: db})
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/academic-years", strings.NewReader(`{"code":"2027-2028","startsOn":"2027-07-01","endsOn":"2028-06-30","status":"active"}`))
	req.Header.Set("Content-Type", "application/json")
	setValidAcademicTestCSRF(req)
	ctx := WithSubject(req.Context(), Subject{
		UserID:            "10000000-0000-7000-8000-000000000001",
		TenantID:          "00000000-0000-7000-8000-000000000101",
		EffectiveTenantID: "00000000-0000-7000-8000-000000000101",
		Permissions:       []string{"academic:write"},
	})
	ctx = context.WithValue(ctx, requestIDKey, "req-create-academic-year")
	req = req.WithContext(ctx)

	a.createAcademicYear(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d body=%s", rec.Code, rec.Body.String())
	}
	var oldStatus, newStatus string
	if err := db.QueryRow(`SELECT status FROM academic_years WHERE id='ay-tenant-101-active'`).Scan(&oldStatus); err != nil {
		t.Fatalf("old academic year lookup failed: %v", err)
	}
	if err := db.QueryRow(`SELECT status FROM academic_years WHERE tenant_id='00000000-0000-7000-8000-000000000101' AND code='2027-2028'`).Scan(&newStatus); err != nil {
		t.Fatalf("new academic year lookup failed: %v", err)
	}
	if oldStatus != "closed" || newStatus != "active" {
		t.Fatalf("expected single active academic year with old closed/new active, got old=%q new=%q", oldStatus, newStatus)
	}
	var autoTermCount, autoTermDates int
	if err := db.QueryRow(`SELECT COUNT(*), COUNT(starts_on) + COUNT(ends_on) FROM terms WHERE tenant_id='00000000-0000-7000-8000-000000000101' AND academic_year_id=(SELECT id FROM academic_years WHERE tenant_id='00000000-0000-7000-8000-000000000101' AND code='2027-2028') AND code IN ('ganjil','genap')`).Scan(&autoTermCount, &autoTermDates); err != nil {
		t.Fatalf("auto semester lookup failed: %v", err)
	}
	if autoTermCount != 2 || autoTermDates != 4 {
		t.Fatalf("expected auto-created ganjil/genap semesters with predefined editable dates, got count=%d dateValues=%d", autoTermCount, autoTermDates)
	}
	assertAcademicAuditCount(t, db, "academic_years.create", 1)
}

func TestNextAcademicYearCodePreservesShortYearFormat(t *testing.T) {
	if got := nextAcademicYearCode("2026-27"); got != "2027-28" {
		t.Fatalf("expected short academic year format to be preserved, got %q", got)
	}
	if got := nextAcademicYearCode("2026-2027"); got != "2027-2028" {
		t.Fatalf("expected long academic year format to be preserved, got %q", got)
	}
}

func TestCreateAcademicYearReusesArchivedYearCodeWithFreshDefaultSemesters(t *testing.T) {
	db := openAcademicTestDB(t)
	seedAcademicFixture(t, db)
	if _, err := db.Exec(`UPDATE academic_years SET status='archived' WHERE id='ay-tenant-101-active'; UPDATE terms SET status='archived' WHERE academic_year_id='ay-tenant-101-active'`); err != nil {
		t.Fatalf("archive fixture year: %v", err)
	}
	a := New(Config{}, Dependencies{DB: db})
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/academic-years", strings.NewReader(`{"code":"2026-2027","name":"2026-2027","startsOn":"2026-06-01","endsOn":"2027-05-31","status":"draft"}`))
	req.Header.Set("Content-Type", "application/json")
	setValidAcademicTestCSRF(req)
	ctx := WithSubject(req.Context(), Subject{
		UserID:            "10000000-0000-7000-8000-000000000001",
		TenantID:          "00000000-0000-7000-8000-000000000101",
		EffectiveTenantID: "00000000-0000-7000-8000-000000000101",
		Permissions:       []string{"academic:write"},
	})
	ctx = context.WithValue(ctx, requestIDKey, "req-recreate-archived-year")
	req = req.WithContext(ctx)

	a.createAcademicYear(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected archived code reuse to create successfully, got %d body=%s", rec.Code, rec.Body.String())
	}
	var status, startsOn, endsOn string
	if err := db.QueryRow(`SELECT status, starts_on, ends_on FROM academic_years WHERE id='ay-tenant-101-active'`).Scan(&status, &startsOn, &endsOn); err != nil {
		t.Fatalf("reused year lookup failed: %v", err)
	}
	if status != "draft" || startsOn != "2026-06-01" || endsOn != "2027-05-31" {
		t.Fatalf("expected archived year to be restored with new dates, got status=%q starts=%q ends=%q", status, startsOn, endsOn)
	}
	var activeTermCount int
	if err := db.QueryRow(`SELECT COUNT(*) FROM terms WHERE academic_year_id='ay-tenant-101-active' AND status <> 'archived' AND code IN ('ganjil','genap')`).Scan(&activeTermCount); err != nil {
		t.Fatalf("restored default semester lookup failed: %v", err)
	}
	if activeTermCount != 2 {
		t.Fatalf("expected restored year to get fresh default semesters, got %d", activeTermCount)
	}
}

func TestAcademicYearPatchRouteIsRegisteredOnMainHandler(t *testing.T) {
	db := openAcademicTestDB(t)
	seedAcademicFixture(t, db)
	a := New(Config{}, Dependencies{DB: db})
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPatch, "/api/v1/academic-years/ay-tenant-101-active", strings.NewReader(`{"code":"2026-2028","startsOn":"2026-07-15","endsOn":"2028-06-15","status":"draft"}`))
	req.Header.Set("Content-Type", "application/json")
	setValidAcademicTestCSRF(req)
	ctx := WithSubject(req.Context(), Subject{
		UserID:            "10000000-0000-7000-8000-000000000001",
		TenantID:          "00000000-0000-7000-8000-000000000101",
		EffectiveTenantID: "00000000-0000-7000-8000-000000000101",
		Permissions:       []string{"academic:write"},
	})
	req = req.WithContext(ctx)

	a.Handler().ServeHTTP(rec, req)

	if rec.Code == http.StatusNotFound || strings.Contains(rec.Body.String(), "404 page not found") {
		t.Fatalf("expected main handler to route academic year PATCH, got %d body=%s", rec.Code, rec.Body.String())
	}
	if rec.Code != http.StatusUnauthorized || !strings.Contains(rec.Body.String(), `"code":"unauthenticated"`) {
		t.Fatalf("expected registered academic year PATCH route to reach auth middleware, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestUpdateAcademicYearEditsSingleSchoolYearDatesStatusAndAudits(t *testing.T) {
	db := openAcademicTestDB(t)
	seedAcademicFixture(t, db)
	a := New(Config{}, Dependencies{DB: db})
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPatch, "/api/v1/academic-years/ay-tenant-101-active", strings.NewReader(`{"code":"2026-2028","startsOn":"2026-07-15","endsOn":"2028-06-15","status":"draft"}`))
	req.Header.Set("Content-Type", "application/json")
	setValidAcademicTestCSRF(req)
	ctx := WithSubject(req.Context(), Subject{
		UserID:            "10000000-0000-7000-8000-000000000001",
		TenantID:          "00000000-0000-7000-8000-000000000101",
		EffectiveTenantID: "00000000-0000-7000-8000-000000000101",
		Permissions:       []string{"academic:write"},
	})
	ctx = context.WithValue(ctx, requestIDKey, "req-update-academic-year")
	req = req.WithContext(ctx)

	a.updateAcademicYear(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d body=%s", rec.Code, rec.Body.String())
	}
	var code, name, startsOn, endsOn, status string
	if err := db.QueryRow(`SELECT code, name, starts_on, ends_on, status FROM academic_years WHERE id='ay-tenant-101-active'`).Scan(&code, &name, &startsOn, &endsOn, &status); err != nil {
		t.Fatalf("updated academic year lookup failed: %v", err)
	}
	if code != "2026-2028" || name != "2026-2028" || startsOn != "2026-07-15" || endsOn != "2028-06-15" || status != "draft" {
		t.Fatalf("unexpected updated academic year values: code=%q name=%q starts=%q ends=%q status=%q", code, name, startsOn, endsOn, status)
	}
	assertAcademicAuditCount(t, db, "academic_years.update", 1)
}

func TestCreateTermValidatesParentTenantDateRangeEnforcesSingleActiveAndAudits(t *testing.T) {
	db := openAcademicTestDB(t)
	seedAcademicFixture(t, db)
	a := New(Config{}, Dependencies{DB: db})
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/terms", strings.NewReader(`{"academicYearId":"ay-tenant-101-active","code":"Semester Pendek","startsOn":"2027-05-01","endsOn":"2027-06-15","status":"active"}`))
	req.Header.Set("Content-Type", "application/json")
	setValidAcademicTestCSRF(req)
	ctx := WithSubject(req.Context(), Subject{
		UserID:            "10000000-0000-7000-8000-000000000001",
		TenantID:          "00000000-0000-7000-8000-000000000101",
		EffectiveTenantID: "00000000-0000-7000-8000-000000000101",
		Permissions:       []string{"academic:write"},
	})
	ctx = context.WithValue(ctx, requestIDKey, "req-create-term")
	req = req.WithContext(ctx)

	a.createTerm(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d body=%s", rec.Code, rec.Body.String())
	}
	var oldStatus, newStatus string
	if err := db.QueryRow(`SELECT status FROM terms WHERE id='term-tenant-101-ganjil'`).Scan(&oldStatus); err != nil {
		t.Fatalf("old term lookup failed: %v", err)
	}
	var newName string
	if err := db.QueryRow(`SELECT status, name FROM terms WHERE tenant_id='00000000-0000-7000-8000-000000000101' AND code='Semester Pendek'`).Scan(&newStatus, &newName); err != nil {
		t.Fatalf("new term lookup failed: %v", err)
	}
	if newName != "Semester Pendek" {
		t.Fatalf("expected single semester field to mirror code into name, got %q", newName)
	}
	if oldStatus != "closed" || newStatus != "active" {
		t.Fatalf("expected single active term with old closed/new active, got old=%q new=%q", oldStatus, newStatus)
	}
	assertAcademicAuditCount(t, db, "terms.create", 1)
}

func TestUpdateTermEditsSingleSemesterDatesStatusAndAudits(t *testing.T) {
	db := openAcademicTestDB(t)
	seedAcademicFixture(t, db)
	a := New(Config{}, Dependencies{DB: db})
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPatch, "/api/v1/terms/term-tenant-101-genap", strings.NewReader(`{"code":"Semester Genap Revisi","startsOn":"2027-01-10","endsOn":"2027-06-20","status":"active"}`))
	req.Header.Set("Content-Type", "application/json")
	setValidAcademicTestCSRF(req)
	ctx := WithSubject(req.Context(), Subject{
		UserID:            "10000000-0000-7000-8000-000000000001",
		TenantID:          "00000000-0000-7000-8000-000000000101",
		EffectiveTenantID: "00000000-0000-7000-8000-000000000101",
		Permissions:       []string{"academic:write"},
	})
	ctx = context.WithValue(ctx, requestIDKey, "req-update-term")
	req = req.WithContext(ctx)

	a.updateTerm(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d body=%s", rec.Code, rec.Body.String())
	}
	var code, name, startsOn, endsOn, status string
	if err := db.QueryRow(`SELECT code, name, starts_on, ends_on, status FROM terms WHERE id='term-tenant-101-genap'`).Scan(&code, &name, &startsOn, &endsOn, &status); err != nil {
		t.Fatalf("updated term lookup failed: %v", err)
	}
	if code != "Semester Genap Revisi" || name != "Semester Genap Revisi" || startsOn != "2027-01-10" || endsOn != "2027-06-20" || status != "active" {
		t.Fatalf("unexpected updated term values: code=%q name=%q starts=%q ends=%q status=%q", code, name, startsOn, endsOn, status)
	}
	var oldStatus string
	if err := db.QueryRow(`SELECT status FROM terms WHERE id='term-tenant-101-ganjil'`).Scan(&oldStatus); err != nil {
		t.Fatalf("old active term lookup failed: %v", err)
	}
	if oldStatus != "closed" {
		t.Fatalf("expected activating edited term to close prior active semester, got %q", oldStatus)
	}
	assertAcademicAuditCount(t, db, "terms.update", 1)
}

func TestDuplicateAcademicYearSkipsExistingNextYearCode(t *testing.T) {
	db := openAcademicTestDB(t)
	seedAcademicFixture(t, db)
	if _, err := db.Exec(`INSERT INTO academic_years(id, tenant_id, code, name, starts_on, ends_on, status) VALUES ('ay-tenant-101-next', '00000000-0000-7000-8000-000000000101', '2027-2028', '2027-2028', '2027-07-01', '2028-06-30', 'draft')`); err != nil {
		t.Fatalf("seed existing next academic year: %v", err)
	}
	a := New(Config{}, Dependencies{DB: db})
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/academic-years/ay-tenant-101-active/duplicate", nil)
	setValidAcademicTestCSRF(req)
	ctx := WithSubject(req.Context(), Subject{
		UserID:            "10000000-0000-7000-8000-000000000001",
		TenantID:          "00000000-0000-7000-8000-000000000101",
		EffectiveTenantID: "00000000-0000-7000-8000-000000000101",
		Permissions:       []string{"academic:write"},
	})
	ctx = context.WithValue(ctx, requestIDKey, "req-duplicate-existing-next-year")
	req = req.WithContext(ctx)

	a.duplicateAcademicYear(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected duplicate to skip existing next year code, got %d body=%s", rec.Code, rec.Body.String())
	}
	var payload struct {
		Data struct {
			AcademicYear struct {
				Code string `json:"code"`
			} `json:"academicYear"`
		} `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode duplicate response: %v body=%s", err, rec.Body.String())
	}
	if payload.Data.AcademicYear.Code != "2028-2029" {
		t.Fatalf("expected duplicate to advance to first available code, got %q", payload.Data.AcademicYear.Code)
	}
}

func TestDuplicateAcademicYearCreatesNextYearWithAdjustedTermsAndAudits(t *testing.T) {
	db := openAcademicTestDB(t)
	seedAcademicFixture(t, db)
	a := New(Config{}, Dependencies{DB: db})
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/academic-years/ay-tenant-101-active/duplicate", nil)
	setValidAcademicTestCSRF(req)
	ctx := WithSubject(req.Context(), Subject{
		UserID:            "10000000-0000-7000-8000-000000000001",
		TenantID:          "00000000-0000-7000-8000-000000000101",
		EffectiveTenantID: "00000000-0000-7000-8000-000000000101",
		Permissions:       []string{"academic:write"},
	})
	ctx = context.WithValue(ctx, requestIDKey, "req-duplicate-year")
	req = req.WithContext(ctx)

	a.duplicateAcademicYear(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d body=%s", rec.Code, rec.Body.String())
	}
	var payload struct {
		Data struct {
			AcademicYear struct {
				ID       string `json:"id"`
				Code     string `json:"code"`
				StartsOn string `json:"startsOn"`
				EndsOn   string `json:"endsOn"`
				Terms    []struct {
					Code     string `json:"code"`
					Name     string `json:"name"`
					StartsOn string `json:"startsOn"`
					EndsOn   string `json:"endsOn"`
				} `json:"terms"`
			} `json:"academicYear"`
		} `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode duplicate response: %v body=%s", err, rec.Body.String())
	}
	year := payload.Data.AcademicYear
	if year.Code != "2027-2028" || year.StartsOn != "2027-07-01" || year.EndsOn != "2028-06-30" {
		t.Fatalf("expected duplicated year shifted one year, got %#v", year)
	}
	if len(year.Terms) != 2 {
		t.Fatalf("expected duplicated terms, got %#v", year.Terms)
	}
	if year.Terms[0].Code != "ganjil" || year.Terms[0].Name != "Semester Ganjil" || year.Terms[0].StartsOn != "2027-07-01" || year.Terms[0].EndsOn != "2027-12-20" {
		t.Fatalf("expected adjusted copied ganjil term, got %#v", year.Terms[0])
	}
	if year.Terms[1].Code != "genap" || year.Terms[1].Name != "Semester Genap" || year.Terms[1].StartsOn != "2028-01-05" || year.Terms[1].EndsOn != "2028-06-30" {
		t.Fatalf("expected adjusted copied genap term, got %#v", year.Terms[1])
	}
	assertAcademicAuditCount(t, db, "academic_years.duplicate", 1)
}

func TestArchiveAcademicYearCascadesTermsAndAudits(t *testing.T) {
	db := openAcademicTestDB(t)
	seedAcademicFixture(t, db)
	a := New(Config{}, Dependencies{DB: db})
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPatch, "/api/v1/academic-years/ay-tenant-101-active/archive", nil)
	setValidAcademicTestCSRF(req)
	ctx := WithSubject(req.Context(), Subject{
		UserID:            "10000000-0000-7000-8000-000000000001",
		TenantID:          "00000000-0000-7000-8000-000000000101",
		EffectiveTenantID: "00000000-0000-7000-8000-000000000101",
		Permissions:       []string{"academic:write"},
	})
	ctx = context.WithValue(ctx, requestIDKey, "req-archive-year")
	req = req.WithContext(ctx)

	a.archiveAcademicYear(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d body=%s", rec.Code, rec.Body.String())
	}
	var yearStatus string
	if err := db.QueryRow(`SELECT status FROM academic_years WHERE id='ay-tenant-101-active'`).Scan(&yearStatus); err != nil {
		t.Fatalf("year lookup failed: %v", err)
	}
	if yearStatus != "archived" {
		t.Fatalf("expected archived year, got %q", yearStatus)
	}
	var activeTermCount int
	if err := db.QueryRow(`SELECT COUNT(*) FROM terms WHERE academic_year_id='ay-tenant-101-active' AND status <> 'archived'`).Scan(&activeTermCount); err != nil {
		t.Fatalf("term count lookup failed: %v", err)
	}
	if activeTermCount != 0 {
		t.Fatalf("expected archive to cascade all terms, got %d non-archived terms", activeTermCount)
	}
	assertAcademicAuditCount(t, db, "academic_years.archive", 1)
}

func setValidAcademicTestCSRF(req *http.Request) {
	req.AddCookie(&http.Cookie{Name: csrfCookieName, Value: "csrf-test"})
	req.Header.Set("X-CSRF-Token", "csrf-test")
}

func assertAcademicAuditCount(t *testing.T, db *sql.DB, action string, expected int) {
	t.Helper()
	var count int
	if err := db.QueryRow(`SELECT COUNT(*) FROM audit_events WHERE tenant_id='00000000-0000-7000-8000-000000000101' AND action=?`, action).Scan(&count); err != nil {
		t.Fatalf("audit lookup failed for %s: %v", action, err)
	}
	if count != expected {
		t.Fatalf("expected %d %s audit events, got %d", expected, action, count)
	}
}

func openAcademicTestDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	_, err = db.Exec(`
		CREATE TABLE tenants (id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active', created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
		CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
		CREATE TABLE teachers (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, user_id TEXT, employee_number TEXT NOT NULL, display_name TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active', created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, UNIQUE (tenant_id, id));
		CREATE TABLE academic_years (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-7000-8000-' || lower(hex(randomblob(6)))), tenant_id TEXT NOT NULL, code TEXT NOT NULL, name TEXT NOT NULL, starts_on TEXT NOT NULL, ends_on TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft', metadata TEXT NOT NULL DEFAULT '{}', created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, UNIQUE (tenant_id, code));
		CREATE TABLE terms (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-7000-8000-' || lower(hex(randomblob(6)))), tenant_id TEXT NOT NULL, academic_year_id TEXT NOT NULL, code TEXT NOT NULL, name TEXT NOT NULL, starts_on TEXT, ends_on TEXT, status TEXT NOT NULL DEFAULT 'draft', metadata TEXT NOT NULL DEFAULT '{}', created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, UNIQUE (tenant_id, academic_year_id, code));
		CREATE TABLE class_sections (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-7000-8000-' || lower(hex(randomblob(6)))), tenant_id TEXT NOT NULL, academic_year_id TEXT NOT NULL, code TEXT NOT NULL, name TEXT NOT NULL, grade_level TEXT NOT NULL, homeroom_teacher_id TEXT, status TEXT NOT NULL DEFAULT 'active', metadata TEXT NOT NULL DEFAULT '{}', created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, UNIQUE (tenant_id, academic_year_id, code), UNIQUE (tenant_id, academic_year_id, grade_level, name));
		CREATE TABLE audit_events (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-7000-8000-' || lower(hex(randomblob(6)))), tenant_id TEXT, actor_user_id TEXT, request_id TEXT NOT NULL DEFAULT '', action TEXT NOT NULL, resource_type TEXT NOT NULL, resource_id TEXT NOT NULL DEFAULT '', metadata TEXT NOT NULL DEFAULT '{}', created_at TEXT DEFAULT CURRENT_TIMESTAMP);
	`)
	if err != nil {
		t.Fatalf("create academic test schema: %v", err)
	}
	return db
}

func seedAcademicFixture(t *testing.T, db *sql.DB) {
	t.Helper()
	_, err := db.Exec(`
		INSERT INTO tenants (id, code, name, status) VALUES
			('00000000-0000-7000-8000-000000000101', 'tenant-101', 'Tenant 101', 'active'),
			('00000000-0000-7000-8000-000000000202', 'tenant-202', 'Tenant 202', 'active');
		INSERT INTO users (id, email, display_name, status) VALUES ('10000000-0000-7000-8000-000000000001', 'academic.admin@morfoschools.local', 'Academic Admin', 'active');
		INSERT INTO academic_years (id, tenant_id, code, name, starts_on, ends_on, status) VALUES
			('ay-tenant-101-active', '00000000-0000-7000-8000-000000000101', '2026-2027', 'TA 2026/2027', '2026-07-01', '2027-06-30', 'active'),
			('ay-other-tenant', '00000000-0000-7000-8000-000000000202', '2026-2027', 'Other Tenant Year', '2026-07-01', '2027-06-30', 'active');
		INSERT INTO terms (id, tenant_id, academic_year_id, code, name, starts_on, ends_on, status) VALUES
			('term-tenant-101-ganjil', '00000000-0000-7000-8000-000000000101', 'ay-tenant-101-active', 'ganjil', 'Semester Ganjil', '2026-07-01', '2026-12-20', 'active'),
			('term-tenant-101-genap', '00000000-0000-7000-8000-000000000101', 'ay-tenant-101-active', 'genap', 'Semester Genap', '2027-01-05', '2027-06-30', 'draft'),
			('term-other-tenant', '00000000-0000-7000-8000-000000000202', 'ay-other-tenant', 'ganjil', 'Other Ganjil', '2026-07-01', '2026-12-20', 'active');
	`)
	if err != nil {
		t.Fatalf("seed academic fixture: %v", err)
	}
}
