package app

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestClassSectionsRequiresAuthenticatedSessionBeforeDatabaseAccess(t *testing.T) {
	a := New(Config{}, Dependencies{})
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/class-sections", nil)

	a.Handler().ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized || !strings.Contains(rec.Body.String(), `"code":"unauthenticated"`) {
		t.Fatalf("expected class sections to require auth before DB access, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestClassSectionsRequiresAcademicReadPermission(t *testing.T) {
	a := New(Config{}, Dependencies{})
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/class-sections", nil)
	req = req.WithContext(WithSubject(req.Context(), Subject{UserID: "u1", TenantID: "t1", Permissions: []string{"users:read"}}))

	a.classSectionsCollection(rec, req)

	if rec.Code != http.StatusForbidden || !strings.Contains(rec.Body.String(), `"code":"forbidden"`) {
		t.Fatalf("expected academic:read RBAC denial, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestListClassSectionsReturnsOnlyEffectiveTenantWithAcademicYearAndHomeroom(t *testing.T) {
	db := openAcademicTestDB(t)
	seedAcademicFixture(t, db)
	seedClassSectionFixture(t, db)
	a := New(Config{}, Dependencies{DB: db})
	rec := httptest.NewRecorder()
	req := classSectionRequest(http.MethodGet, "/api/v1/class-sections", "", []string{"academic:read"})

	a.listClassSections(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d body=%s", rec.Code, rec.Body.String())
	}
	var payload struct {
		Data struct {
			ClassSections []struct {
				ID           string `json:"id"`
				TenantID     string `json:"tenantId"`
				Code         string `json:"code"`
				GradeLevel   string `json:"gradeLevel"`
				AcademicYear struct {
					ID   string `json:"id"`
					Code string `json:"code"`
				} `json:"academicYear"`
				HomeroomTeacher *struct {
					ID   string `json:"id"`
					Name string `json:"name"`
				} `json:"homeroomTeacher"`
			} `json:"classSections"`
		} `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v body=%s", err, rec.Body.String())
	}
	if len(payload.Data.ClassSections) != 1 {
		t.Fatalf("expected one tenant class section, got %d: %#v", len(payload.Data.ClassSections), payload.Data.ClassSections)
	}
	section := payload.Data.ClassSections[0]
	if section.ID != "class-tenant-101-7a" || section.TenantID != "00000000-0000-7000-8000-000000000101" || section.Code != "VII-A" || section.GradeLevel != "7" {
		t.Fatalf("unexpected class section: %#v", section)
	}
	if section.AcademicYear.ID != "ay-tenant-101-active" || section.AcademicYear.Code != "2026-2027" {
		t.Fatalf("expected academic year summary, got %#v", section.AcademicYear)
	}
	if section.HomeroomTeacher == nil || section.HomeroomTeacher.ID != "teacher-tenant-101" || section.HomeroomTeacher.Name != "Bu Guru Tenant" {
		t.Fatalf("expected homeroom teacher summary, got %#v", section.HomeroomTeacher)
	}
}

func TestCreateClassSectionValidatesRelationshipsAndAudits(t *testing.T) {
	db := openAcademicTestDB(t)
	seedAcademicFixture(t, db)
	seedClassSectionFixture(t, db)
	a := New(Config{}, Dependencies{DB: db})
	rec := httptest.NewRecorder()
	body := `{"academicYearId":"ay-tenant-101-active","code":"VIII-B","name":"Kelas 8B","gradeLevel":"8","homeroomTeacherId":"teacher-tenant-101","status":"active"}`
	req := classSectionRequest(http.MethodPost, "/api/v1/class-sections", body, []string{"academic:write"})
	setValidAcademicTestCSRF(req)
	req = req.WithContext(context.WithValue(req.Context(), requestIDKey, "req-create-class-section"))

	a.createClassSection(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d body=%s", rec.Code, rec.Body.String())
	}
	var count int
	if err := db.QueryRow(`SELECT COUNT(*) FROM class_sections WHERE tenant_id='00000000-0000-7000-8000-000000000101' AND academic_year_id='ay-tenant-101-active' AND code='VIII-B' AND homeroom_teacher_id='teacher-tenant-101'`).Scan(&count); err != nil {
		t.Fatalf("class section lookup failed: %v", err)
	}
	if count != 1 {
		t.Fatalf("expected created class section, got count=%d", count)
	}
	assertAcademicAuditCount(t, db, "class_sections.create", 1)
}

func TestCreateClassSectionRejectsCrossTenantHomeroomTeacher(t *testing.T) {
	db := openAcademicTestDB(t)
	seedAcademicFixture(t, db)
	seedClassSectionFixture(t, db)
	a := New(Config{}, Dependencies{DB: db})
	rec := httptest.NewRecorder()
	body := `{"academicYearId":"ay-tenant-101-active","code":"IX-C","name":"Kelas 9C","gradeLevel":"9","homeroomTeacherId":"teacher-other-tenant","status":"active"}`
	req := classSectionRequest(http.MethodPost, "/api/v1/class-sections", body, []string{"academic:write"})
	setValidAcademicTestCSRF(req)

	a.createClassSection(rec, req)

	if rec.Code != http.StatusNotFound || !strings.Contains(rec.Body.String(), `"code":"homeroom_teacher_not_found"`) {
		t.Fatalf("expected cross-tenant homeroom teacher rejection, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestUpdateClassSectionEditsMutableFieldsAndAudits(t *testing.T) {
	db := openAcademicTestDB(t)
	seedAcademicFixture(t, db)
	seedClassSectionFixture(t, db)
	a := New(Config{}, Dependencies{DB: db})
	rec := httptest.NewRecorder()
	body := `{"academicYearId":"ay-tenant-101-active","code":"VII-A1","name":"Kelas 7A Prime","gradeLevel":"7","homeroomTeacherId":"","status":"inactive"}`
	req := classSectionRequest(http.MethodPatch, "/api/v1/class-sections/class-tenant-101-7a", body, []string{"academic:write"})
	setValidAcademicTestCSRF(req)
	req.SetPathValue("id", "class-tenant-101-7a")
	req = req.WithContext(context.WithValue(req.Context(), requestIDKey, "req-update-class-section"))

	a.updateClassSection(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d body=%s", rec.Code, rec.Body.String())
	}
	var code, name, status string
	var teacher sql.NullString
	if err := db.QueryRow(`SELECT code, name, status, homeroom_teacher_id FROM class_sections WHERE id='class-tenant-101-7a'`).Scan(&code, &name, &status, &teacher); err != nil {
		t.Fatalf("updated section lookup failed: %v", err)
	}
	if code != "VII-A1" || name != "Kelas 7A Prime" || status != "inactive" || teacher.Valid {
		t.Fatalf("unexpected updated values code=%q name=%q status=%q teacher=%#v", code, name, status, teacher)
	}
	assertAcademicAuditCount(t, db, "class_sections.update", 1)
}

func TestArchiveClassSectionSoftArchivesCurrentTenantOnlyAndAudits(t *testing.T) {
	db := openAcademicTestDB(t)
	seedAcademicFixture(t, db)
	seedClassSectionFixture(t, db)
	a := New(Config{}, Dependencies{DB: db})
	rec := httptest.NewRecorder()
	req := classSectionRequest(http.MethodPatch, "/api/v1/class-sections/class-tenant-101-7a/archive", "", []string{"academic:write"})
	setValidAcademicTestCSRF(req)
	req.SetPathValue("id", "class-tenant-101-7a")
	req = req.WithContext(context.WithValue(req.Context(), requestIDKey, "req-archive-class-section"))

	a.archiveClassSection(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d body=%s", rec.Code, rec.Body.String())
	}
	var tenantStatus, otherStatus string
	if err := db.QueryRow(`SELECT status FROM class_sections WHERE id='class-tenant-101-7a'`).Scan(&tenantStatus); err != nil {
		t.Fatalf("tenant section lookup failed: %v", err)
	}
	if err := db.QueryRow(`SELECT status FROM class_sections WHERE id='class-other-tenant-7a'`).Scan(&otherStatus); err != nil {
		t.Fatalf("other section lookup failed: %v", err)
	}
	if tenantStatus != "archived" || otherStatus != "active" {
		t.Fatalf("expected tenant section archived and other tenant unchanged, got tenant=%q other=%q", tenantStatus, otherStatus)
	}
	assertAcademicAuditCount(t, db, "class_sections.archive", 1)
}

func classSectionRequest(method, target, body string, permissions []string) *http.Request {
	var reader *strings.Reader
	reader = strings.NewReader(body)
	req := httptest.NewRequest(method, target, reader)
	if body != "" {
		req.Header.Set("Content-Type", "application/json")
	}
	return req.WithContext(WithSubject(req.Context(), Subject{
		UserID:            "10000000-0000-7000-8000-000000000001",
		TenantID:          "00000000-0000-7000-8000-000000000101",
		EffectiveTenantID: "00000000-0000-7000-8000-000000000101",
		Permissions:       permissions,
	}))
}

func seedClassSectionFixture(t *testing.T, db *sql.DB) {
	t.Helper()
	_, err := db.Exec(`
		INSERT INTO teachers (id, tenant_id, user_id, employee_number, display_name, status) VALUES
			('teacher-tenant-101', '00000000-0000-7000-8000-000000000101', NULL, 'T-101', 'Bu Guru Tenant', 'active'),
			('teacher-other-tenant', '00000000-0000-7000-8000-000000000202', NULL, 'T-202', 'Pak Guru Other', 'active');
		INSERT INTO class_sections (id, tenant_id, academic_year_id, code, name, grade_level, homeroom_teacher_id, status) VALUES
			('class-tenant-101-7a', '00000000-0000-7000-8000-000000000101', 'ay-tenant-101-active', 'VII-A', 'Kelas 7A', '7', 'teacher-tenant-101', 'active'),
			('class-other-tenant-7a', '00000000-0000-7000-8000-000000000202', 'ay-other-tenant', 'VII-A', 'Other 7A', '7', 'teacher-other-tenant', 'active');
	`)
	if err != nil {
		t.Fatalf("seed class section fixture: %v", err)
	}
}
