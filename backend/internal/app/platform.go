package app

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"morfoschools/backend/internal/platform/secure"
)

type platformTenantRow struct {
	ID                string `json:"id"`
	Code              string `json:"code"`
	Name              string `json:"name"`
	Status            string `json:"status"`
	LogoURL           string `json:"logoUrl,omitempty"`
	LogoObjectKey     string `json:"logoObjectKey,omitempty"`
	LogoContentType   string `json:"logoContentType,omitempty"`
	PrimaryAdminEmail string `json:"primaryAdminEmail,omitempty"`
	PrimaryAdminName  string `json:"primaryAdminName,omitempty"`
}

var errTenantNotActive = errors.New("tenant_not_active")

func (a *App) registerPlatformRoutes(mux *http.ServeMux) {
	mux.Handle("/api/v1/platform/tenants", a.authenticated(http.HandlerFunc(a.platformTenantsCollection)))
	mux.Handle("/api/v1/platform/tenants/{id}", a.authenticated(http.HandlerFunc(a.platformTenantResource)))
	mux.Handle("/api/v1/platform/tenants/{id}/logo", a.authenticated(a.requireAnyPermission("tenants:write", "platform:admin")(http.HandlerFunc(a.uploadTenantLogo))))
	mux.Handle("/api/v1/platform/tenants/{id}/bootstrap-admin", a.authenticated(a.requireAnyPermission("tenants:bootstrap", "platform:admin")(http.HandlerFunc(a.bootstrapTenantAdmin))))
}

func (a *App) platformTenantsCollection(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		a.requireAnyPermission("tenants:read", "platform:admin")(http.HandlerFunc(a.listPlatformTenants)).ServeHTTP(w, r)
	case http.MethodPost:
		a.requireAnyPermission("tenants:write", "platform:admin")(http.HandlerFunc(a.createPlatformTenant)).ServeHTTP(w, r)
	default:
		writeJSON(w, http.StatusMethodNotAllowed, errPayload(r, "method_not_allowed", "Method not allowed"))
	}
}

func (a *App) platformTenantResource(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPatch:
		a.requireAnyPermission("tenants:write", "platform:admin")(http.HandlerFunc(a.updatePlatformTenant)).ServeHTTP(w, r)
	case http.MethodDelete:
		a.requireAnyPermission("tenants:delete", "platform:admin")(http.HandlerFunc(a.deletePlatformTenant)).ServeHTTP(w, r)
	default:
		writeJSON(w, http.StatusMethodNotAllowed, errPayload(r, "method_not_allowed", "Method not allowed"))
	}
}

func (a *App) listPlatformTenants(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, errPayload(r, "method_not_allowed", "Method not allowed"))
		return
	}
	if a.deps.DB == nil {
		writeJSON(w, http.StatusServiceUnavailable, errPayload(r, "database_unavailable", "Database unavailable"))
		return
	}
	rows, err := a.deps.DB.QueryContext(r.Context(), `
		SELECT t.id, t.code, t.name, t.status, COALESCE(t.logo_url, ''), COALESCE(t.logo_object_key, ''), COALESCE(t.logo_content_type, ''), COALESCE(u.email, ''), COALESCE(u.display_name, '')
		FROM tenants t
		LEFT JOIN tenant_memberships tm ON tm.tenant_id=t.id AND tm.is_primary_admin=TRUE AND tm.status='active'
		LEFT JOIN users u ON u.id=tm.user_id AND u.status <> 'archived'
		ORDER BY t.code ASC`)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, errPayload(r, "tenant_list_failed", "Could not list tenants"))
		return
	}
	defer rows.Close()
	tenants := []platformTenantRow{}
	for rows.Next() {
		var t platformTenantRow
		if err := rows.Scan(&t.ID, &t.Code, &t.Name, &t.Status, &t.LogoURL, &t.LogoObjectKey, &t.LogoContentType, &t.PrimaryAdminEmail, &t.PrimaryAdminName); err != nil {
			writeJSON(w, http.StatusInternalServerError, errPayload(r, "tenant_list_failed", "Could not list tenants"))
			return
		}
		tenants = append(tenants, t)
	}
	if err := rows.Err(); err != nil {
		writeJSON(w, http.StatusInternalServerError, errPayload(r, "tenant_list_failed", "Could not list tenants"))
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": map[string]any{"tenants": tenants}})
}

