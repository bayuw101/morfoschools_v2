package app

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	"strings"
)

type academicYearRow struct {
	ID        string    `json:"id"`
	TenantID  string    `json:"tenantId"`
	Code      string    `json:"code"`
	Name      string    `json:"name"`
	StartsOn  string    `json:"startsOn"`
	EndsOn    string    `json:"endsOn"`
	Status    string    `json:"status"`
	CreatedAt string    `json:"createdAt"`
	UpdatedAt string    `json:"updatedAt"`
	Terms     []termRow `json:"terms"`
}

type termRow struct {
	ID             string `json:"id"`
	TenantID       string `json:"tenantId"`
	AcademicYearID string `json:"academicYearId"`
	Code           string `json:"code"`
	Name           string `json:"name"`
	StartsOn       string `json:"startsOn"`
	EndsOn         string `json:"endsOn"`
	Status         string `json:"status"`
	CreatedAt      string `json:"createdAt"`
	UpdatedAt      string `json:"updatedAt"`
}

type createAcademicYearRequest struct {
	Code     string `json:"code"`
	Name     string `json:"name"`
	StartsOn string `json:"startsOn"`
	EndsOn   string `json:"endsOn"`
	Status   string `json:"status"`
}

type createTermRequest struct {
	AcademicYearID string `json:"academicYearId"`
	Code           string `json:"code"`
	Name           string `json:"name"`
	StartsOn       string `json:"startsOn"`
	EndsOn         string `json:"endsOn"`
	Status         string `json:"status"`
}

type updateAcademicYearRequest struct {
	Code     string `json:"code"`
	Name     string `json:"name"`
	StartsOn string `json:"startsOn"`
	EndsOn   string `json:"endsOn"`
	Status   string `json:"status"`
}

type updateTermRequest struct {
	Code     string `json:"code"`
	Name     string `json:"name"`
	StartsOn string `json:"startsOn"`
	EndsOn   string `json:"endsOn"`
	Status   string `json:"status"`
}

func (a *App) registerAcademicRoutes(mux *http.ServeMux) {
	mux.Handle("/api/v1/academic-years", a.authenticated(http.HandlerFunc(a.academicYearsCollection)))
	mux.Handle("/api/v1/academic-years/", a.authenticated(http.HandlerFunc(a.academicYearItemFallback)))
	mux.Handle("/api/v1/terms", a.authenticated(http.HandlerFunc(a.termsCollection)))
	mux.Handle("/api/v1/terms/", a.authenticated(http.HandlerFunc(a.termItemFallback)))
}

func (a *App) academicYearItemFallback(w http.ResponseWriter, r *http.Request) {
	path := strings.Trim(strings.TrimPrefix(r.URL.Path, "/api/v1/academic-years/"), "/")
	parts := strings.Split(path, "/")
	if len(parts) == 1 && r.Method == http.MethodPatch {
		a.requireAnyPermission("academic:write", "platform:admin")(http.HandlerFunc(a.updateAcademicYear)).ServeHTTP(w, r)
		return
	}
	if len(parts) == 2 && parts[1] == "duplicate" && r.Method == http.MethodPost {
		a.requireAnyPermission("academic:write", "platform:admin")(http.HandlerFunc(a.duplicateAcademicYear)).ServeHTTP(w, r)
		return
	}
	if len(parts) == 2 && parts[1] == "archive" && r.Method == http.MethodPatch {
		a.requireAnyPermission("academic:write", "platform:admin")(http.HandlerFunc(a.archiveAcademicYear)).ServeHTTP(w, r)
		return
	}
	writeJSON(w, http.StatusNotFound, errPayload(r, "not_found", "Academic route not found"))
}

func (a *App) termItemFallback(w http.ResponseWriter, r *http.Request) {
	path := strings.Trim(strings.TrimPrefix(r.URL.Path, "/api/v1/terms/"), "/")
	if path != "" && !strings.Contains(path, "/") && r.Method == http.MethodPatch {
		a.requireAnyPermission("academic:write", "platform:admin")(http.HandlerFunc(a.updateTerm)).ServeHTTP(w, r)
		return
	}
	writeJSON(w, http.StatusNotFound, errPayload(r, "not_found", "Term route not found"))
}

func (a *App) academicYearsCollection(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		a.requireAnyPermission("academic:read", "platform:admin")(http.HandlerFunc(a.listAcademicYears)).ServeHTTP(w, r)
	case http.MethodPost:
		a.requireAnyPermission("academic:write", "platform:admin")(http.HandlerFunc(a.createAcademicYear)).ServeHTTP(w, r)
	default:
		writeJSON(w, http.StatusMethodNotAllowed, errPayload(r, "method_not_allowed", "Method not allowed"))
	}
}

