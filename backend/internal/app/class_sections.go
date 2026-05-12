package app

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
)

type classSectionRow struct {
	ID                string              `json:"id"`
	TenantID          string              `json:"tenantId"`
	AcademicYearID    string              `json:"academicYearId"`
	Code              string              `json:"code"`
	Name              string              `json:"name"`
	GradeLevel        string              `json:"gradeLevel"`
	HomeroomTeacherID string              `json:"homeroomTeacherId"`
	Status            string              `json:"status"`
	CreatedAt         string              `json:"createdAt"`
	UpdatedAt         string              `json:"updatedAt"`
	AcademicYear      academicYearSummary `json:"academicYear"`
	HomeroomTeacher   *teacherSummary     `json:"homeroomTeacher"`
}

type academicYearSummary struct {
	ID       string `json:"id"`
	Code     string `json:"code"`
	Name     string `json:"name"`
	StartsOn string `json:"startsOn"`
	EndsOn   string `json:"endsOn"`
	Status   string `json:"status"`
}

type teacherSummary struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type upsertClassSectionRequest struct {
	AcademicYearID    string `json:"academicYearId"`
	Code              string `json:"code"`
	Name              string `json:"name"`
	GradeLevel        string `json:"gradeLevel"`
	HomeroomTeacherID string `json:"homeroomTeacherId"`
	Status            string `json:"status"`
}

func (a *App) registerClassSectionRoutes(mux *http.ServeMux) {
	mux.Handle("/api/v1/class-sections", a.authenticated(http.HandlerFunc(a.classSectionsCollection)))
	mux.Handle("/api/v1/class-sections/", a.authenticated(http.HandlerFunc(a.classSectionItemFallback)))
}

func (a *App) classSectionsCollection(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		a.requireAnyPermission("academic:read", "platform:admin")(http.HandlerFunc(a.listClassSections)).ServeHTTP(w, r)
	case http.MethodPost:
		a.requireAnyPermission("academic:write", "platform:admin")(http.HandlerFunc(a.createClassSection)).ServeHTTP(w, r)
	default:
		writeJSON(w, http.StatusMethodNotAllowed, errPayload(r, "method_not_allowed", "Method not allowed"))
	}
}

func (a *App) classSectionItemFallback(w http.ResponseWriter, r *http.Request) {
	path := strings.Trim(strings.TrimPrefix(r.URL.Path, "/api/v1/class-sections/"), "/")
	parts := strings.Split(path, "/")
	if len(parts) == 1 && r.Method == http.MethodPatch {
		r.SetPathValue("id", parts[0])
		a.requireAnyPermission("academic:write", "platform:admin")(http.HandlerFunc(a.updateClassSection)).ServeHTTP(w, r)
		return
	}
	if len(parts) == 2 && parts[1] == "archive" && r.Method == http.MethodPatch {
		r.SetPathValue("id", parts[0])
		a.requireAnyPermission("academic:write", "platform:admin")(http.HandlerFunc(a.archiveClassSection)).ServeHTTP(w, r)
		return
	}
	writeJSON(w, http.StatusNotFound, errPayload(r, "not_found", "Class section route not found"))
}

func (a *App) listClassSections(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, errPayload(r, "method_not_allowed", "Method not allowed"))
		return
	}
	_, tenantID, ok := tenantContextFromRequest(r)
	if !ok {
		writeJSON(w, http.StatusUnauthorized, errPayload(r, "unauthenticated", "Authentication required"))
		return
	}
	if tenantID == "" {
		writeJSON(w, http.StatusBadRequest, errPayload(r, "tenant_context_required", "Tenant context is required"))
		return
	}
	rows, err := a.listTenantClassSections(r, tenantID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, errPayload(r, "class_sections_lookup_failed", "Could not load class sections"))
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": map[string]any{"classSections": rows}})
}