type createTenantRequest struct {
	Code string `json:"code"`
	Name string `json:"name"`
}

type updateTenantRequest struct {
	Code   string `json:"code"`
	Name   string `json:"name"`
	Status string `json:"status"`
}

func (a *App) deletePlatformTenant(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		writeJSON(w, http.StatusMethodNotAllowed, errPayload(r, "method_not_allowed", "Method not allowed"))
		return
	}
	if !validCSRF(r) {
		writeJSON(w, http.StatusForbidden, errPayload(r, "csrf_failed", "CSRF token mismatch"))
		return
	}
	subject, ok := SubjectFromContext(r.Context())
	if !ok || subject.UserID == "" {
		writeJSON(w, http.StatusUnauthorized, errPayload(r, "unauthenticated", "Authentication required"))
		return
	}
	tenantID := strings.TrimSpace(r.PathValue("id"))
	if tenantID == "" {
		writeJSON(w, http.StatusBadRequest, errPayload(r, "validation_failed", "tenant id is required"))
		return
	}
	if err := a.archivePlatformTenant(r, tenantID, subject.UserID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeJSON(w, http.StatusNotFound, errPayload(r, "tenant_not_found", "Tenant not found"))
			return
		}
		writeJSON(w, http.StatusInternalServerError, errPayload(r, "tenant_delete_failed", "Could not delete tenant"))
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": map[string]any{"ok": true}})
}

func (a *App) updatePlatformTenant(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPatch {
		writeJSON(w, http.StatusMethodNotAllowed, errPayload(r, "method_not_allowed", "Method not allowed"))
		return
	}
	if !validCSRF(r) {
		writeJSON(w, http.StatusForbidden, errPayload(r, "csrf_failed", "CSRF token mismatch"))
		return
	}
	tenantID := strings.TrimSpace(r.PathValue("id"))
	if tenantID == "" {
		writeJSON(w, http.StatusBadRequest, errPayload(r, "validation_failed", "tenant id is required"))
		return
	}
	if a.deps.DB == nil {
		writeJSON(w, http.StatusServiceUnavailable, errPayload(r, "database_unavailable", "Database unavailable"))
		return
	}
	var req updateTenantRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, errPayload(r, "invalid_json", "Invalid JSON"))
		return
	}
	req.Code = normalizeTenantCode(req.Code)
	req.Name = strings.TrimSpace(req.Name)
	req.Status = strings.ToLower(strings.TrimSpace(req.Status))
	if req.Code == "" || req.Name == "" {
		writeJSON(w, http.StatusBadRequest, errPayload(r, "validation_failed", "code and name are required"))
		return
	}
	if !validTenantStatus(req.Status) {
		writeJSON(w, http.StatusBadRequest, errPayload(r, "validation_failed", "status must be active, suspended, or archived"))
		return
	}
	subject, ok := SubjectFromContext(r.Context())
	if !ok || subject.UserID == "" {
		writeJSON(w, http.StatusUnauthorized, errPayload(r, "unauthenticated", "Authentication required"))
		return
	}
	tenant, err := a.updatePlatformTenantRecord(r, tenantID, subject.UserID, req)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeJSON(w, http.StatusNotFound, errPayload(r, "tenant_not_found", "Tenant not found"))
			return
		}
		writeJSON(w, http.StatusInternalServerError, errPayload(r, "tenant_update_failed", "Could not update tenant"))
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": map[string]any{"tenant": tenant}})
}