func (a *App) termsCollection(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		a.requireAnyPermission("academic:write", "platform:admin")(http.HandlerFunc(a.createTerm)).ServeHTTP(w, r)
	default:
		writeJSON(w, http.StatusMethodNotAllowed, errPayload(r, "method_not_allowed", "Method not allowed"))
	}
}

func (a *App) listAcademicYears(w http.ResponseWriter, r *http.Request) {
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
	years, err := a.listTenantAcademicYears(r, tenantID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, errPayload(r, "academic_years_lookup_failed", "Could not load academic years"))
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": map[string]any{"academicYears": years}})
}

func (a *App) createAcademicYear(w http.ResponseWriter, r *http.Request) {
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
	var req createAcademicYearRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, errPayload(r, "invalid_json", "Invalid JSON"))
		return
	}
	req.Code, req.Name, req.StartsOn, req.EndsOn, req.Status = strings.TrimSpace(req.Code), strings.TrimSpace(req.Name), strings.TrimSpace(req.StartsOn), strings.TrimSpace(req.EndsOn), strings.TrimSpace(req.Status)
	if req.Status == "" {
		req.Status = "draft"
	}
	if req.Name == "" {
		req.Name = req.Code
	}
	if req.Code == "" || req.StartsOn == "" || req.EndsOn == "" || req.StartsOn > req.EndsOn || !validAcademicStatus(req.Status) {
		writeJSON(w, http.StatusBadRequest, errPayload(r, "validation_failed", "valid school year, startsOn, endsOn, and status are required"))
		return
	}
	year, err := a.insertAcademicYear(r, tenantID, subject.UserID, req)
	if err != nil {
		a.logger.Error("academic year create failed", "error", err, "tenant_id", tenantID, "code", req.Code)
		writeJSON(w, http.StatusInternalServerError, errPayload(r, "academic_year_create_failed", "Could not create academic year"))
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"data": map[string]any{"academicYear": year}})
}

func (a *App) createTerm(w http.ResponseWriter, r *http.Request) {
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
	var req createTermRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, errPayload(r, "invalid_json", "Invalid JSON"))
		return
	}
	req.AcademicYearID, req.Code, req.Name, req.StartsOn, req.EndsOn, req.Status = strings.TrimSpace(req.AcademicYearID), strings.TrimSpace(req.Code), strings.TrimSpace(req.Name), strings.TrimSpace(req.StartsOn), strings.TrimSpace(req.EndsOn), strings.TrimSpace(req.Status)
	if req.Status == "" {
		req.Status = "draft"
	}
	if req.Name == "" {
		req.Name = req.Code
	}
	if req.AcademicYearID == "" || req.Code == "" || (req.StartsOn != "" && req.EndsOn != "" && req.StartsOn > req.EndsOn) || !validAcademicStatus(req.Status) {
		writeJSON(w, http.StatusBadRequest, errPayload(r, "validation_failed", "valid academicYearId, semester, optional dates, and status are required"))
		return
	}
	term, err := a.insertTerm(r, tenantID, subject.UserID, req)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeJSON(w, http.StatusNotFound, errPayload(r, "academic_year_not_found", "Academic year not found in tenant"))
			return
		}
		if strings.Contains(err.Error(), "outside_academic_year") {
			writeJSON(w, http.StatusBadRequest, errPayload(r, "term_outside_academic_year", "Term dates must be inside academic year dates"))
			return
		}
		writeJSON(w, http.StatusInternalServerError, errPayload(r, "term_create_failed", "Could not create term"))
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"data": map[string]any{"term": term}})
}

