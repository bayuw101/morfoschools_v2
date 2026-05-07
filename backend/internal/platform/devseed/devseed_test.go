package devseed

import (
	"database/sql"
	"testing"

	_ "modernc.org/sqlite"
)

func TestRunSeedsDeterministicDevelopmentIdentityGraphIdempotently(t *testing.T) {
	db := openSeedTestDB(t)
	ctx := t.Context()

	if err := Run(ctx, db, Config{Enabled: true, AppEnv: "development"}); err != nil {
		t.Fatalf("first seed run failed: %v", err)
	}
	if err := Run(ctx, db, Config{Enabled: true, AppEnv: "development"}); err != nil {
		t.Fatalf("second seed run should be idempotent: %v", err)
	}

	assertCount(t, db, "tenants", 1)
	assertCount(t, db, "tenant_theme_settings", 1)
	assertCount(t, db, "permissions", len(Permissions()))
	assertCount(t, db, "roles", len(Roles()))
	assertCount(t, db, "users", len(Users()))
	assertCount(t, db, "password_credentials", len(Users()))
	assertCount(t, db, "tenant_memberships", len(Users())-1)
	assertCount(t, db, "user_roles", len(Users())-1)
	assertCount(t, db, "platform_user_roles", 1)

	var tenantID, tenantCode string
	if err := db.QueryRow(`SELECT id, code FROM tenants`).Scan(&tenantID, &tenantCode); err != nil {
		t.Fatalf("read tenant: %v", err)
	}
	if tenantID != DemoTenantID || tenantCode != DemoTenantCode {
		t.Fatalf("unexpected tenant identity: id=%s code=%s", tenantID, tenantCode)
	}

	assertNoDuplicate(t, db, "tenants", "code")
	assertNoDuplicate(t, db, "users", "email")
	assertNoDuplicate(t, db, "permissions", "code")
	assertNoDuplicate(t, db, "roles", "tenant_id || ':' || code")
	assertNoDuplicate(t, db, "tenant_memberships", "tenant_id || ':' || user_id")
	assertNoDuplicate(t, db, "user_roles", "membership_id || ':' || role_id")

	for _, user := range Users() {
		if user.RoleCode == "master_admin" {
			var roleCode, mustChange string
			if err := db.QueryRow(`
				SELECT r.code, pc.must_change_password
				FROM users u
				JOIN password_credentials pc ON pc.user_id = u.id
				JOIN platform_user_roles pur ON pur.user_id = u.id
				JOIN roles r ON r.id = pur.role_id
				WHERE u.email = ?`, user.Email).Scan(&roleCode, &mustChange); err != nil {
				t.Fatalf("read platform user graph for %s: %v", user.Email, err)
			}
			if roleCode != user.RoleCode || mustChange != "true" {
				t.Fatalf("unexpected platform user graph for %s: role=%s mustChange=%s", user.Email, roleCode, mustChange)
			}
			var memberships int
			if err := db.QueryRow(`SELECT COUNT(*) FROM tenant_memberships tm JOIN users u ON u.id = tm.user_id WHERE u.email = ?`, user.Email).Scan(&memberships); err != nil {
				t.Fatalf("count master memberships: %v", err)
			}
			if memberships != 0 {
				t.Fatalf("master_admin must not have default tenant membership, got %d", memberships)
			}
			continue
		}
		var membershipTenantID, roleCode, mustChange string
		if err := db.QueryRow(`
			SELECT tm.tenant_id, r.code, pc.must_change_password
			FROM users u
			JOIN password_credentials pc ON pc.user_id = u.id
			JOIN tenant_memberships tm ON tm.user_id = u.id
			JOIN user_roles ur ON ur.membership_id = tm.id
			JOIN roles r ON r.id = ur.role_id
			WHERE u.email = ?`, user.Email).Scan(&membershipTenantID, &roleCode, &mustChange); err != nil {
			t.Fatalf("read user graph for %s: %v", user.Email, err)
		}
		if membershipTenantID != DemoTenantID || roleCode != user.RoleCode || mustChange != "true" {
			t.Fatalf("unexpected user graph for %s: tenant=%s role=%s mustChange=%s", user.Email, membershipTenantID, roleCode, mustChange)
		}
	}
}