func (a *App) createPlatformTenant(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, errPayload(r, "method_not_allowed", "Method not allowed"))
		return
	}
	if !validCSRF(r) {
		writeJSON(w, http.StatusForbidden, errPayload(r, "csrf_failed", "CSRF token mismatch"))
		return
	}
	subject, ok := SubjectFromContext(r.Context())
	if !ok || subject.UserID == "" {
		writeJSON(w, http.StatusUnauthorized, errPayload(r, "unauthenticated", "Authentication required"))
		return
	}
	if a.deps.DB == nil {
		writeJSON(w, http.StatusServiceUnavailable, errPayload(r, "database_unavailable", "Database unavailable"))
		return
	}
	var req createTenantRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, errPayload(r, "invalid_json", "Invalid JSON"))
		return
	}
	req.Code = normalizeTenantCode(req.Code)
	req.Name = strings.TrimSpace(req.Name)
	if req.Code == "" || req.Name == "" {
		writeJSON(w, http.StatusBadRequest, errPayload(r, "validation_failed", "code and name are required"))
		return
	}
	tenant, err := a.insertPlatformTenant(r, subject.UserID, req)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, errPayload(r, "tenant_create_failed", "Could not create tenant"))
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"data": map[string]any{"tenant": tenant}})
}

func normalizeTenantCode(code string) string {
	code = strings.ToLower(strings.TrimSpace(code))
	var b strings.Builder
	lastDash := false
	for _, r := range code {
		valid := (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9')
		if valid {
			b.WriteRune(r)
			lastDash = false
			continue
		}
		if !lastDash {
			b.WriteByte('-')
			lastDash = true
		}
	}
	return strings.Trim(b.String(), "-")
}

func validTenantStatus(status string) bool {
	switch status {
	case "active", "suspended", "archived":
		return true
	default:
		return false
	}
}

const maxTenantLogoBytes = 2 * 1024 * 1024

func (a *App) uploadTenantLogo(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, errPayload(r, "method_not_allowed", "Method not allowed"))
		return
	}
	if !validCSRF(r) {
		writeJSON(w, http.StatusForbidden, errPayload(r, "csrf_failed", "CSRF token mismatch"))
		return
	}
	if a.deps.DB == nil {
		writeJSON(w, http.StatusServiceUnavailable, errPayload(r, "database_unavailable", "Database unavailable"))
		return
	}
	if a.deps.LogoStorage == nil {
		writeJSON(w, http.StatusServiceUnavailable, errPayload(r, "logo_storage_unavailable", "Logo storage is not configured"))
		return
	}
	subject, ok := SubjectFromContext(r.Context())
	if !ok || subject.UserID == "" {
		writeJSON(w, http.StatusUnauthorized, errPayload(r, "unauthenticated", "Authentication required"))
		return
	}
	tenantID := strings.TrimSpace(r.PathValue("id"))
	if tenantID == "" {
		writeJSON(w, http.StatusBadRequest, errPayload(r, "validation_failed", "tenant id is required"))
		return
	}
	if err := r.ParseMultipartForm(maxTenantLogoBytes + 1024); err != nil {
		writeJSON(w, http.StatusBadRequest, errPayload(r, "invalid_logo_upload", "Logo upload must be a multipart form"))
		return
	}
	file, header, err := r.FormFile("logo")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, errPayload(r, "validation_failed", "logo file is required"))
		return
	}
	defer file.Close()
	if header.Size > maxTenantLogoBytes {
		writeJSON(w, http.StatusBadRequest, errPayload(r, "logo_too_large", "Logo must be 2 MB or smaller"))
		return
	}
	content := bytes.NewBuffer(nil)
	limited := http.MaxBytesReader(w, r.Body, maxTenantLogoBytes+1)
	_ = limited
	if _, err := content.ReadFrom(file); err != nil {
		writeJSON(w, http.StatusBadRequest, errPayload(r, "invalid_logo_upload", "Could not read logo file"))
		return
	}
	if content.Len() == 0 {
		writeJSON(w, http.StatusBadRequest, errPayload(r, "validation_failed", "logo file is required"))
		return
	}
	if content.Len() > maxTenantLogoBytes {
		writeJSON(w, http.StatusBadRequest, errPayload(r, "logo_too_large", "Logo must be 2 MB or smaller"))
		return
	}
	contentType, extension := detectTenantLogoType(content.Bytes())
	if contentType == "" {
		writeJSON(w, http.StatusBadRequest, errPayload(r, "unsupported_logo_type", "Logo must be PNG, JPG, or WEBP"))
		return
	}
	var exists bool
	if err := a.deps.DB.QueryRowContext(r.Context(), `SELECT EXISTS (SELECT 1 FROM tenants WHERE id=$1 AND status <> 'archived')`, tenantID).Scan(&exists); err != nil {
		writeJSON(w, http.StatusInternalServerError, errPayload(r, "tenant_lookup_failed", "Could not verify tenant"))
		return
	}
	if !exists {
		writeJSON(w, http.StatusNotFound, errPayload(r, "tenant_not_found", "Tenant not found"))
		return
	}
	objectKey := buildTenantLogoObjectKey(a.cfg.TenantLogoPrefix, tenantID, extension)
	logoURL := buildPublicAssetURL(a.cfg.R2PublicBaseURL, objectKey)
	if err := a.deps.LogoStorage.PutTenantLogo(r.Context(), objectKey, contentType, bytes.NewReader(content.Bytes())); err != nil {
		writeJSON(w, http.StatusBadGateway, errPayload(r, "logo_upload_failed", "Could not upload logo"))
		return
	}
	tenant, err := a.updateTenantLogoMetadata(r, tenantID, subject.UserID, logoURL, objectKey, contentType)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, errPayload(r, "logo_record_update_failed", "Could not save logo metadata"))
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": map[string]any{"tenant": tenant}})
}

