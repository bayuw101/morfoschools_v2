package app

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"
)

type userDirectoryRow struct {
	ID           string   `json:"id"`
	Email        string   `json:"email"`
	DisplayName  string   `json:"displayName"`
	Status       string   `json:"status"`
	MembershipID string   `json:"membershipId"`
	TenantID     string   `json:"tenantId"`
	TenantStatus string   `json:"tenantStatus"`
	Roles        []string `json:"roles"`
	RoleNames    []string `json:"roleNames"`
	CreatedAt    string   `json:"createdAt"`
	UpdatedAt    string   `json:"updatedAt"`
}

func (a *App) registerUserRoutes(mux *http.ServeMux) {
	mux.Handle("/api/v1/users", a.authenticated(http.HandlerFunc(a.usersCollection)))
	mux.Handle("/api/v1/users/{id}", a.authenticated(a.requireAnyPermission("users:write", "platform:admin")(http.HandlerFunc(a.updateUser))))
	mux.Handle("/api/v1/users/{id}/deactivate", a.authenticated(a.requireAnyPermission("users:write", "platform:admin")(http.HandlerFunc(a.deactivateUser))))
}

func (a *App) usersCollection(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		a.requireAnyPermission("users:read", "platform:admin")(http.HandlerFunc(a.listUsers)).ServeHTTP(w, r)
	case http.MethodPost:
		a.requireAnyPermission("users:write", "platform:admin")(http.HandlerFunc(a.createUser)).ServeHTTP(w, r)
	default:
		writeJSON(w, http.StatusMethodNotAllowed, errPayload(r, "method_not_allowed", "Method not allowed"))
	}
}

func (a *App) listUsers(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, errPayload(r, "method_not_allowed", "Method not allowed"))
		return
	}
	subject, ok := SubjectFromContext(r.Context())
	if !ok || subject.UserID == "" {
		writeJSON(w, http.StatusUnauthorized, errPayload(r, "unauthenticated", "Authentication required"))
		return
	}
	tenantID := subject.EffectiveTenantID
	if tenantID == "" {
		tenantID = subject.TenantID
	}
	if tenantID == "" {
		if !contains(subject.Permissions, "platform:admin") {
			writeJSON(w, http.StatusBadRequest, errPayload(r, "tenant_context_required", "Tenant context is required"))
			return
		}
		users, err := a.listAllUsers(r)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, errPayload(r, "users_lookup_failed", "Could not load users"))
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"data": map[string]any{"users": users}})
		return
	}
	users, err := a.listTenantUsers(r, tenantID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, errPayload(r, "users_lookup_failed", "Could not load users"))
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": map[string]any{"users": users}})
}

type createUserRequest struct {
	Email       string   `json:"email"`
	DisplayName string   `json:"displayName"`
	RoleCodes   []string `json:"roleCodes"`
}

type updateUserRequest struct {
	DisplayName string   `json:"displayName"`
	RoleCodes   []string `json:"roleCodes"`
}

func (a *App) createUser(w http.ResponseWriter, r *http.Request) {
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
	var req createUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, errPayload(r, "invalid_json", "Invalid JSON"))
		return
	}
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	req.DisplayName = strings.TrimSpace(req.DisplayName)
	if req.Email == "" || req.DisplayName == "" || len(req.RoleCodes) == 0 {
		writeJSON(w, http.StatusBadRequest, errPayload(r, "validation_failed", "email, displayName, and roleCodes are required"))
		return
	}
	user, err := a.insertTenantUser(r, tenantID, subject.UserID, req)
	if err != nil {
		if strings.Contains(err.Error(), "role_not_found") {
			writeJSON(w, http.StatusBadRequest, errPayload(r, "role_not_found", "One or more roles were not found in tenant context"))
			return
		}
		writeJSON(w, http.StatusInternalServerError, errPayload(r, "user_create_failed", "Could not create user"))
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"data": map[string]any{"user": user}})
}

