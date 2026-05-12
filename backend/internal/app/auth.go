package app

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"morfoschools/backend/internal/platform/secure"
)

const (
	sessionCookieName = "morfoschools_session"
	csrfCookieName    = "morfoschools_csrf"
	sessionTTL        = 8 * time.Hour
)

type loginLimiter struct {
	mu       sync.Mutex
	attempts map[string][]time.Time
}

func newLoginLimiter() *loginLimiter { return &loginLimiter{attempts: map[string][]time.Time{}} }

func (l *loginLimiter) allow(key string, now time.Time) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	windowStart := now.Add(-10 * time.Minute)
	kept := l.attempts[key][:0]
	for _, t := range l.attempts[key] {
		if t.After(windowStart) {
			kept = append(kept, t)
		}
	}
	if len(kept) >= 8 {
		l.attempts[key] = kept
		return false
	}
	l.attempts[key] = append(kept, now)
	return true
}

type authUser struct {
	ID, Email, DisplayName, Status, PasswordHash string
	MustChangePassword                           bool
}
type sessionContext struct {
	SessionID           string    `json:"sessionId"`
	UserID              string    `json:"userId"`
	Email               string    `json:"email"`
	DisplayName         string    `json:"displayName"`
	TenantID            string    `json:"tenantId"`
	TenantCode          string    `json:"tenantCode"`
	TenantName          string    `json:"tenantName"`
	EffectiveTenantID   string    `json:"effectiveTenantId,omitempty"`
	EffectiveTenantCode string    `json:"effectiveTenantCode,omitempty"`
	EffectiveTenantName string    `json:"effectiveTenantName,omitempty"`
	Roles               []string  `json:"roles"`
	Permissions         []string  `json:"permissions"`
	ExpiresAt           time.Time `json:"expiresAt"`
}

func (a *App) registerAuthRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/api/v1/auth/login", a.login)
	mux.HandleFunc("/api/v1/auth/logout", a.logout)
	mux.HandleFunc("/api/v1/auth/me", a.me)
	mux.HandleFunc("/api/v1/auth/switch-tenant", a.switchTenant)
}

func (a *App) login(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, errPayload(r, "method_not_allowed", "Method not allowed"))
		return
	}
	var req struct{ TenantID, Email, Password string }
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, errPayload(r, "invalid_json", "Invalid JSON"))
		return
	}
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	req.TenantID = strings.TrimSpace(req.TenantID)
	if req.Email == "" || req.Password == "" {
		writeJSON(w, http.StatusBadRequest, errPayload(r, "validation_failed", "Email and password are required"))
		return
	}
	if a.deps.DB == nil {
		writeJSON(w, http.StatusServiceUnavailable, errPayload(r, "database_unavailable", "Database unavailable"))
		return
	}
	if !a.loginLimits.allow(req.Email+"|"+clientIP(r), time.Now()) {
		writeJSON(w, http.StatusTooManyRequests, errPayload(r, "rate_limited", "Too many login attempts"))
		return
	}
	user, err := a.findUserByEmail(r.Context(), req.Email)
	if err != nil || user.Status != "active" || !secure.VerifyPassword(user.PasswordHash, req.Password) {
		writeJSON(w, http.StatusUnauthorized, errPayload(r, "invalid_credentials", "Invalid credentials"))
		return
	}
	sessionToken, err := secure.NewToken(32)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, errPayload(r, "token_generation_failed", "Could not create session"))
		return
	}
	csrfToken, err := secure.NewToken(24)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, errPayload(r, "token_generation_failed", "Could not create session"))
		return
	}
	expires := time.Now().UTC().Add(sessionTTL)
	if err := a.createSession(r.Context(), user.ID, req.TenantID, secure.TokenHash(sessionToken), r.UserAgent(), clientIP(r), expires); err != nil {
		writeJSON(w, http.StatusUnauthorized, errPayload(r, "invalid_tenant_membership", "User is not active in requested tenant"))
		return
	}
	setCookie(w, sessionCookieName, sessionToken, true, expires, a.cfg.SecureCookies)
	setCookie(w, csrfCookieName, csrfToken, false, expires, a.cfg.SecureCookies)
	ctx, err := a.sessionByToken(r.Context(), sessionToken)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, errPayload(r, "session_lookup_failed", "Could not read session"))
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": map[string]any{"session": ctx, "csrfToken": csrfToken}})
}