func TestSeedRolesMatchFrontendContract(t *testing.T) {
	allowed := map[string]bool{
		"master_admin":     true,
		"school_admin":     true,
		"academic_admin":   true,
		"teacher":          true,
		"student":          true,
		"parent":           true,
		"finance":          true,
		"proctor":          true,
		"content_reviewer": true,
	}
	seen := map[string]bool{}
	for _, role := range Roles() {
		if !allowed[role.Code] {
			t.Fatalf("seed role %q is not in frontend auth role contract", role.Code)
		}
		if seen[role.Code] {
			t.Fatalf("duplicate seed role code %q", role.Code)
		}
		seen[role.Code] = true
	}
	if len(seen) != len(allowed) {
		t.Fatalf("expected %d seed roles, got %d: %#v", len(allowed), len(seen), seen)
	}
}

func TestRunRefusesProductionUnlessExplicitlyEnabled(t *testing.T) {
	db := openSeedTestDB(t)
	err := Run(t.Context(), db, Config{Enabled: false, AppEnv: "production"})
	if err == nil {
		t.Fatalf("expected production seed without explicit enablement to be refused")
	}
	assertCount(t, db, "tenants", 0)
}

func openSeedTestDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	_, err = db.Exec(`
		CREATE TABLE tenants (id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT, updated_at TEXT);
		CREATE TABLE tenant_theme_settings (tenant_id TEXT PRIMARY KEY, preset TEXT NOT NULL, primary_color TEXT NOT NULL, accent_color TEXT NOT NULL, logo_url TEXT NOT NULL, version INTEGER NOT NULL, created_at TEXT, updated_at TEXT);
		CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT, updated_at TEXT);
		CREATE TABLE password_credentials (user_id TEXT PRIMARY KEY, password_hash TEXT NOT NULL, must_change_password TEXT NOT NULL, password_changed_at TEXT, created_at TEXT, updated_at TEXT);
		CREATE TABLE tenant_memberships (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, user_id TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT, updated_at TEXT, UNIQUE (tenant_id, user_id));
		CREATE TABLE roles (id TEXT PRIMARY KEY, tenant_id TEXT, code TEXT NOT NULL, name TEXT NOT NULL, description TEXT NOT NULL, is_system TEXT NOT NULL, created_at TEXT, updated_at TEXT, UNIQUE (tenant_id, code));
		CREATE TABLE permissions (id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, description TEXT NOT NULL, created_at TEXT);
		CREATE TABLE role_permissions (role_id TEXT NOT NULL, permission_id TEXT NOT NULL, created_at TEXT, PRIMARY KEY (role_id, permission_id));
		CREATE TABLE user_roles (membership_id TEXT NOT NULL, role_id TEXT NOT NULL, created_at TEXT, PRIMARY KEY (membership_id, role_id));
		CREATE TABLE platform_user_roles (user_id TEXT NOT NULL, role_id TEXT NOT NULL, created_at TEXT, PRIMARY KEY (user_id, role_id));
	`)
	if err != nil {
		t.Fatalf("create schema: %v", err)
	}
	return db
}

func assertCount(t *testing.T, db *sql.DB, table string, expected int) {
	t.Helper()
	var got int
	if err := db.QueryRow(`SELECT COUNT(*) FROM ` + table).Scan(&got); err != nil {
		t.Fatalf("count %s: %v", table, err)
	}
	if got != expected {
		t.Fatalf("expected %s count %d, got %d", table, expected, got)
	}
}

func assertNoDuplicate(t *testing.T, db *sql.DB, table, expr string) {
	t.Helper()
	var duplicates int
	if err := db.QueryRow(`SELECT COUNT(*) FROM (SELECT ` + expr + ` AS key, COUNT(*) c FROM ` + table + ` GROUP BY key HAVING c > 1)`).Scan(&duplicates); err != nil {
		t.Fatalf("check duplicates for %s: %v", table, err)
	}
	if duplicates != 0 {
		t.Fatalf("expected no duplicates for %s by %s, got %d", table, expr, duplicates)
	}
}