func (a *App) createClassSection(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, errPayload(r, "method_not_allowed", "Method not allowed"))
		return
	}
	if !validCSRF(r) {
		writeJSON(w, http.StatusForbidden, errPayload(r, "csrf_failed", "CSRF token mismatch"))
		return
	}
	subject, tenantID, ok := tenantContextFromRequest(r)
	if !ok {
		writeJSON(w, http.StatusUnauthorized, errPayload(r, "unauthenticated", "Authentication required"))
		return
	}
	if tenantID == "" {
		writeJSON(w, http.StatusBadRequest, errPayload(r, "tenant_context_required", "Tenant context is required"))
		return
	}
	req, ok := decodeClassSectionRequest(w, r)
	if !ok {
		return
	}
	section, err := a.insertClassSection(r, tenantID, subject.UserID, req)
	if err != nil {
		a.writeClassSectionMutationError(w, r, err, "class_section_create_failed", "Could not create class section")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"data": map[string]any{"classSection": section}})
}

func (a *App) updateClassSection(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPatch {
		writeJSON(w, http.StatusMethodNotAllowed, errPayload(r, "method_not_allowed", "Method not allowed"))
		return
	}
	if !validCSRF(r) {
		writeJSON(w, http.StatusForbidden, errPayload(r, "csrf_failed", "CSRF token mismatch"))
		return
	}
	subject, tenantID, ok := tenantContextFromRequest(r)
	if !ok {
		writeJSON(w, http.StatusUnauthorized, errPayload(r, "unauthenticated", "Authentication required"))
		return
	}
	if tenantID == "" {
		writeJSON(w, http.StatusBadRequest, errPayload(r, "tenant_context_required", "Tenant context is required"))
		return
	}
	sectionID := strings.TrimSpace(r.PathValue("id"))
	if sectionID == "" {
		sectionID = strings.Trim(strings.TrimPrefix(r.URL.Path, "/api/v1/class-sections/"), "/")
	}
	req, ok := decodeClassSectionRequest(w, r)
	if !ok {
		return
	}
	section, err := a.modifyClassSection(r, tenantID, subject.UserID, sectionID, req)
	if err != nil {
		a.writeClassSectionMutationError(w, r, err, "class_section_update_failed", "Could not update class section")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": map[string]any{"classSection": section}})
}

func (a *App) archiveClassSection(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPatch {
		writeJSON(w, http.StatusMethodNotAllowed, errPayload(r, "method_not_allowed", "Method not allowed"))
		return
	}
	if !validCSRF(r) {
		writeJSON(w, http.StatusForbidden, errPayload(r, "csrf_failed", "CSRF token mismatch"))
		return
	}
	subject, tenantID, ok := tenantContextFromRequest(r)
	if !ok {
		writeJSON(w, http.StatusUnauthorized, errPayload(r, "unauthenticated", "Authentication required"))
		return
	}
	if tenantID == "" {
		writeJSON(w, http.StatusBadRequest, errPayload(r, "tenant_context_required", "Tenant context is required"))
		return
	}
	sectionID := strings.TrimSpace(r.PathValue("id"))
	if sectionID == "" {
		sectionID = strings.TrimSuffix(strings.Trim(strings.TrimPrefix(r.URL.Path, "/api/v1/class-sections/"), "/"), "/archive")
	}
	section, err := a.archiveClassSectionRow(r, tenantID, subject.UserID, sectionID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeJSON(w, http.StatusNotFound, errPayload(r, "class_section_not_found", "Class section not found in tenant"))
			return
		}
		writeJSON(w, http.StatusInternalServerError, errPayload(r, "class_section_archive_failed", "Could not archive class section"))
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": map[string]any{"classSection": section}})
}

func decodeClassSectionRequest(w http.ResponseWriter, r *http.Request) (upsertClassSectionRequest, bool) {
	var req upsertClassSectionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, errPayload(r, "invalid_json", "Invalid JSON"))
		return req, false
	}
	req.AcademicYearID = strings.TrimSpace(req.AcademicYearID)
	req.Code = strings.TrimSpace(req.Code)
	req.Name = strings.TrimSpace(req.Name)
	req.GradeLevel = strings.TrimSpace(req.GradeLevel)
	req.HomeroomTeacherID = strings.TrimSpace(req.HomeroomTeacherID)
	req.Status = strings.TrimSpace(req.Status)
	if req.Status == "" {
		req.Status = "active"
	}
	if req.AcademicYearID == "" || req.Code == "" || req.Name == "" || req.GradeLevel == "" || !validClassSectionStatus(req.Status) {
		writeJSON(w, http.StatusBadRequest, errPayload(r, "validation_failed", "valid academicYearId, code, name, gradeLevel, and status are required"))
		return req, false
	}
	return req, true
}