func (a *App) logout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, errPayload(r, "method_not_allowed", "Method not allowed"))
		return
	}
	if !validCSRF(r) {
		writeJSON(w, http.StatusForbidden, errPayload(r, "csrf_failed", "CSRF token mismatch"))
		return
	}
	token := cookieValue(r, sessionCookieName)
	if token != "" {
		_ = a.revokeSession(r.Context(), secure.TokenHash(token))
	}
	expireCookie(w, sessionCookieName, true)
	expireCookie(w, csrfCookieName, false)
	writeJSON(w, http.StatusOK, map[string]any{"data": map[string]any{"ok": true}})
}

func (a *App) me(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, errPayload(r, "method_not_allowed", "Method not allowed"))
		return
	}
	ctx, err := a.sessionByToken(r.Context(), cookieValue(r, sessionCookieName))
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, errPayload(r, "unauthenticated", "Authentication required"))
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": map[string]any{"session": ctx}})
}

func (a *App) switchTenant(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, errPayload(r, "method_not_allowed", "Method not allowed"))
		return
	}
	if !validCSRF(r) {
		writeJSON(w, http.StatusForbidden, errPayload(r, "csrf_failed", "CSRF token mismatch"))
		return
	}
	token := cookieValue(r, sessionCookieName)
	ctx, err := a.sessionByToken(r.Context(), token)
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, errPayload(r, "unauthenticated", "Authentication required"))
		return
	}
	if !contains(ctx.Permissions, "platform:admin") && !contains(ctx.Permissions, "tenants:switch") {
		writeJSON(w, http.StatusForbidden, errPayload(r, "forbidden", "Missing tenant switch permission"))
		return
	}
	var req struct {
		TenantID string `json:"tenantId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.TenantID == "" {
		writeJSON(w, http.StatusBadRequest, errPayload(r, "validation_failed", "tenantId is required"))
		return
	}
	if err := a.setEffectiveTenant(r.Context(), secure.TokenHash(token), req.TenantID); err != nil {
		writeJSON(w, http.StatusBadRequest, errPayload(r, "tenant_switch_failed", "Could not switch tenant"))
		return
	}
	_ = a.recordAudit(r.Context(), req.TenantID, ctx.UserID, RequestIDFromContext(r.Context()), "tenant.switch", "tenant", req.TenantID)
	ctx, _ = a.sessionByToken(r.Context(), token)
	writeJSON(w, http.StatusOK, map[string]any{"data": map[string]any{"session": ctx}})
}

func errPayload(r *http.Request, code, message string) map[string]any {
	return map[string]any{"code": code, "error": code, "message": message, "requestId": RequestIDFromContext(r.Context())}
}

func setCookie(w http.ResponseWriter, name, value string, httpOnly bool, expires time.Time, secureCookie bool) {
	http.SetCookie(w, &http.Cookie{Name: name, Value: value, Path: "/", Expires: expires, HttpOnly: httpOnly, Secure: secureCookie, SameSite: http.SameSiteLaxMode})
}
func expireCookie(w http.ResponseWriter, name string, httpOnly bool) {
	http.SetCookie(w, &http.Cookie{Name: name, Value: "", Path: "/", Expires: time.Unix(0, 0), MaxAge: -1, HttpOnly: httpOnly, SameSite: http.SameSiteLaxMode})
}
func cookieValue(r *http.Request, name string) string {
	c, err := r.Cookie(name)
	if err != nil {
		return ""
	}
	return c.Value
}
func validCSRF(r *http.Request) bool {
	return cookieValue(r, csrfCookieName) != "" && r.Header.Get("X-CSRF-Token") == cookieValue(r, csrfCookieName)
}
func contains(xs []string, x string) bool {
	for _, v := range xs {
		if v == x {
			return true
		}
	}
	return false
}
func clientIP(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err == nil {
		return host
	}
	return r.RemoteAddr
}

func (a *App) findUserByEmail(ctx context.Context, email string) (authUser, error) {
	var u authUser
	err := a.deps.DB.QueryRowContext(ctx, `SELECT u.id::text, u.email, u.display_name, u.status, pc.password_hash, pc.must_change_password FROM users u JOIN password_credentials pc ON pc.user_id = u.id WHERE lower(u.email)=lower($1)`, email).Scan(&u.ID, &u.Email, &u.DisplayName, &u.Status, &u.PasswordHash, &u.MustChangePassword)
	return u, err
}
func (a *App) createSession(ctx context.Context, userID, tenantID, tokenHash, userAgent, ip string, expires time.Time) error {
	if tenantID == "" {
		res, err := a.deps.DB.ExecContext(ctx, `INSERT INTO sessions(user_id, token_hash, user_agent, ip_address, expires_at, effective_tenant_id)
			SELECT $1::uuid,$2,$3,NULLIF($4,'')::inet,$5,NULL
			WHERE EXISTS (SELECT 1 FROM platform_user_roles pur JOIN roles r ON r.id=pur.role_id WHERE pur.user_id=$1::uuid AND r.code='master_admin')`, userID, tokenHash, userAgent, ip, expires)
		if err != nil {
			return err
		}
		n, _ := res.RowsAffected()
		if n == 0 {
			return errors.New("platform role not found")
		}
		return nil
	}
	res, err := a.deps.DB.ExecContext(ctx, `INSERT INTO sessions(user_id, token_hash, user_agent, ip_address, expires_at, effective_tenant_id)
		SELECT $1::uuid,$3,$4,NULLIF($5,'')::inet,$6,$2::uuid
		WHERE EXISTS (SELECT 1 FROM tenant_memberships tm JOIN tenants t ON t.id=tm.tenant_id WHERE tm.user_id=$1::uuid AND tm.tenant_id=$2::uuid AND tm.status='active' AND t.status='active')`, userID, tenantID, tokenHash, userAgent, ip, expires)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return errors.New("tenant membership not found")
	}
	return nil
}
func (a *App) revokeSession(ctx context.Context, tokenHash string) error {
	_, err := a.deps.DB.ExecContext(ctx, `UPDATE sessions SET revoked_at=CURRENT_TIMESTAMP WHERE token_hash=$1`, tokenHash)
	return err
}
func (a *App) setEffectiveTenant(ctx context.Context, tokenHash, tenantID string) error {
	res, err := a.deps.DB.ExecContext(ctx, `UPDATE sessions SET effective_tenant_id=$2::uuid WHERE token_hash=$1 AND revoked_at IS NULL AND EXISTS (SELECT 1 FROM tenants WHERE id=$2::uuid AND status='active')`, tokenHash, tenantID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return errors.New("tenant not found")
	}
	return nil
}
func (a *App) recordAudit(ctx context.Context, tenantID, actorID, requestID, action, resourceType, resourceID string) error {
	_, err := a.deps.DB.ExecContext(ctx, `INSERT INTO audit_events(tenant_id, actor_user_id, request_id, action, resource_type, resource_id) VALUES ($1::uuid,$2::uuid,$3,$4,$5,$6)`, tenantID, actorID, requestID, action, resourceType, resourceID)
	return err
}
func (a *App) sessionByToken(ctx context.Context, token string) (sessionContext, error) {
	if token == "" || a.deps.DB == nil {
		return sessionContext{}, sql.ErrNoRows
	}
	var s sessionContext
	err := a.deps.DB.QueryRowContext(ctx, `SELECT s.id::text, u.id::text, u.email, u.display_name, tm.tenant_id::text, t.code, t.name, COALESCE(s.effective_tenant_id::text,''), COALESCE(et.code,''), COALESCE(et.name,''), s.expires_at
		FROM sessions s
		JOIN users u ON u.id=s.user_id
		JOIN tenant_memberships tm ON tm.user_id=u.id AND tm.status='active' AND tm.tenant_id=COALESCE(s.effective_tenant_id, tm.tenant_id)
		JOIN tenants t ON t.id=tm.tenant_id AND t.status='active'
		LEFT JOIN tenants et ON et.id=s.effective_tenant_id
		WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at > CURRENT_TIMESTAMP AND u.status='active'
		ORDER BY tm.created_at ASC LIMIT 1`, secure.TokenHash(token)).Scan(&s.SessionID, &s.UserID, &s.Email, &s.DisplayName, &s.TenantID, &s.TenantCode, &s.TenantName, &s.EffectiveTenantID, &s.EffectiveTenantCode, &s.EffectiveTenantName, &s.ExpiresAt)
	if errors.Is(err, sql.ErrNoRows) {
		err = a.deps.DB.QueryRowContext(ctx, `SELECT s.id::text, u.id::text, u.email, u.display_name, COALESCE(t.id::text,''), COALESCE(t.code,''), COALESCE(t.name,''), COALESCE(s.effective_tenant_id::text,''), COALESCE(t.code,''), COALESCE(t.name,''), s.expires_at
			FROM sessions s
			JOIN users u ON u.id=s.user_id
			LEFT JOIN tenants t ON t.id=s.effective_tenant_id AND t.status='active'
			WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at > CURRENT_TIMESTAMP AND u.status='active'
			AND EXISTS (SELECT 1 FROM platform_user_roles pur JOIN roles r ON r.id=pur.role_id WHERE pur.user_id=u.id AND r.code='master_admin')`, secure.TokenHash(token)).Scan(&s.SessionID, &s.UserID, &s.Email, &s.DisplayName, &s.TenantID, &s.TenantCode, &s.TenantName, &s.EffectiveTenantID, &s.EffectiveTenantCode, &s.EffectiveTenantName, &s.ExpiresAt)
	}
	if err != nil {
		return s, err
	}
	roles, perms, err := a.rolesAndPermissions(ctx, s.UserID, s.TenantID)
	if err != nil {
		return s, err
	}
	s.Roles = roles
	s.Permissions = perms
	return s, nil
}
func (a *App) rolesAndPermissions(ctx context.Context, userID, tenantID string) ([]string, []string, error) {
	query := `SELECT DISTINCT r.code, p.code FROM platform_user_roles pur JOIN roles r ON r.id=pur.role_id LEFT JOIN role_permissions rp ON rp.role_id=r.id LEFT JOIN permissions p ON p.id=rp.permission_id WHERE pur.user_id=$1`
	args := []any{userID}
	if tenantID != "" {
		query = `SELECT DISTINCT r.code, p.code FROM platform_user_roles pur JOIN roles r ON r.id=pur.role_id LEFT JOIN role_permissions rp ON rp.role_id=r.id LEFT JOIN permissions p ON p.id=rp.permission_id WHERE pur.user_id=$1
			UNION
			SELECT DISTINCT r.code, p.code FROM tenant_memberships tm JOIN user_roles ur ON ur.membership_id=tm.id JOIN roles r ON r.id=ur.role_id LEFT JOIN role_permissions rp ON rp.role_id=r.id LEFT JOIN permissions p ON p.id=rp.permission_id WHERE tm.user_id=$1 AND tm.tenant_id=$2 AND tm.status='active'`
		args = []any{userID, tenantID}
	}
	rows, err := a.deps.DB.QueryContext(ctx, query+` ORDER BY 1,2`, args...)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()
	roleSet, permSet := map[string]bool{}, map[string]bool{}
	for rows.Next() {
		var role string
		var perm sql.NullString
		if err := rows.Scan(&role, &perm); err != nil {
			return nil, nil, err
		}
		roleSet[role] = true
		if perm.Valid {
			permSet[perm.String] = true
		}
	}
	roles, perms := []string{}, []string{}
	for r := range roleSet {
		roles = append(roles, r)
	}
	for p := range permSet {
		perms = append(perms, p)
	}
	return roles, perms, rows.Err()
}