func tenantContextFromRequest(r *http.Request) (Subject, string, bool) {
	subject, ok := SubjectFromContext(r.Context())
	if !ok || subject.UserID == "" {
		return Subject{}, "", false
	}
	tenantID := subject.EffectiveTenantID
	if tenantID == "" {
		tenantID = subject.TenantID
	}
	if tenantID == "" && contains(subject.Permissions, "platform:admin") {
		tenantID = strings.TrimSpace(r.Header.Get("X-Tenant-ID"))
	}
	return subject, tenantID, true
}

func (a *App) updateUser(w http.ResponseWriter, r *http.Request) {
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
	userID := strings.TrimSpace(r.PathValue("id"))
	if userID == "" {
		writeJSON(w, http.StatusBadRequest, errPayload(r, "validation_failed", "user id is required"))
		return
	}
	var req updateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, errPayload(r, "invalid_json", "Invalid JSON"))
		return
	}
	req.DisplayName = strings.TrimSpace(req.DisplayName)
	if req.DisplayName == "" || len(req.RoleCodes) == 0 {
		writeJSON(w, http.StatusBadRequest, errPayload(r, "validation_failed", "displayName and roleCodes are required"))
		return
	}
	user, err := a.updateTenantUser(r, tenantID, subject.UserID, userID, req)
	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			writeJSON(w, http.StatusNotFound, errPayload(r, "user_not_found", "User not found in tenant"))
		case strings.Contains(err.Error(), "role_not_found"):
			writeJSON(w, http.StatusBadRequest, errPayload(r, "role_not_found", "One or more roles were not found in tenant context"))
		default:
			writeJSON(w, http.StatusInternalServerError, errPayload(r, "user_update_failed", "Could not update user"))
		}
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": map[string]any{"user": user}})
}

func (a *App) deactivateUser(w http.ResponseWriter, r *http.Request) {
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
	userID := strings.TrimSpace(r.PathValue("id"))
	if userID == "" {
		writeJSON(w, http.StatusBadRequest, errPayload(r, "validation_failed", "user id is required"))
		return
	}
	if err := a.deactivateTenantUser(r, tenantID, subject.UserID, userID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeJSON(w, http.StatusNotFound, errPayload(r, "user_not_found", "User not found in tenant"))
			return
		}
		writeJSON(w, http.StatusInternalServerError, errPayload(r, "user_deactivate_failed", "Could not deactivate user"))
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": map[string]any{"ok": true}})
}

func (a *App) insertTenantUser(r *http.Request, tenantID, actorID string, req createUserRequest) (userDirectoryRow, error) {
	tx, err := a.deps.DB.BeginTx(r.Context(), nil)
	if err != nil {
		return userDirectoryRow{}, err
	}
	defer tx.Rollback()

	var userID string
	if err := tx.QueryRowContext(r.Context(), `INSERT INTO users(email, display_name, status) VALUES ($1,$2,'active') RETURNING id`, req.Email, req.DisplayName).Scan(&userID); err != nil {
		return userDirectoryRow{}, err
	}
	var membershipID string
	if err := tx.QueryRowContext(r.Context(), `INSERT INTO tenant_memberships(tenant_id, user_id, status) VALUES ($1,$2,'active') RETURNING id`, tenantID, userID).Scan(&membershipID); err != nil {
		return userDirectoryRow{}, err
	}
	for _, roleCode := range req.RoleCodes {
		roleCode = strings.TrimSpace(roleCode)
		if roleCode == "" {
			continue
		}
		res, err := tx.ExecContext(r.Context(), `INSERT INTO user_roles(membership_id, role_id)
			SELECT $1, r.id FROM roles r WHERE r.tenant_id=$2 AND r.code=$3`, membershipID, tenantID, roleCode)
		if err != nil {
			return userDirectoryRow{}, err
		}
		rows, _ := res.RowsAffected()
		if rows == 0 {
			return userDirectoryRow{}, errors.New("role_not_found")
		}
	}
	if _, err := tx.ExecContext(r.Context(), `INSERT INTO audit_events(tenant_id, actor_user_id, request_id, action, resource_type, resource_id) VALUES ($1,$2,$3,'users.create','user',$4)`, tenantID, actorID, RequestIDFromContext(r.Context()), userID); err != nil {
		return userDirectoryRow{}, err
	}
	if err := tx.Commit(); err != nil {
		return userDirectoryRow{}, err
	}
	users, err := a.listTenantUsers(r, tenantID)
	if err != nil {
		return userDirectoryRow{}, err
	}
	for _, user := range users {
		if user.ID == userID {
			return user, nil
		}
	}
	return userDirectoryRow{ID: userID, Email: req.Email, DisplayName: req.DisplayName, Status: "active", MembershipID: membershipID, TenantID: tenantID}, nil
}