func (a *App) writeClassSectionMutationError(w http.ResponseWriter, r *http.Request, err error, fallbackCode, fallbackMessage string) {
	switch {
	case errors.Is(err, sql.ErrNoRows):
		writeJSON(w, http.StatusNotFound, errPayload(r, "class_section_not_found", "Class section not found in tenant"))
	case strings.Contains(err.Error(), "academic_year_not_found"):
		writeJSON(w, http.StatusNotFound, errPayload(r, "academic_year_not_found", "Academic year not found in tenant"))
	case strings.Contains(err.Error(), "homeroom_teacher_not_found"):
		writeJSON(w, http.StatusNotFound, errPayload(r, "homeroom_teacher_not_found", "Homeroom teacher not found in tenant"))
	case strings.Contains(err.Error(), "archived_class_section"):
		writeJSON(w, http.StatusConflict, errPayload(r, "class_section_archived", "Archived class section cannot be edited"))
	default:
		writeJSON(w, http.StatusInternalServerError, errPayload(r, fallbackCode, fallbackMessage))
	}
}

func (a *App) listTenantClassSections(r *http.Request, tenantID string) ([]classSectionRow, error) {
	rows, err := a.deps.DB.QueryContext(r.Context(), `
		SELECT cs.id, cs.tenant_id, cs.academic_year_id, cs.code, cs.name, cs.grade_level, cs.homeroom_teacher_id, cs.status, cs.created_at, cs.updated_at,
		       ay.id, ay.code, ay.name, ay.starts_on, ay.ends_on, ay.status,
		       t.id, t.display_name
		FROM class_sections cs
		JOIN academic_years ay ON ay.tenant_id=cs.tenant_id AND ay.id=cs.academic_year_id
		LEFT JOIN teachers t ON t.tenant_id=cs.tenant_id AND t.id=cs.homeroom_teacher_id
		WHERE cs.tenant_id=$1 AND cs.status <> 'archived'
		ORDER BY CASE cs.status WHEN 'active' THEN 0 WHEN 'inactive' THEN 1 ELSE 2 END, ay.starts_on DESC, cs.grade_level, cs.name`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	sections := []classSectionRow{}
	for rows.Next() {
		var row classSectionRow
		var createdAt, updatedAt, ayStarts, ayEnds any
		var homeroomTeacherID, teacherID, teacherName sql.NullString
		if err := rows.Scan(&row.ID, &row.TenantID, &row.AcademicYearID, &row.Code, &row.Name, &row.GradeLevel, &homeroomTeacherID, &row.Status, &createdAt, &updatedAt, &row.AcademicYear.ID, &row.AcademicYear.Code, &row.AcademicYear.Name, &ayStarts, &ayEnds, &row.AcademicYear.Status, &teacherID, &teacherName); err != nil {
			return nil, err
		}
		if homeroomTeacherID.Valid {
			row.HomeroomTeacherID = homeroomTeacherID.String
		}
		row.CreatedAt, row.UpdatedAt = formatDBValue(createdAt), formatDBValue(updatedAt)
		row.AcademicYear.StartsOn, row.AcademicYear.EndsOn = dateOnlyString(ayStarts), dateOnlyString(ayEnds)
		if teacherID.Valid {
			row.HomeroomTeacher = &teacherSummary{ID: teacherID.String, Name: teacherName.String}
		}
		sections = append(sections, row)
	}
	return sections, rows.Err()
}

func (a *App) insertClassSection(r *http.Request, tenantID, actorID string, req upsertClassSectionRequest) (classSectionRow, error) {
	if err := a.validateClassSectionRelations(r, tenantID, req.AcademicYearID, req.HomeroomTeacherID); err != nil {
		return classSectionRow{}, err
	}
	tx, err := a.deps.DB.BeginTx(r.Context(), nil)
	if err != nil {
		return classSectionRow{}, err
	}
	defer tx.Rollback()
	teacherID := nullableString(req.HomeroomTeacherID)
	var id string
	if err := tx.QueryRowContext(r.Context(), `INSERT INTO class_sections(tenant_id, academic_year_id, code, name, grade_level, homeroom_teacher_id, status) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`, tenantID, req.AcademicYearID, req.Code, req.Name, req.GradeLevel, teacherID, req.Status).Scan(&id); err != nil {
		return classSectionRow{}, err
	}
	if _, err := tx.ExecContext(r.Context(), `INSERT INTO audit_events(tenant_id, actor_user_id, request_id, action, resource_type, resource_id) VALUES ($1,$2,$3,'class_sections.create','class_section',$4)`, tenantID, actorID, RequestIDFromContext(r.Context()), id); err != nil {
		return classSectionRow{}, err
	}
	if err := tx.Commit(); err != nil {
		return classSectionRow{}, err
	}
	return a.findClassSection(r, tenantID, id)
}

func (a *App) modifyClassSection(r *http.Request, tenantID, actorID, sectionID string, req upsertClassSectionRequest) (classSectionRow, error) {
	if err := a.validateClassSectionRelations(r, tenantID, req.AcademicYearID, req.HomeroomTeacherID); err != nil {
		return classSectionRow{}, err
	}
	tx, err := a.deps.DB.BeginTx(r.Context(), nil)
	if err != nil {
		return classSectionRow{}, err
	}
	defer tx.Rollback()
	var existingStatus string
	if err := tx.QueryRowContext(r.Context(), `SELECT status FROM class_sections WHERE tenant_id=$1 AND id=$2`, tenantID, sectionID).Scan(&existingStatus); err != nil {
		return classSectionRow{}, err
	}
	if existingStatus == "archived" {
		return classSectionRow{}, errors.New("archived_class_section")
	}
	teacherID := nullableString(req.HomeroomTeacherID)
	res, err := tx.ExecContext(r.Context(), `UPDATE class_sections SET academic_year_id=$3, code=$4, name=$5, grade_level=$6, homeroom_teacher_id=$7, status=$8, updated_at=CURRENT_TIMESTAMP WHERE tenant_id=$1 AND id=$2`, tenantID, sectionID, req.AcademicYearID, req.Code, req.Name, req.GradeLevel, teacherID, req.Status)
	if err != nil {
		return classSectionRow{}, err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return classSectionRow{}, sql.ErrNoRows
	}
	if _, err := tx.ExecContext(r.Context(), `INSERT INTO audit_events(tenant_id, actor_user_id, request_id, action, resource_type, resource_id) VALUES ($1,$2,$3,'class_sections.update','class_section',$4)`, tenantID, actorID, RequestIDFromContext(r.Context()), sectionID); err != nil {
		return classSectionRow{}, err
	}
	if err := tx.Commit(); err != nil {
		return classSectionRow{}, err
	}
	return a.findClassSection(r, tenantID, sectionID)
}

func (a *App) archiveClassSectionRow(r *http.Request, tenantID, actorID, sectionID string) (classSectionRow, error) {
	tx, err := a.deps.DB.BeginTx(r.Context(), nil)
	if err != nil {
		return classSectionRow{}, err
	}
	defer tx.Rollback()
	res, err := tx.ExecContext(r.Context(), `UPDATE class_sections SET status='archived', updated_at=CURRENT_TIMESTAMP WHERE tenant_id=$1 AND id=$2`, tenantID, sectionID)
	if err != nil {
		return classSectionRow{}, err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return classSectionRow{}, sql.ErrNoRows
	}
	if _, err := tx.ExecContext(r.Context(), `INSERT INTO audit_events(tenant_id, actor_user_id, request_id, action, resource_type, resource_id) VALUES ($1,$2,$3,'class_sections.archive','class_section',$4)`, tenantID, actorID, RequestIDFromContext(r.Context()), sectionID); err != nil {
		return classSectionRow{}, err
	}
	if err := tx.Commit(); err != nil {
		return classSectionRow{}, err
	}
	return a.findClassSectionIncludingArchived(r, tenantID, sectionID)
}

func (a *App) validateClassSectionRelations(r *http.Request, tenantID, academicYearID, homeroomTeacherID string) error {
	var yearStatus string
	if err := a.deps.DB.QueryRowContext(r.Context(), `SELECT status FROM academic_years WHERE tenant_id=$1 AND id=$2`, tenantID, academicYearID).Scan(&yearStatus); err != nil {
		return errors.New("academic_year_not_found")
	}
	if yearStatus == "archived" {
		return errors.New("academic_year_not_found")
	}
	if homeroomTeacherID != "" {
		var status string
		if err := a.deps.DB.QueryRowContext(r.Context(), `SELECT status FROM teachers WHERE tenant_id=$1 AND id=$2`, tenantID, homeroomTeacherID).Scan(&status); err != nil || status == "archived" {
			return errors.New("homeroom_teacher_not_found")
		}
	}
	return nil
}

func (a *App) findClassSection(r *http.Request, tenantID, sectionID string) (classSectionRow, error) {
	return a.findClassSectionWhere(r, tenantID, sectionID, "AND cs.status <> 'archived'")
}

func (a *App) findClassSectionIncludingArchived(r *http.Request, tenantID, sectionID string) (classSectionRow, error) {
	return a.findClassSectionWhere(r, tenantID, sectionID, "")
}

func (a *App) findClassSectionWhere(r *http.Request, tenantID, sectionID, extraPredicate string) (classSectionRow, error) {
	rows, err := a.deps.DB.QueryContext(r.Context(), `
		SELECT cs.id, cs.tenant_id, cs.academic_year_id, cs.code, cs.name, cs.grade_level, cs.homeroom_teacher_id, cs.status, cs.created_at, cs.updated_at,
		       ay.id, ay.code, ay.name, ay.starts_on, ay.ends_on, ay.status,
		       t.id, t.display_name
		FROM class_sections cs
		JOIN academic_years ay ON ay.tenant_id=cs.tenant_id AND ay.id=cs.academic_year_id
		LEFT JOIN teachers t ON t.tenant_id=cs.tenant_id AND t.id=cs.homeroom_teacher_id
		WHERE cs.tenant_id=$1 AND cs.id=$2 `+extraPredicate, tenantID, sectionID)
	if err != nil {
		return classSectionRow{}, err
	}
	defer rows.Close()
	sections := []classSectionRow{}
	for rows.Next() {
		var row classSectionRow
		var createdAt, updatedAt, ayStarts, ayEnds any
		var homeroomTeacherID, teacherID, teacherName sql.NullString
		if err := rows.Scan(&row.ID, &row.TenantID, &row.AcademicYearID, &row.Code, &row.Name, &row.GradeLevel, &homeroomTeacherID, &row.Status, &createdAt, &updatedAt, &row.AcademicYear.ID, &row.AcademicYear.Code, &row.AcademicYear.Name, &ayStarts, &ayEnds, &row.AcademicYear.Status, &teacherID, &teacherName); err != nil {
			return classSectionRow{}, err
		}
		if homeroomTeacherID.Valid {
			row.HomeroomTeacherID = homeroomTeacherID.String
		}
		row.CreatedAt, row.UpdatedAt = formatDBValue(createdAt), formatDBValue(updatedAt)
		row.AcademicYear.StartsOn, row.AcademicYear.EndsOn = dateOnlyString(ayStarts), dateOnlyString(ayEnds)
		if teacherID.Valid {
			row.HomeroomTeacher = &teacherSummary{ID: teacherID.String, Name: teacherName.String}
		}
		sections = append(sections, row)
	}
	if err := rows.Err(); err != nil {
		return classSectionRow{}, err
	}
	if len(sections) == 0 {
		return classSectionRow{}, sql.ErrNoRows
	}
	return sections[0], nil
}

func validClassSectionStatus(status string) bool {
	switch status {
	case "active", "inactive", "archived":
		return true
	default:
		return false
	}
}

func nullableString(value string) any {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	return value
}