func (a *App) updateTerm(w http.ResponseWriter, r *http.Request) {
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
	termID := strings.TrimSpace(r.PathValue("id"))
	if termID == "" {
		termID = strings.Trim(strings.TrimPrefix(r.URL.Path, "/api/v1/terms/"), "/")
	}
	if termID == "" {
		writeJSON(w, http.StatusBadRequest, errPayload(r, "validation_failed", "term id is required"))
		return
	}
	var req updateTermRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, errPayload(r, "invalid_json", "Invalid JSON"))
		return
	}
	req.Code, req.Name, req.StartsOn, req.EndsOn, req.Status = strings.TrimSpace(req.Code), strings.TrimSpace(req.Name), strings.TrimSpace(req.StartsOn), strings.TrimSpace(req.EndsOn), strings.TrimSpace(req.Status)
	if req.Name == "" {
		req.Name = req.Code
	}
	if req.Code == "" || req.Name == "" || !validAcademicStatus(req.Status) || (req.StartsOn != "" && req.EndsOn != "" && req.StartsOn > req.EndsOn) {
		writeJSON(w, http.StatusBadRequest, errPayload(r, "validation_failed", "Valid semester, date range, and status are required"))
		return
	}
	term, err := a.updateTenantTerm(r, tenantID, subject.UserID, termID, req)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeJSON(w, http.StatusNotFound, errPayload(r, "term_not_found", "Term not found in tenant"))
			return
		}
		if err.Error() == "outside_academic_year" {
			writeJSON(w, http.StatusBadRequest, errPayload(r, "term_outside_academic_year", "Term dates must be within the academic year"))
			return
		}
		writeJSON(w, http.StatusInternalServerError, errPayload(r, "term_update_failed", "Could not update term"))
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": map[string]any{"term": term}})
}

func (a *App) updateAcademicYear(w http.ResponseWriter, r *http.Request) {
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
	yearID := strings.TrimSpace(r.PathValue("id"))
	if yearID == "" {
		yearID = strings.Trim(strings.TrimPrefix(r.URL.Path, "/api/v1/academic-years/"), "/")
	}
	if yearID == "" || strings.Contains(yearID, "/") {
		writeJSON(w, http.StatusBadRequest, errPayload(r, "validation_failed", "academic year id is required"))
		return
	}
	var req updateAcademicYearRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, errPayload(r, "invalid_json", "Invalid JSON"))
		return
	}
	req.Code, req.Name, req.StartsOn, req.EndsOn, req.Status = strings.TrimSpace(req.Code), strings.TrimSpace(req.Name), strings.TrimSpace(req.StartsOn), strings.TrimSpace(req.EndsOn), strings.TrimSpace(req.Status)
	if req.Name == "" {
		req.Name = req.Code
	}
	if req.Code == "" || req.Name == "" || req.StartsOn == "" || req.EndsOn == "" || req.StartsOn > req.EndsOn || !validAcademicStatus(req.Status) {
		writeJSON(w, http.StatusBadRequest, errPayload(r, "validation_failed", "valid school year, startsOn, endsOn, and status are required"))
		return
	}
	year, err := a.updateTenantAcademicYear(r, tenantID, subject.UserID, yearID, req)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeJSON(w, http.StatusNotFound, errPayload(r, "academic_year_not_found", "Academic year not found in tenant"))
			return
		}
		writeJSON(w, http.StatusInternalServerError, errPayload(r, "academic_year_update_failed", "Could not update academic year"))
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": map[string]any{"academicYear": year}})
}

func (a *App) duplicateAcademicYear(w http.ResponseWriter, r *http.Request) {
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
	yearID := strings.TrimSpace(r.PathValue("id"))
	if yearID == "" {
		yearID = strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/api/v1/academic-years/"), "/duplicate")
	}
	if yearID == "" {
		writeJSON(w, http.StatusBadRequest, errPayload(r, "validation_failed", "academic year id is required"))
		return
	}
	year, err := a.duplicateTenantAcademicYear(r, tenantID, subject.UserID, yearID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeJSON(w, http.StatusNotFound, errPayload(r, "academic_year_not_found", "Academic year not found in tenant"))
			return
		}
		a.logger.Error("academic year duplicate failed", "error", err, "tenant_id", tenantID, "source_year_id", yearID, "actor_user_id", subject.UserID, "request_id", RequestIDFromContext(r.Context()))
		writeJSON(w, http.StatusInternalServerError, errPayload(r, "academic_year_duplicate_failed", "Could not duplicate academic year"))
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"data": map[string]any{"academicYear": year}})
}

func (a *App) archiveAcademicYear(w http.ResponseWriter, r *http.Request) {
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
	yearID := strings.TrimSpace(r.PathValue("id"))
	if yearID == "" {
		yearID = strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/api/v1/academic-years/"), "/archive")
	}
	if yearID == "" {
		writeJSON(w, http.StatusBadRequest, errPayload(r, "validation_failed", "academic year id is required"))
		return
	}
	if err := a.archiveTenantAcademicYear(r, tenantID, subject.UserID, yearID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeJSON(w, http.StatusNotFound, errPayload(r, "academic_year_not_found", "Academic year not found in tenant"))
			return
		}
		writeJSON(w, http.StatusInternalServerError, errPayload(r, "academic_year_archive_failed", "Could not archive academic year"))
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": map[string]any{"ok": true}})
}