func (a *App) updateTenantLogoMetadata(r *http.Request, tenantID, actorID, logoURL, objectKey, contentType string) (platformTenantRow, error) {
	tx, err := a.deps.DB.BeginTx(r.Context(), nil)
	if err != nil {
		return platformTenantRow{}, err
	}
	defer tx.Rollback()

	var tenant platformTenantRow
	if err := tx.QueryRowContext(r.Context(), `UPDATE tenants SET logo_url=$1, logo_object_key=$2, logo_content_type=$3, updated_at=CURRENT_TIMESTAMP WHERE id=$4 RETURNING id, code, name, status, COALESCE(logo_url, ''), COALESCE(logo_object_key, ''), COALESCE(logo_content_type, '')`, logoURL, objectKey, contentType, tenantID).Scan(&tenant.ID, &tenant.Code, &tenant.Name, &tenant.Status, &tenant.LogoURL, &tenant.LogoObjectKey, &tenant.LogoContentType); err != nil {
		return platformTenantRow{}, err
	}
	if _, err := tx.ExecContext(r.Context(), `INSERT INTO audit_events(tenant_id, actor_user_id, request_id, action, resource_type, resource_id) VALUES ($1,$2,$3,'tenants.logo_upload','tenant',$4)`, tenantID, actorID, RequestIDFromContext(r.Context()), tenantID); err != nil {
		return platformTenantRow{}, err
	}
	if err := tx.Commit(); err != nil {
		return platformTenantRow{}, err
	}
	return tenant, nil
}

func detectTenantLogoType(data []byte) (contentType string, extension string) {
	if len(data) >= 8 && bytes.Equal(data[:8], []byte{0x89, 'P', 'N', 'G', 0x0d, 0x0a, 0x1a, 0x0a}) {
		return "image/png", "png"
	}
	if len(data) >= 3 && data[0] == 0xff && data[1] == 0xd8 && data[2] == 0xff {
		return "image/jpeg", "jpg"
	}
	if len(data) >= 12 && string(data[:4]) == "RIFF" && string(data[8:12]) == "WEBP" {
		return "image/webp", "webp"
	}
	return "", ""
}

