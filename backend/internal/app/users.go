package app

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
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
}

func (a *App) usersCollection(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		a.requireAnyPermission("users:read")(http.HandlerFunc(a.listUsers)).ServeHTTP(w, r)
	case http.MethodPost:
		a.requireAnyPermission("users:write")(http.HandlerFunc(a.createUser)).ServeHTTP(w, r)
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
		writeJSON(w, http.StatusBadRequest, errPayload(r, "tenant_context_required", "Tenant context is required"))
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

func (a *App) createUser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
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
		var userID, email, displayName, status, membershipID, rowTenantID, tenantStatus, roleCode, roleName, createdAt, updatedAt string
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
				CreatedAt:    createdAt,
				UpdatedAt:    updatedAt,
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

func stringSliceContains(values []string, needle string) bool {
	for _, value := range values {
		if value == needle {
			return true
		}
	}
	return false
}