func validAcademicStatus(status string) bool {
	return status == "draft" || status == "active" || status == "closed" || status == "archived"
}

func (a *App) listTenantAcademicYears(r *http.Request, tenantID string) ([]academicYearRow, error) {
	if a.deps.DB == nil {
		return []academicYearRow{}, nil
	}
	rows, err := a.deps.DB.QueryContext(r.Context(), `SELECT id, tenant_id, code, name, starts_on, ends_on, status, created_at, updated_at FROM academic_years WHERE tenant_id=$1 AND status <> 'archived' ORDER BY starts_on DESC, code DESC`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	years := []academicYearRow{}
	for rows.Next() {
		var y academicYearRow
		var startsOn, endsOn, createdAt, updatedAt any
		if err := rows.Scan(&y.ID, &y.TenantID, &y.Code, &y.Name, &startsOn, &endsOn, &y.Status, &createdAt, &updatedAt); err != nil {
			return nil, err
		}
		y.StartsOn, y.EndsOn = dateOnlyString(startsOn), dateOnlyString(endsOn)
		y.CreatedAt, y.UpdatedAt = formatDBValue(createdAt), formatDBValue(updatedAt)
		y.Terms = []termRow{}
		years = append(years, y)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	for i := range years {
		terms, err := a.listTermsForYear(r, tenantID, years[i].ID)
		if err != nil {
			return nil, err
		}
		years[i].Terms = terms
	}
	return years, nil
}

func (a *App) listTermsForYear(r *http.Request, tenantID, yearID string) ([]termRow, error) {
	rows, err := a.deps.DB.QueryContext(r.Context(), `SELECT id, tenant_id, academic_year_id, code, name, starts_on, ends_on, status, created_at, updated_at FROM terms WHERE tenant_id=$1 AND academic_year_id=$2 AND status <> 'archived' ORDER BY starts_on ASC, code ASC`, tenantID, yearID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	terms := []termRow{}
	for rows.Next() {
		var t termRow
		var startsOn, endsOn, createdAt, updatedAt any
		if err := rows.Scan(&t.ID, &t.TenantID, &t.AcademicYearID, &t.Code, &t.Name, &startsOn, &endsOn, &t.Status, &createdAt, &updatedAt); err != nil {
			return nil, err
		}
		t.StartsOn, t.EndsOn = dateOnlyString(startsOn), dateOnlyString(endsOn)
		t.CreatedAt, t.UpdatedAt = formatDBValue(createdAt), formatDBValue(updatedAt)
		terms = append(terms, t)
	}
	return terms, rows.Err()
}

func (a *App) insertAcademicYear(r *http.Request, tenantID, actorID string, req createAcademicYearRequest) (academicYearRow, error) {
	tx, err := a.deps.DB.BeginTx(r.Context(), nil)
	if err != nil {
		return academicYearRow{}, err
	}
	defer tx.Rollback()
	if req.Status == "active" {
		if _, err := tx.ExecContext(r.Context(), `UPDATE academic_years SET status='closed', updated_at=CURRENT_TIMESTAMP WHERE tenant_id=$1 AND status='active'`, tenantID); err != nil {
			return academicYearRow{}, err
		}
	}
	var id string
	if err := tx.QueryRowContext(r.Context(), `SELECT id FROM academic_years WHERE tenant_id=$1 AND code=$2 AND status='archived'`, tenantID, req.Code).Scan(&id); err != nil {
		if !errors.Is(err, sql.ErrNoRows) {
			return academicYearRow{}, err
		}
		if err := freeArchivedAcademicYearCode(r, tx, tenantID, "", req.Code); err != nil {
			return academicYearRow{}, err
		}
		if err := tx.QueryRowContext(r.Context(), `INSERT INTO academic_years(tenant_id, code, name, starts_on, ends_on, status) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`, tenantID, req.Code, req.Name, req.StartsOn, req.EndsOn, req.Status).Scan(&id); err != nil {
			return academicYearRow{}, err
		}
	} else {
		if _, err := tx.ExecContext(r.Context(), `UPDATE academic_years SET name=$3, starts_on=$4, ends_on=$5, status=$6, updated_at=CURRENT_TIMESTAMP WHERE id=$1 AND tenant_id=$2`, id, tenantID, req.Name, req.StartsOn, req.EndsOn, req.Status); err != nil {
			return academicYearRow{}, err
		}
		if _, err := tx.ExecContext(r.Context(), `DELETE FROM terms WHERE tenant_id=$1 AND academic_year_id=$2`, tenantID, id); err != nil {
			return academicYearRow{}, err
		}
	}
	semesterGanjilEnd := req.StartsOn[:4] + "-12-31"
	semesterGenapStart := req.EndsOn[:4] + "-01-01"
	if _, err := tx.ExecContext(r.Context(), `INSERT INTO terms(tenant_id, academic_year_id, code, name, starts_on, ends_on, status) VALUES ($1,$2,'ganjil','Semester Ganjil',$3,$4,'draft'), ($1,$2,'genap','Semester Genap',$5,$6,'draft')`, tenantID, id, req.StartsOn, semesterGanjilEnd, semesterGenapStart, req.EndsOn); err != nil {
		return academicYearRow{}, err
	}
	if _, err := tx.ExecContext(r.Context(), `INSERT INTO audit_events(tenant_id, actor_user_id, request_id, action, resource_type, resource_id) VALUES ($1,$2,$3,'academic_years.create','academic_year',$4)`, tenantID, actorID, RequestIDFromContext(r.Context()), id); err != nil {
		return academicYearRow{}, err
	}
	if err := tx.Commit(); err != nil {
		return academicYearRow{}, err
	}
	return a.findAcademicYear(r, tenantID, id)
}

func freeArchivedAcademicYearCode(r *http.Request, tx *sql.Tx, tenantID, keepYearID, code string) error {
	var archivedID string
	query := `SELECT id FROM academic_years WHERE tenant_id=$1 AND code=$2 AND status='archived'`
	args := []any{tenantID, code}
	if keepYearID != "" {
		query += ` AND id <> $3`
		args = append(args, keepYearID)
	}
	if err := tx.QueryRowContext(r.Context(), query, args...).Scan(&archivedID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil
		}
		return err
	}
	archivedCode := fmt.Sprintf("%s Archived %s", code, archivedID[:8])
	if _, err := tx.ExecContext(r.Context(), `UPDATE academic_years SET code=$3, updated_at=CURRENT_TIMESTAMP WHERE id=$1 AND tenant_id=$2 AND status='archived'`, archivedID, tenantID, archivedCode); err != nil {
		return err
	}
	return nil
}

func (a *App) updateTenantAcademicYear(r *http.Request, tenantID, actorID, yearID string, req updateAcademicYearRequest) (academicYearRow, error) {
	tx, err := a.deps.DB.BeginTx(r.Context(), nil)
	if err != nil {
		return academicYearRow{}, err
	}
	defer tx.Rollback()
	if req.Status == "active" {
		if _, err := tx.ExecContext(r.Context(), `UPDATE academic_years SET status='closed', updated_at=CURRENT_TIMESTAMP WHERE tenant_id=$1 AND id <> $2 AND status='active'`, tenantID, yearID); err != nil {
			return academicYearRow{}, err
		}
	}
	if err := freeArchivedAcademicYearCode(r, tx, tenantID, yearID, req.Code); err != nil {
		return academicYearRow{}, err
	}
	res, err := tx.ExecContext(r.Context(), `UPDATE academic_years SET code=$3, name=$4, starts_on=$5, ends_on=$6, status=$7, updated_at=CURRENT_TIMESTAMP WHERE id=$1 AND tenant_id=$2 AND status <> 'archived'`, yearID, tenantID, req.Code, req.Name, req.StartsOn, req.EndsOn, req.Status)
	if err != nil {
		return academicYearRow{}, err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return academicYearRow{}, sql.ErrNoRows
	}
	if _, err := tx.ExecContext(r.Context(), `INSERT INTO audit_events(tenant_id, actor_user_id, request_id, action, resource_type, resource_id) VALUES ($1,$2,$3,'academic_years.update','academic_year',$4)`, tenantID, actorID, RequestIDFromContext(r.Context()), yearID); err != nil {
		return academicYearRow{}, err
	}
	if err := tx.Commit(); err != nil {
		return academicYearRow{}, err
	}
	return a.findAcademicYear(r, tenantID, yearID)
}

func (a *App) insertTerm(r *http.Request, tenantID, actorID string, req createTermRequest) (termRow, error) {
	tx, err := a.deps.DB.BeginTx(r.Context(), nil)
	if err != nil {
		return termRow{}, err
	}
	defer tx.Rollback()
	var yearStart, yearEnd any
	if err := tx.QueryRowContext(r.Context(), `SELECT starts_on, ends_on FROM academic_years WHERE id=$1 AND tenant_id=$2 AND status <> 'archived'`, req.AcademicYearID, tenantID).Scan(&yearStart, &yearEnd); err != nil {
		return termRow{}, err
	}
	if (req.StartsOn != "" && req.StartsOn < dateOnlyString(yearStart)) || (req.EndsOn != "" && req.EndsOn > dateOnlyString(yearEnd)) {
		return termRow{}, errors.New("outside_academic_year")
	}
	if req.Status == "active" {
		if _, err := tx.ExecContext(r.Context(), `UPDATE terms SET status='closed', updated_at=CURRENT_TIMESTAMP WHERE tenant_id=$1 AND academic_year_id=$2 AND status='active'`, tenantID, req.AcademicYearID); err != nil {
			return termRow{}, err
		}
	}
	var id string
	var startsOn, endsOn any
	if req.StartsOn != "" {
		startsOn = req.StartsOn
	}
	if req.EndsOn != "" {
		endsOn = req.EndsOn
	}
	if err := tx.QueryRowContext(r.Context(), `INSERT INTO terms(tenant_id, academic_year_id, code, name, starts_on, ends_on, status) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`, tenantID, req.AcademicYearID, req.Code, req.Name, startsOn, endsOn, req.Status).Scan(&id); err != nil {
		return termRow{}, err
	}
	if _, err := tx.ExecContext(r.Context(), `INSERT INTO audit_events(tenant_id, actor_user_id, request_id, action, resource_type, resource_id) VALUES ($1,$2,$3,'terms.create','term',$4)`, tenantID, actorID, RequestIDFromContext(r.Context()), id); err != nil {
		return termRow{}, err
	}
	if err := tx.Commit(); err != nil {
		return termRow{}, err
	}
	return a.findTerm(r, tenantID, id)
}

func (a *App) updateTenantTerm(r *http.Request, tenantID, actorID, termID string, req updateTermRequest) (termRow, error) {
	tx, err := a.deps.DB.BeginTx(r.Context(), nil)
	if err != nil {
		return termRow{}, err
	}
	defer tx.Rollback()

	var academicYearID string
	var yearStart, yearEnd any
	if err := tx.QueryRowContext(r.Context(), `SELECT t.academic_year_id, y.starts_on, y.ends_on FROM terms t JOIN academic_years y ON y.tenant_id=t.tenant_id AND y.id=t.academic_year_id WHERE t.id=$1 AND t.tenant_id=$2 AND t.status <> 'archived' AND y.status <> 'archived'`, termID, tenantID).Scan(&academicYearID, &yearStart, &yearEnd); err != nil {
		return termRow{}, err
	}
	if (req.StartsOn != "" && req.StartsOn < dateOnlyString(yearStart)) || (req.EndsOn != "" && req.EndsOn > dateOnlyString(yearEnd)) {
		return termRow{}, errors.New("outside_academic_year")
	}
	if req.Status == "active" {
		if _, err := tx.ExecContext(r.Context(), `UPDATE terms SET status='closed', updated_at=CURRENT_TIMESTAMP WHERE tenant_id=$1 AND academic_year_id=$2 AND id <> $3 AND status='active'`, tenantID, academicYearID, termID); err != nil {
			return termRow{}, err
		}
	}
	var startsOn, endsOn any
	if req.StartsOn != "" {
		startsOn = req.StartsOn
	}
	if req.EndsOn != "" {
		endsOn = req.EndsOn
	}
	res, err := tx.ExecContext(r.Context(), `UPDATE terms SET code=$3, name=$4, starts_on=$5, ends_on=$6, status=$7, updated_at=CURRENT_TIMESTAMP WHERE id=$1 AND tenant_id=$2 AND status <> 'archived'`, termID, tenantID, req.Code, req.Name, startsOn, endsOn, req.Status)
	if err != nil {
		return termRow{}, err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return termRow{}, sql.ErrNoRows
	}
	if _, err := tx.ExecContext(r.Context(), `INSERT INTO audit_events(tenant_id, actor_user_id, request_id, action, resource_type, resource_id) VALUES ($1,$2,$3,'terms.update','term',$4)`, tenantID, actorID, RequestIDFromContext(r.Context()), termID); err != nil {
		return termRow{}, err
	}
	if err := tx.Commit(); err != nil {
		return termRow{}, err
	}
	return a.findTerm(r, tenantID, termID)
}

func (a *App) duplicateTenantAcademicYear(r *http.Request, tenantID, actorID, sourceYearID string) (academicYearRow, error) {
	tx, err := a.deps.DB.BeginTx(r.Context(), nil)
	if err != nil {
		return academicYearRow{}, err
	}
	defer tx.Rollback()

	var source academicYearRow
	var sourceStartsOn, sourceEndsOn, sourceCreatedAt, sourceUpdatedAt any
	if err := tx.QueryRowContext(r.Context(), `SELECT id, tenant_id, code, name, starts_on, ends_on, status, created_at, updated_at FROM academic_years WHERE id=$1 AND tenant_id=$2 AND status <> 'archived'`, sourceYearID, tenantID).Scan(&source.ID, &source.TenantID, &source.Code, &source.Name, &sourceStartsOn, &sourceEndsOn, &source.Status, &sourceCreatedAt, &sourceUpdatedAt); err != nil {
		return academicYearRow{}, err
	}
	source.StartsOn, source.EndsOn = dateOnlyString(sourceStartsOn), dateOnlyString(sourceEndsOn)
	source.CreatedAt, source.UpdatedAt = formatDBValue(sourceCreatedAt), formatDBValue(sourceUpdatedAt)

	newCode, shiftYears, err := a.nextAvailableAcademicYearCode(r, tx, tenantID, source.Code)
	if err != nil {
		return academicYearRow{}, err
	}
	newName := nextAcademicYearName(source.Name, source.Code, newCode)
	newStartsOn := shiftISODateByYears(source.StartsOn, shiftYears)
	newEndsOn := shiftISODateByYears(source.EndsOn, shiftYears)

	var newID string
	if err := tx.QueryRowContext(r.Context(), `INSERT INTO academic_years(tenant_id, code, name, starts_on, ends_on, status) VALUES ($1,$2,$3,$4,$5,'draft') RETURNING id`, tenantID, newCode, newName, newStartsOn, newEndsOn).Scan(&newID); err != nil {
		return academicYearRow{}, err
	}

	termRows, err := tx.QueryContext(r.Context(), `SELECT code, name, starts_on, ends_on, status FROM terms WHERE tenant_id=$1 AND academic_year_id=$2 AND status <> 'archived' ORDER BY starts_on ASC, code ASC`, tenantID, sourceYearID)
	if err != nil {
		return academicYearRow{}, err
	}
	termsToCopy := []struct {
		code     string
		name     string
		startsOn any
		endsOn   any
		status   string
	}{}
	for termRows.Next() {
		var term struct {
			code     string
			name     string
			startsOn any
			endsOn   any
			status   string
		}
		if err := termRows.Scan(&term.code, &term.name, &term.startsOn, &term.endsOn, &term.status); err != nil {
			termRows.Close()
			return academicYearRow{}, err
		}
		termsToCopy = append(termsToCopy, term)
	}
	if err := termRows.Err(); err != nil {
		termRows.Close()
		return academicYearRow{}, err
	}
	termRows.Close()
	for _, term := range termsToCopy {
		var newTermStart, newTermEnd any
		if value := dateOnlyString(term.startsOn); value != "" {
			newTermStart = shiftISODateByYears(value, shiftYears)
		}
		if value := dateOnlyString(term.endsOn); value != "" {
			newTermEnd = shiftISODateByYears(value, shiftYears)
		}
		if _, err := tx.ExecContext(r.Context(), `INSERT INTO terms(tenant_id, academic_year_id, code, name, starts_on, ends_on, status) VALUES ($1,$2,$3,$4,$5,$6,$7)`, tenantID, newID, term.code, term.name, newTermStart, newTermEnd, term.status); err != nil {
			return academicYearRow{}, err
		}
	}
	if _, err := tx.ExecContext(r.Context(), `INSERT INTO audit_events(tenant_id, actor_user_id, request_id, action, resource_type, resource_id) VALUES ($1,$2,$3,'academic_years.duplicate','academic_year',$4)`, tenantID, actorID, RequestIDFromContext(r.Context()), newID); err != nil {
		return academicYearRow{}, err
	}
	if err := tx.Commit(); err != nil {
		return academicYearRow{}, err
	}
	return a.findAcademicYear(r, tenantID, newID)
}

func (a *App) nextAvailableAcademicYearCode(r *http.Request, tx *sql.Tx, tenantID, sourceCode string) (string, int, error) {
	for shiftYears := 1; shiftYears <= 20; shiftYears++ {
		candidate := academicYearCodeShiftedBy(sourceCode, shiftYears)
		var exists int
		if err := tx.QueryRowContext(r.Context(), `SELECT COUNT(1) FROM academic_years WHERE tenant_id=$1 AND code=$2`, tenantID, candidate).Scan(&exists); err != nil {
			return "", 0, err
		}
		if exists == 0 {
			return candidate, shiftYears, nil
		}
	}
	return "", 0, errors.New("academic_year_code_exhausted")
}

func nextAcademicYearCode(code string) string {
	return academicYearCodeShiftedBy(code, 1)
}

func academicYearCodeShiftedBy(code string, years int) string {
	parts := regexp.MustCompile(`\d+`).FindAllString(code, -1)
	if len(parts) >= 2 {
		first, err1 := strconv.Atoi(parts[0])
		second, err2 := strconv.Atoi(parts[1])
		if err1 == nil && err2 == nil {
			secondWidth := len(parts[1])
			if secondWidth < 2 {
				secondWidth = 2
			}
			if secondWidth > 4 {
				secondWidth = 4
			}
			return fmt.Sprintf("%04d-%0*d", first+years, secondWidth, second+years)
		}
	}
	trimmed := strings.TrimSpace(code)
	if years == 1 {
		return trimmed + " Copy"
	}
	return fmt.Sprintf("%s Copy %d", trimmed, years)
}

func nextAcademicYearName(name, oldCode, newCode string) string {
	trimmed := strings.TrimSpace(name)
	if trimmed == "" || trimmed == oldCode {
		return newCode
	}
	if strings.Contains(trimmed, oldCode) {
		return strings.ReplaceAll(trimmed, oldCode, newCode)
	}
	return newCode
}

func shiftISODateByYears(value string, years int) string {
	if len(value) < 4 {
		return value
	}
	year, err := strconv.Atoi(value[:4])
	if err != nil {
		return value
	}
	return fmt.Sprintf("%04d%s", year+years, value[4:])
}

func (a *App) archiveTenantAcademicYear(r *http.Request, tenantID, actorID, yearID string) error {
	tx, err := a.deps.DB.BeginTx(r.Context(), nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	res, err := tx.ExecContext(r.Context(), `UPDATE academic_years SET status='archived', updated_at=CURRENT_TIMESTAMP WHERE id=$1 AND tenant_id=$2`, yearID, tenantID)
	if err != nil {
		return err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return sql.ErrNoRows
	}
	if _, err := tx.ExecContext(r.Context(), `UPDATE terms SET status='archived', updated_at=CURRENT_TIMESTAMP WHERE academic_year_id=$1 AND tenant_id=$2`, yearID, tenantID); err != nil {
		return err
	}
	if _, err := tx.ExecContext(r.Context(), `INSERT INTO audit_events(tenant_id, actor_user_id, request_id, action, resource_type, resource_id) VALUES ($1,$2,$3,'academic_years.archive','academic_year',$4)`, tenantID, actorID, RequestIDFromContext(r.Context()), yearID); err != nil {
		return err
	}
	return tx.Commit()
}

func (a *App) findAcademicYear(r *http.Request, tenantID, id string) (academicYearRow, error) {
	years, err := a.listTenantAcademicYears(r, tenantID)
	if err != nil {
		return academicYearRow{}, err
	}
	for _, y := range years {
		if y.ID == id {
			return y, nil
		}
	}
	return academicYearRow{}, sql.ErrNoRows
}

func (a *App) findTerm(r *http.Request, tenantID, id string) (termRow, error) {
	rows, err := a.deps.DB.QueryContext(r.Context(), `SELECT id, tenant_id, academic_year_id, code, name, starts_on, ends_on, status, created_at, updated_at FROM terms WHERE tenant_id=$1 AND id=$2`, tenantID, id)
	if err != nil {
		return termRow{}, err
	}
	defer rows.Close()
	if rows.Next() {
		var t termRow
		var startsOn, endsOn, createdAt, updatedAt any
		if err := rows.Scan(&t.ID, &t.TenantID, &t.AcademicYearID, &t.Code, &t.Name, &startsOn, &endsOn, &t.Status, &createdAt, &updatedAt); err != nil {
			return termRow{}, err
		}
		t.StartsOn, t.EndsOn = dateOnlyString(startsOn), dateOnlyString(endsOn)
		t.CreatedAt, t.UpdatedAt = formatDBValue(createdAt), formatDBValue(updatedAt)
		return t, nil
	}
	return termRow{}, sql.ErrNoRows
}