func (a *App) archivePlatformTenant(r *http.Request, tenantID, actorID string) error {
	tx, err := a.deps.DB.BeginTx(r.Context(), nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	res, err := tx.ExecContext(r.Context(), `UPDATE tenants SET status='archived', updated_at=CURRENT_TIMESTAMP WHERE id=$1 AND status <> 'archived'`, tenantID)
	if err != nil {
		return err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return sql.ErrNoRows
	}
	if _, err := tx.ExecContext(r.Context(), `DELETE FROM user_roles WHERE membership_id IN (SELECT id FROM tenant_memberships WHERE tenant_id=$1)`, tenantID); err != nil {
		return err
	}
	if _, err := tx.ExecContext(r.Context(), `UPDATE tenant_memberships SET status='archived', updated_at=CURRENT_TIMESTAMP WHERE tenant_id=$1 AND status <> 'archived'`, tenantID); err != nil {
		return err
	}
	if _, err := tx.ExecContext(r.Context(), `INSERT INTO audit_events(tenant_id, actor_user_id, request_id, action, resource_type, resource_id) VALUES ($1,$2,$3,'tenants.delete','tenant',$4)`, tenantID, actorID, RequestIDFromContext(r.Context()), tenantID); err != nil {
		return err
	}
	return tx.Commit()
}

func (a *App) updatePlatformTenantRecord(r *http.Request, tenantID, actorID string, req updateTenantRequest) (platformTenantRow, error) {
	tx, err := a.deps.DB.BeginTx(r.Context(), nil)
	if err != nil {
		return platformTenantRow{}, err
	}
	defer tx.Rollback()

	var tenant platformTenantRow
	if err := tx.QueryRowContext(r.Context(), `UPDATE tenants SET code=$1, name=$2, status=$3, updated_at=CURRENT_TIMESTAMP WHERE id=$4 RETURNING id, code, name, status`, req.Code, req.Name, req.Status, tenantID).Scan(&tenant.ID, &tenant.Code, &tenant.Name, &tenant.Status); err != nil {
		return platformTenantRow{}, err
	}
	if _, err := tx.ExecContext(r.Context(), `INSERT INTO audit_events(tenant_id, actor_user_id, request_id, action, resource_type, resource_id) VALUES ($1,$2,$3,'tenants.update','tenant',$4)`, tenantID, actorID, RequestIDFromContext(r.Context()), tenantID); err != nil {
		return platformTenantRow{}, err
	}
	if err := tx.Commit(); err != nil {
		return platformTenantRow{}, err
	}
	return tenant, nil
}

func (a *App) insertPlatformTenant(r *http.Request, actorID string, req createTenantRequest) (platformTenantRow, error) {
	tx, err := a.deps.DB.BeginTx(r.Context(), nil)
	if err != nil {
		return platformTenantRow{}, err
	}
	defer tx.Rollback()

	var tenant platformTenantRow
	if err := tx.QueryRowContext(r.Context(), `INSERT INTO tenants(code, name, status) VALUES ($1,$2,'active') RETURNING id, code, name, status`, req.Code, req.Name).Scan(&tenant.ID, &tenant.Code, &tenant.Name, &tenant.Status); err != nil {
		return platformTenantRow{}, err
	}
	if _, err := tx.ExecContext(r.Context(), `INSERT INTO tenant_theme_settings(tenant_id, preset, primary_color, accent_color, logo_url, version) VALUES ($1,'morfoschools-default','oklch(0.52 0.16 250)','oklch(0.68 0.18 70)','',1)`, tenant.ID); err != nil {
		return platformTenantRow{}, err
	}
	if err := a.seedTenantDefaultRolesTx(r.Context(), tx, tenant.ID); err != nil {
		return platformTenantRow{}, err
	}
	if _, err := tx.ExecContext(r.Context(), `INSERT INTO audit_events(tenant_id, actor_user_id, request_id, action, resource_type, resource_id) VALUES ($1,$2,$3,'tenants.create','tenant',$4)`, tenant.ID, actorID, RequestIDFromContext(r.Context()), tenant.ID); err != nil {
		return platformTenantRow{}, err
	}
	if err := tx.Commit(); err != nil {
		return platformTenantRow{}, err
	}
	return tenant, nil
}

func (a *App) seedTenantDefaultRolesTx(ctx context.Context, tx *sql.Tx, tenantID string) error {
	return seedTenantDefaultRolesWithContext(ctx, tx, tenantID)
}

func seedTenantDefaultRolesWithContext(ctx context.Context, tx *sql.Tx, tenantID string) error {
	roles := []struct {
		Code        string
		Name        string
		Description string
		Permissions []string
	}{
		{Code: "school_admin", Name: "School Admin", Description: "Tenant administrator.", Permissions: []string{"tenant:admin", "users:read", "users:write"}},
		{Code: "teacher", Name: "Teacher", Description: "Teacher role.", Permissions: []string{"courses:teach"}},
		{Code: "student", Name: "Student", Description: "Student role.", Permissions: []string{"learning:access"}},
	}
	for _, role := range roles {
		var roleID string
		if err := tx.QueryRowContext(ctx, `INSERT INTO roles(tenant_id, code, name, description, is_system) VALUES ($1,$2,$3,$4,TRUE) ON CONFLICT (tenant_id, code) DO UPDATE SET name=excluded.name, description=excluded.description, is_system=TRUE, updated_at=CURRENT_TIMESTAMP RETURNING id`, tenantID, role.Code, role.Name, role.Description).Scan(&roleID); err != nil {
			return err
		}
		for _, permission := range role.Permissions {
			if _, err := tx.ExecContext(ctx, `INSERT INTO role_permissions(role_id, permission_id) SELECT $1, p.id FROM permissions p WHERE p.code=$2 ON CONFLICT DO NOTHING`, roleID, permission); err != nil {
				return err
			}
		}
	}
	return nil
}

type bootstrapTenantAdminRequest struct {
	Email       string `json:"email"`
	DisplayName string `json:"displayName"`
	Password    string `json:"password"`
}

func (a *App) bootstrapTenantAdmin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, errPayload(r, "method_not_allowed", "Method not allowed"))
		return
	}
	if !validCSRF(r) {
		writeJSON(w, http.StatusForbidden, errPayload(r, "csrf_failed", "CSRF token mismatch"))
		return
	}
	subject, ok := SubjectFromContext(r.Context())
	if !ok || subject.UserID == "" {
		writeJSON(w, http.StatusUnauthorized, errPayload(r, "unauthenticated", "Authentication required"))
		return
	}
	tenantID := strings.TrimSpace(r.PathValue("id"))
	if tenantID == "" {
		writeJSON(w, http.StatusBadRequest, errPayload(r, "validation_failed", "tenant id is required"))
		return
	}
	var req bootstrapTenantAdminRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, errPayload(r, "invalid_json", "Invalid JSON"))
		return
	}
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	req.DisplayName = strings.TrimSpace(req.DisplayName)
	if req.Email == "" || req.DisplayName == "" || req.Password == "" {
		writeJSON(w, http.StatusBadRequest, errPayload(r, "validation_failed", "email, displayName, and password are required"))
		return
	}
	user, err := a.insertTenantBootstrapAdmin(r, tenantID, subject.UserID, req)
	if err != nil {
		code := "tenant_bootstrap_failed"
		status := http.StatusInternalServerError
		if errors.Is(err, sql.ErrNoRows) || strings.Contains(err.Error(), "role_not_found") {
			code = "tenant_or_role_not_found"
			status = http.StatusBadRequest
		}
		if errors.Is(err, errTenantNotActive) {
			code = "tenant_not_active"
			status = http.StatusBadRequest
		}
		if strings.Contains(err.Error(), "password") {
			code = "validation_failed"
			status = http.StatusBadRequest
		}
		message := "Could not bootstrap tenant admin"
		if code == "tenant_not_active" {
			message = "Tenant is not active. Restore or create a new active tenant before setting up an admin."
		}
		writeJSON(w, status, errPayload(r, code, message))
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"data": map[string]any{"user": user}})
}