func (a *App) updateTenantUser(r *http.Request, tenantID, actorID, userID string, req updateUserRequest) (userDirectoryRow, error) {
	tx, err := a.deps.DB.BeginTx(r.Context(), nil)
	if err != nil {
		return userDirectoryRow{}, err
	}
	defer tx.Rollback()
	membershipID, err := membershipIDForTenantUser(r, tx, tenantID, userID)
	if err != nil {
		return userDirectoryRow{}, err
	}
	if _, err := tx.ExecContext(r.Context(), `UPDATE users SET display_name=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2`, req.DisplayName, userID); err != nil {
		return userDirectoryRow{}, err
	}
	if _, err := tx.ExecContext(r.Context(), `DELETE FROM user_roles WHERE membership_id=$1`, membershipID); err != nil {
		return userDirectoryRow{}, err
	}
	if err := assignTenantRoles(r, tx, tenantID, membershipID, req.RoleCodes); err != nil {
		return userDirectoryRow{}, err
	}
	if _, err := tx.ExecContext(r.Context(), `INSERT INTO audit_events(tenant_id, actor_user_id, request_id, action, resource_type, resource_id) VALUES ($1,$2,$3,'users.update','user',$4)`, tenantID, actorID, RequestIDFromContext(r.Context()), userID); err != nil {
		return userDirectoryRow{}, err
	}
	if err := tx.Commit(); err != nil {
		return userDirectoryRow{}, err
	}
	return a.findTenantUser(r, tenantID, userID)
}

