package app

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	_ "modernc.org/sqlite"
)

func TestUsersDirectoryRequiresAuthenticatedSessionBeforeDatabaseAccess(t *testing.T) {
	a := New(Config{}, Dependencies{})
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/users", nil)

	a.Handler().ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized || !strings.Contains(rec.Body.String(), `"code":"unauthenticated"`) {
		t.Fatalf("expected users directory to require auth before DB access, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestUsersDirectoryRequiresUsersReadPermission(t *testing.T) {
	a := New(Config{}, Dependencies{})
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/users", nil)
	req = req.WithContext(WithSubject(req.Context(), Subject{UserID: "u1", TenantID: "t1", Permissions: []string{"learning:access"}}))

	a.requireAnyPermission("users:read")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("handler must not run without users:read")
	})).ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden || !strings.Contains(rec.Body.String(), `"code":"forbidden"`) {
		t.Fatalf("expected users:read RBAC denial, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestListUsersReturnsOnlyEffectiveTenantUsersWithRoles(t *testing.T) {
	db := openUsersTestDB(t)
	seedUsersDirectoryFixture(t, db)
	a := New(Config{}, Dependencies{DB: db})
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/users", nil)
	req = req.WithContext(WithSubject(req.Context(), Subject{
		UserID:            "10000000-0000-7000-8000-000000000001",
		TenantID:          "00000000-0000-7000-8000-000000000101",
		EffectiveTenantID: "00000000-0000-7000-8000-000000000101",
		Permissions:       []string{"users:read"},
	}))

	a.listUsers(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d body=%s", rec.Code, rec.Body.String())
	}
	var payload struct {
		Data struct {
			Users []struct {
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
			} `json:"users"`
		} `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode users response: %v body=%s", err, rec.Body.String())
	}
	if len(payload.Data.Users) != 2 {
		t.Fatalf("expected only two tenant users, got %d: %#v", len(payload.Data.Users), payload.Data.Users)
	}
	if payload.Data.Users[0].Email != "admin@morfoschools.local" || payload.Data.Users[0].Roles[0] != "school_admin" || payload.Data.Users[0].TenantStatus != "active" {
		t.Fatalf("unexpected first user: %#v", payload.Data.Users[0])
	}
	if payload.Data.Users[1].Email != "teacher@morfoschools.local" || payload.Data.Users[1].Roles[0] != "teacher" {
		t.Fatalf("unexpected second user: %#v", payload.Data.Users[1])
	}
	for _, user := range payload.Data.Users {
		if user.Email == "other@morfoschools.local" {
			t.Fatalf("list leaked user from another tenant: %#v", user)
		}
		if user.MembershipID == "" || user.TenantID != "00000000-0000-7000-8000-000000000101" || user.CreatedAt == "" || user.UpdatedAt == "" {
			t.Fatalf("user is missing tenant metadata/timestamps: %#v", user)
		}
	}
}

func TestListUsersRequiresTenantContext(t *testing.T) {
	db := openUsersTestDB(t)
	a := New(Config{}, Dependencies{DB: db})
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/users", nil)
	req = req.WithContext(WithSubject(req.Context(), Subject{UserID: "platform", Permissions: []string{"users:read"}}))

	a.listUsers(rec, req)

	if rec.Code != http.StatusBadRequest || !strings.Contains(rec.Body.String(), `"code":"tenant_context_required"`) {
		t.Fatalf("expected tenant context to be required, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestCreateUserCreatesTenantMembershipRolesAndAudit(t *testing.T) {
	db := openUsersTestDB(t)
	seedUsersDirectoryFixture(t, db)
	a := New(Config{}, Dependencies{DB: db})
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/users", strings.NewReader(`{"email":"new.teacher@morfoschools.local","displayName":"New Teacher","roleCodes":["teacher"]}`))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(WithSubject(req.Context(), Subject{
		UserID:            "10000000-0000-7000-8000-000000000001",
		TenantID:          "00000000-0000-7000-8000-000000000101",
		EffectiveTenantID: "00000000-0000-7000-8000-000000000101",
		Permissions:       []string{"users:write"},
	}))

	a.createUser(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d body=%s", rec.Code, rec.Body.String())
	}
	var membershipID, status, roleCode string
	if err := db.QueryRow(`SELECT tm.id, tm.status, r.code FROM users u JOIN tenant_memberships tm ON tm.user_id=u.id JOIN user_roles ur ON ur.membership_id=tm.id JOIN roles r ON r.id=ur.role_id WHERE u.email='new.teacher@morfoschools.local'`).Scan(&membershipID, &status, &roleCode); err != nil {
		t.Fatalf("created user membership/role missing: %v", err)
	}
	if membershipID == "" || status != "active" || roleCode != "teacher" {
		t.Fatalf("unexpected created membership: id=%q status=%q role=%q", membershipID, status, roleCode)
	}
	var auditCount int
	if err := db.QueryRow(`SELECT COUNT(*) FROM audit_events WHERE tenant_id='00000000-0000-7000-8000-000000000101' AND actor_user_id='10000000-0000-7000-8000-000000000001' AND action='users.create'`).Scan(&auditCount); err != nil {
		t.Fatalf("audit lookup failed: %v", err)
	}
	if auditCount != 1 {
		t.Fatalf("expected one users.create audit event, got %d", auditCount)
	}
}

func TestCreateUserRejectsRoleOutsideEffectiveTenant(t *testing.T) {
	db := openUsersTestDB(t)
	seedUsersDirectoryFixture(t, db)
	a := New(Config{}, Dependencies{DB: db})
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/users", strings.NewReader(`{"email":"bad@morfoschools.local","displayName":"Bad User","roleCodes":["master_admin"]}`))
	req = req.WithContext(WithSubject(req.Context(), Subject{
		UserID:            "10000000-0000-7000-8000-000000000001",
		TenantID:          "00000000-0000-7000-8000-000000000101",
		EffectiveTenantID: "00000000-0000-7000-8000-000000000101",
		Permissions:       []string{"users:write"},
	}))

	a.createUser(rec, req)

	if rec.Code != http.StatusBadRequest || !strings.Contains(rec.Body.String(), `"code":"role_not_found"`) {
		t.Fatalf("expected tenant-scoped role validation, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func openUsersTestDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	_, err = db.Exec(`
		CREATE TABLE users (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-7000-8000-' || lower(hex(randomblob(6)))), email TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
		CREATE TABLE tenant_memberships (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-7000-8000-' || lower(hex(randomblob(6)))), tenant_id TEXT NOT NULL, user_id TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, UNIQUE (tenant_id, user_id));
		CREATE TABLE roles (id TEXT PRIMARY KEY, tenant_id TEXT, code TEXT NOT NULL, name TEXT NOT NULL, description TEXT NOT NULL, is_system TEXT NOT NULL, created_at TEXT, updated_at TEXT, UNIQUE (tenant_id, code));
		CREATE TABLE user_roles (membership_id TEXT NOT NULL, role_id TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (membership_id, role_id));
		CREATE TABLE audit_events (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-7000-8000-' || lower(hex(randomblob(6)))), tenant_id TEXT, actor_user_id TEXT, request_id TEXT NOT NULL DEFAULT '', action TEXT NOT NULL, resource_type TEXT NOT NULL, resource_id TEXT NOT NULL DEFAULT '', metadata TEXT NOT NULL DEFAULT '{}', created_at TEXT DEFAULT CURRENT_TIMESTAMP);
	`)
	if err != nil {
		t.Fatalf("create users test schema: %v", err)
	}
	return db
}

func seedUsersDirectoryFixture(t *testing.T, db *sql.DB) {
	t.Helper()
	_, err := db.Exec(`
		INSERT INTO users (id, email, display_name, status, created_at, updated_at) VALUES
			('10000000-0000-7000-8000-000000000001', 'admin@morfoschools.local', 'School Admin', 'active', '2026-01-01T00:00:00Z', '2026-01-02T00:00:00Z'),
			('10000000-0000-7000-8000-000000000002', 'teacher@morfoschools.local', 'Teacher Demo', 'active', '2026-01-03T00:00:00Z', '2026-01-04T00:00:00Z'),
			('10000000-0000-7000-8000-000000000003', 'other@morfoschools.local', 'Other Tenant', 'active', '2026-01-05T00:00:00Z', '2026-01-06T00:00:00Z');
		INSERT INTO roles (id, tenant_id, code, name, description, is_system, created_at, updated_at) VALUES
			('20000000-0000-7000-8000-000000000001', '00000000-0000-7000-8000-000000000101', 'school_admin', 'School Admin', '', 'true', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
			('20000000-0000-7000-8000-000000000002', '00000000-0000-7000-8000-000000000101', 'teacher', 'Teacher', '', 'true', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
			('20000000-0000-7000-8000-000000000003', '00000000-0000-7000-8000-000000000999', 'school_admin', 'Other School Admin', '', 'true', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z');
		INSERT INTO tenant_memberships (id, tenant_id, user_id, status, created_at, updated_at) VALUES
			('30000000-0000-7000-8000-000000000001', '00000000-0000-7000-8000-000000000101', '10000000-0000-7000-8000-000000000001', 'active', '2026-01-01T00:00:00Z', '2026-01-02T00:00:00Z'),
			('30000000-0000-7000-8000-000000000002', '00000000-0000-7000-8000-000000000101', '10000000-0000-7000-8000-000000000002', 'active', '2026-01-03T00:00:00Z', '2026-01-04T00:00:00Z'),
			('30000000-0000-7000-8000-000000000003', '00000000-0000-7000-8000-000000000999', '10000000-0000-7000-8000-000000000003', 'active', '2026-01-05T00:00:00Z', '2026-01-06T00:00:00Z');
		INSERT INTO user_roles (membership_id, role_id, created_at) VALUES
			('30000000-0000-7000-8000-000000000001', '20000000-0000-7000-8000-000000000001', '2026-01-01T00:00:00Z'),
			('30000000-0000-7000-8000-000000000002', '20000000-0000-7000-8000-000000000002', '2026-01-01T00:00:00Z'),
			('30000000-0000-7000-8000-000000000003', '20000000-0000-7000-8000-000000000003', '2026-01-01T00:00:00Z');
	`)
	if err != nil {
		t.Fatalf("seed users directory fixture: %v", err)
	}
}