func (a *App) insertTenantBootstrapAdmin(r *http.Request, tenantID, actorID string, req bootstrapTenantAdminRequest) (userDirectoryRow, error) {
	passwordHash, err := secure.HashPassword(req.Password)
	if err != nil {
		return userDirectoryRow{}, err
	}
	tx, err := a.deps.DB.BeginTx(r.Context(), nil)
	if err != nil {
		return userDirectoryRow{}, err
	}
	defer tx.Rollback()

	var tenantStatus string
	if err := tx.QueryRowContext(r.Context(), `SELECT status FROM tenants WHERE id=$1`, tenantID).Scan(&tenantStatus); err != nil {
		return userDirectoryRow{}, err
	}
	if tenantStatus != "active" {
		return userDirectoryRow{}, errTenantNotActive
	}
	var userID string
	if err := tx.QueryRowContext(r.Context(), `INSERT INTO users(email, display_name, status) VALUES ($1,$2,'active') ON CONFLICT (email) DO UPDATE SET display_name=excluded.display_name, status='active', updated_at=CURRENT_TIMESTAMP RETURNING id`, req.Email, req.DisplayName).Scan(&userID); err != nil {
		return userDirectoryRow{}, err
	}
	if _, err := tx.ExecContext(r.Context(), `INSERT INTO password_credentials(user_id, password_hash, must_change_password, password_changed_at) VALUES ($1,$2,TRUE,NULL) ON CONFLICT (user_id) DO UPDATE SET password_hash=excluded.password_hash, must_change_password=TRUE, updated_at=CURRENT_TIMESTAMP`, userID, passwordHash); err != nil {
		return userDirectoryRow{}, err
	}
	if err := seedTenantDefaultRolesWithContext(r.Context(), tx, tenantID); err != nil {
		return userDirectoryRow{}, err
	}
	var membershipID string
	if err := tx.QueryRowContext(r.Context(), `INSERT INTO tenant_memberships(tenant_id, user_id, status, is_primary_admin) VALUES ($1,$2,'active',FALSE) ON CONFLICT (tenant_id, user_id) DO UPDATE SET status='active', updated_at=CURRENT_TIMESTAMP RETURNING id`, tenantID, userID).Scan(&membershipID); err != nil {
		return userDirectoryRow{}, err
	}
	if _, err := tx.ExecContext(r.Context(), `UPDATE tenant_memberships SET is_primary_admin=FALSE, updated_at=CURRENT_TIMESTAMP WHERE tenant_id=$1 AND is_primary_admin=TRUE AND id <> $2`, tenantID, membershipID); err != nil {
		return userDirectoryRow{}, err
	}
	if _, err := tx.ExecContext(r.Context(), `UPDATE tenant_memberships SET is_primary_admin=TRUE, status='active', updated_at=CURRENT_TIMESTAMP WHERE id=$1`, membershipID); err != nil {
		return userDirectoryRow{}, err
	}
	res, err := tx.ExecContext(r.Context(), `INSERT INTO user_roles(membership_id, role_id) SELECT $1, r.id FROM roles r WHERE r.tenant_id=$2 AND r.code='school_admin' ON CONFLICT DO NOTHING`, membershipID, tenantID)
	if err != nil {
		return userDirectoryRow{}, err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		var linked int
		_ = tx.QueryRowContext(r.Context(), `SELECT COUNT(*) FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.membership_id=$1 AND r.tenant_id=$2 AND r.code='school_admin'`, membershipID, tenantID).Scan(&linked)
		if linked == 0 {
			return userDirectoryRow{}, errors.New("role_not_found")
		}
	}
	if _, err := tx.ExecContext(r.Context(), `INSERT INTO audit_events(tenant_id, actor_user_id, request_id, action, resource_type, resource_id) VALUES ($1,$2,$3,'tenants.bootstrap_admin','user',$4)`, tenantID, actorID, RequestIDFromContext(r.Context()), userID); err != nil {
		return userDirectoryRow{}, err
	}
	if err := tx.Commit(); err != nil {
		return userDirectoryRow{}, err
	}
	return a.findTenantUser(r, tenantID, userID)
}