func (a *App) deactivateTenantUser(r *http.Request, tenantID, actorID, userID string) error {
	tx, err := a.deps.DB.BeginTx(r.Context(), nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	membershipID, err := membershipIDForTenantUser(r, tx, tenantID, userID)
	if err != nil {
		return err
	}
	res, err := tx.ExecContext(r.Context(), `UPDATE tenant_memberships SET status='archived', updated_at=CURRENT_TIMESTAMP WHERE id=$1 AND tenant_id=$2 AND user_id=$3`, membershipID, tenantID, userID)
	if err != nil {
		return err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return sql.ErrNoRows
	}
	if _, err := tx.ExecContext(r.Context(), `DELETE FROM user_roles WHERE membership_id=$1`, membershipID); err != nil {
		return err
	}
	if _, err := tx.ExecContext(r.Context(), `INSERT INTO audit_events(tenant_id, actor_user_id, request_id, action, resource_type, resource_id) VALUES ($1,$2,$3,'users.deactivate','user',$4)`, tenantID, actorID, RequestIDFromContext(r.Context()), userID); err != nil {
		return err
	}
	return tx.Commit()
}

type tenantUserTx interface {
	QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
	ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
}

func membershipIDForTenantUser(r *http.Request, tx tenantUserTx, tenantID, userID string) (string, error) {
	var membershipID string
	err := tx.QueryRowContext(r.Context(), `SELECT tm.id FROM tenant_memberships tm JOIN users u ON u.id=tm.user_id WHERE tm.tenant_id=$1 AND tm.user_id=$2 AND tm.status <> 'archived' AND u.status <> 'archived'`, tenantID, userID).Scan(&membershipID)
	return membershipID, err
}

func assignTenantRoles(r *http.Request, tx tenantUserTx, tenantID, membershipID string, roleCodes []string) error {
	assigned := 0
	seen := map[string]bool{}
	for _, roleCode := range roleCodes {
		roleCode = strings.TrimSpace(roleCode)
		if roleCode == "" || seen[roleCode] {
			continue
		}
		seen[roleCode] = true
		res, err := tx.ExecContext(r.Context(), `INSERT INTO user_roles(membership_id, role_id)
			SELECT $1, r.id FROM roles r WHERE r.tenant_id=$2 AND r.code=$3`, membershipID, tenantID, roleCode)
		if err != nil {
			return err
		}
		rows, _ := res.RowsAffected()
		if rows == 0 {
			return errors.New("role_not_found")
		}
		assigned++
	}
	if assigned == 0 {
		return errors.New("role_not_found")
	}
	return nil
}

func (a *App) findTenantUser(r *http.Request, tenantID, userID string) (userDirectoryRow, error) {
	users, err := a.listTenantUsers(r, tenantID)
	if err != nil {
		return userDirectoryRow{}, err
	}
	for _, user := range users {
		if user.ID == userID {
			return user, nil
		}
	}
	return userDirectoryRow{}, sql.ErrNoRows
}

func formatDBValue(value any) string {
	switch v := value.(type) {
	case nil:
		return ""
	case time.Time:
		return v.Format(time.RFC3339)
	case []byte:
		return string(v)
	case string:
		return v
	default:
		return fmt.Sprint(v)
	}
}

func dateOnlyString(value any) string {
	switch v := value.(type) {
	case nil:
		return ""
	case time.Time:
		return v.Format(time.DateOnly)
	case []byte:
		return strings.TrimSpace(string(v))[:10]
	case string:
		trimmed := strings.TrimSpace(v)
		if len(trimmed) >= 10 {
			return trimmed[:10]
		}
		return trimmed
	default:
		trimmed := strings.TrimSpace(fmt.Sprint(v))
		if len(trimmed) >= 10 {
			return trimmed[:10]
		}
		return trimmed
	}
}

func (a *App) listTenantUsers(r *http.Request, tenantID string) ([]userDirectoryRow, error) {
	if a.deps.DB == nil {
		return []userDirectoryRow{}, nil
	}
	rows, err := a.deps.DB.QueryContext(r.Context(), `
		SELECT
			u.id,
			u.email,
			u.display_name,
			u.status,
			tm.id,
			tm.tenant_id,
			tm.status,
			COALESCE(r.code, ''),
			COALESCE(r.name, ''),
			u.created_at,
			u.updated_at
		FROM tenant_memberships tm
		JOIN users u ON u.id = tm.user_id
		LEFT JOIN user_roles ur ON ur.membership_id = tm.id
		LEFT JOIN roles r ON r.id = ur.role_id
		WHERE tm.tenant_id = $1 AND tm.status IN ('active', 'invited', 'suspended') AND u.status <> 'archived'
		ORDER BY u.display_name ASC, u.email ASC, r.code ASC`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	byID := map[string]*userDirectoryRow{}
	ordered := []string{}
	for rows.Next() {
		var userID, email, displayName, status, membershipID, rowTenantID, tenantStatus, roleCode, roleName string
		var createdAt, updatedAt any
		if err := rows.Scan(&userID, &email, &displayName, &status, &membershipID, &rowTenantID, &tenantStatus, &roleCode, &roleName, &createdAt, &updatedAt); err != nil {
			return nil, err
		}
		user, exists := byID[userID]
		if !exists {
			byID[userID] = &userDirectoryRow{
				ID:           userID,
				Email:        email,
				DisplayName:  displayName,
				Status:       status,
				MembershipID: membershipID,
				TenantID:     rowTenantID,
				TenantStatus: tenantStatus,
				Roles:        []string{},
				RoleNames:    []string{},
				CreatedAt:    formatDBValue(createdAt),
				UpdatedAt:    formatDBValue(updatedAt),
			}
			user = byID[userID]
			ordered = append(ordered, userID)
		}
		if roleCode != "" && !stringSliceContains(user.Roles, roleCode) {
			user.Roles = append(user.Roles, roleCode)
		}
		if roleName != "" && !stringSliceContains(user.RoleNames, roleName) {
			user.RoleNames = append(user.RoleNames, roleName)
		}
	}
	if err := rows.Err(); err != nil && err != sql.ErrNoRows {
		return nil, err
	}
	users := make([]userDirectoryRow, 0, len(ordered))
	for _, id := range ordered {
		users = append(users, *byID[id])
	}
	return users, nil
}

func (a *App) listAllUsers(r *http.Request) ([]userDirectoryRow, error) {
	if a.deps.DB == nil {
		return []userDirectoryRow{}, nil
	}
	rows, err := a.deps.DB.QueryContext(r.Context(), `
		SELECT
			u.id,
			u.email,
			u.display_name,
			u.status,
			tm.id,
			tm.tenant_id,
			tm.status,
			COALESCE(r.code, ''),
			COALESCE(r.name, ''),
			u.created_at,
			u.updated_at
		FROM tenant_memberships tm
		JOIN users u ON u.id = tm.user_id
		LEFT JOIN user_roles ur ON ur.membership_id = tm.id
		LEFT JOIN roles r ON r.id = ur.role_id
		WHERE tm.status IN ('active', 'invited', 'suspended') AND u.status <> 'archived'
		ORDER BY u.display_name ASC, u.email ASC, tm.tenant_id ASC, r.code ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanUserDirectoryRows(rows)
}

func scanUserDirectoryRows(rows *sql.Rows) ([]userDirectoryRow, error) {
	byID := map[string]*userDirectoryRow{}
	ordered := []string{}
	for rows.Next() {
		var userID, email, displayName, status, membershipID, rowTenantID, tenantStatus, roleCode, roleName string
		var createdAt, updatedAt any
		if err := rows.Scan(&userID, &email, &displayName, &status, &membershipID, &rowTenantID, &tenantStatus, &roleCode, &roleName, &createdAt, &updatedAt); err != nil {
			return nil, err
		}
		key := membershipID
		user, exists := byID[key]
		if !exists {
			byID[key] = &userDirectoryRow{
				ID:           userID,
				Email:        email,
				DisplayName:  displayName,
				Status:       status,
				MembershipID: membershipID,
				TenantID:     rowTenantID,
				TenantStatus: tenantStatus,
				Roles:        []string{},
				RoleNames:    []string{},
				CreatedAt:    formatDBValue(createdAt),
				UpdatedAt:    formatDBValue(updatedAt),
			}
			user = byID[key]
			ordered = append(ordered, key)
		}
		if roleCode != "" && !stringSliceContains(user.Roles, roleCode) {
			user.Roles = append(user.Roles, roleCode)
		}
		if roleName != "" && !stringSliceContains(user.RoleNames, roleName) {
			user.RoleNames = append(user.RoleNames, roleName)
		}
	}
	if err := rows.Err(); err != nil && err != sql.ErrNoRows {
		return nil, err
	}
	users := make([]userDirectoryRow, 0, len(ordered))
	for _, id := range ordered {
		users = append(users, *byID[id])
	}
	return users, nil
}

func stringSliceContains(values []string, needle string) bool {
	for _, value := range values {
		if value == needle {
			return true
		}
	}
	return false
}
