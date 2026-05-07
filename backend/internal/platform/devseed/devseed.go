package devseed

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"morfoschools/backend/internal/platform/secure"
)

const (
	DemoTenantID   = "11111111-1111-7111-8111-111111111111"
	DemoTenantCode = "morfoschools-demo"
	DevPassword    = "morfosis123"
)

type Config struct {
	Enabled bool
	AppEnv  string
	Driver  string
}

type Permission struct {
	ID          string
	Code        string
	Description string
}

type Role struct {
	ID          string
	Code        string
	Name        string
	Description string
	Permissions []string
}

type User struct {
	ID          string
	Email       string
	DisplayName string
	RoleCode    string
}

func Permissions() []Permission {
	return []Permission{
		{ID: "20000000-0000-7000-8000-000000000001", Code: "platform:admin", Description: "Manage platform bootstrap and cross-tenant support."},
		{ID: "20000000-0000-7000-8000-000000000002", Code: "tenant:admin", Description: "Manage tenant settings and users."},
		{ID: "20000000-0000-7000-8000-000000000003", Code: "academic:manage", Description: "Manage academic structure and courses."},
		{ID: "20000000-0000-7000-8000-000000000004", Code: "courses:teach", Description: "Teach assigned courses."},
		{ID: "20000000-0000-7000-8000-000000000005", Code: "learning:access", Description: "Access student learning surfaces."},
		{ID: "20000000-0000-7000-8000-000000000006", Code: "guardian:view", Description: "View guardian-facing student progress."},
		{ID: "20000000-0000-7000-8000-000000000007", Code: "finance:manage", Description: "Manage finance placeholders."},
		{ID: "20000000-0000-7000-8000-000000000008", Code: "exams:proctor", Description: "Proctor exams and monitor sessions."},
		{ID: "20000000-0000-7000-8000-000000000009", Code: "content:review", Description: "Review learning content."},
		{ID: "20000000-0000-7000-8000-000000000010", Code: "tenants:read", Description: "Read tenant directory for platform support."},
		{ID: "20000000-0000-7000-8000-000000000011", Code: "tenants:switch", Description: "Switch effective tenant context for audited support."},
		{ID: "20000000-0000-7000-8000-000000000012", Code: "users:read", Description: "Read tenant user directory."},
		{ID: "20000000-0000-7000-8000-000000000013", Code: "users:write", Description: "Create, update, deactivate, and assign tenant users."},
	}
}

func Roles() []Role {
	return []Role{
		{ID: "30000000-0000-7000-8000-000000000001", Code: "master_admin", Name: "Master Admin", Description: "Development platform administrator.", Permissions: []string{"platform:admin", "tenant:admin", "tenants:read", "tenants:switch", "users:read", "users:write"}},
		{ID: "30000000-0000-7000-8000-000000000002", Code: "school_admin", Name: "School Admin", Description: "Development school administrator.", Permissions: []string{"tenant:admin", "academic:manage", "users:read", "users:write"}},
		{ID: "30000000-0000-7000-8000-000000000003", Code: "academic_admin", Name: "Academic Admin", Description: "Development academic administrator.", Permissions: []string{"academic:manage"}},
		{ID: "30000000-0000-7000-8000-000000000004", Code: "teacher", Name: "Teacher", Description: "Development teacher.", Permissions: []string{"courses:teach"}},
		{ID: "30000000-0000-7000-8000-000000000005", Code: "student", Name: "Student", Description: "Development student.", Permissions: []string{"learning:access"}},
		{ID: "30000000-0000-7000-8000-000000000011", Code: "parent", Name: "Parent", Description: "Development parent/guardian.", Permissions: []string{"guardian:view"}},
		{ID: "30000000-0000-7000-8000-000000000012", Code: "finance", Name: "Finance", Description: "Development finance staff placeholder.", Permissions: []string{"finance:manage"}},
		{ID: "30000000-0000-7000-8000-000000000013", Code: "proctor", Name: "Proctor", Description: "Development exam proctor.", Permissions: []string{"exams:proctor"}},
		{ID: "30000000-0000-7000-8000-000000000010", Code: "content_reviewer", Name: "Content Reviewer", Description: "Development content reviewer.", Permissions: []string{"content:review"}},
	}
}

func devPasswordHash() string {
	return secure.FormatPasswordHash(DevPassword, []byte("morfoschools-dev"), 210000)
}

func Users() []User {
	return []User{
		{ID: "40000000-0000-7000-8000-000000000001", Email: "master.admin@morfoschools.local", DisplayName: "Master Admin", RoleCode: "master_admin"},
		{ID: "40000000-0000-7000-8000-000000000002", Email: "school.admin@morfoschools.local", DisplayName: "School Admin", RoleCode: "school_admin"},
		{ID: "40000000-0000-7000-8000-000000000003", Email: "academic.admin@morfoschools.local", DisplayName: "Academic Admin", RoleCode: "academic_admin"},
		{ID: "40000000-0000-7000-8000-000000000004", Email: "teacher@morfoschools.local", DisplayName: "Teacher Demo", RoleCode: "teacher"},
		{ID: "40000000-0000-7000-8000-000000000005", Email: "student@morfoschools.local", DisplayName: "Student Demo", RoleCode: "student"},
		{ID: "40000000-0000-7000-8000-000000000006", Email: "parent@morfoschools.local", DisplayName: "Parent Demo", RoleCode: "parent"},
		{ID: "40000000-0000-7000-8000-000000000007", Email: "finance@morfoschools.local", DisplayName: "Finance Demo", RoleCode: "finance"},
		{ID: "40000000-0000-7000-8000-000000000008", Email: "proctor@morfoschools.local", DisplayName: "Proctor Demo", RoleCode: "proctor"},
		{ID: "40000000-0000-7000-8000-000000000010", Email: "reviewer@morfoschools.local", DisplayName: "Content Reviewer Demo", RoleCode: "content_reviewer"},
	}
}

func Run(ctx context.Context, db *sql.DB, cfg Config) error {
	if db == nil {
		return errors.New("devseed requires database")
	}
	if !cfg.Enabled && cfg.AppEnv == "production" {
		return errors.New("refusing to run development seed in production without explicit seed mode")
	}
	if !cfg.Enabled {
		return nil
	}
	dialect := dialectForDriver(cfg.Driver)
	if err := seedTenant(ctx, db, dialect); err != nil {
		return err
	}
	if err := seedPermissions(ctx, db, dialect); err != nil {
		return err
	}
	if err := seedRoles(ctx, db, dialect); err != nil {
		return err
	}
	if err := seedRolePermissions(ctx, db, dialect); err != nil {
		return err
	}
	if err := seedUsers(ctx, db, dialect); err != nil {
		return err
	}
	return nil
}

type sqlDialect struct {
	placeholder func(int) string
	now         string
	boolTrue    string
}

func dialectForDriver(driver string) sqlDialect {
	if driver == "pgx" || driver == "postgres" || driver == "postgresql" {
		return sqlDialect{placeholder: func(i int) string { return fmt.Sprintf("$%d", i) }, now: "CURRENT_TIMESTAMP", boolTrue: "TRUE"}
	}
	return sqlDialect{placeholder: func(int) string { return "?" }, now: "CURRENT_TIMESTAMP", boolTrue: "'true'"}
}

func execDialect(ctx context.Context, db *sql.DB, dialect sqlDialect, query string, args ...any) (sql.Result, error) {
	if dialect.placeholder(1) != "?" {
		for i := 1; strings.Contains(query, "?"); i++ {
			query = strings.Replace(query, "?", dialect.placeholder(i), 1)
		}
	}
	query = strings.ReplaceAll(query, "'true'", dialect.boolTrue)
	return db.ExecContext(ctx, query, args...)
}

func seedTenant(ctx context.Context, db *sql.DB, dialect sqlDialect) error {
	_, err := execDialect(ctx, db, dialect, `INSERT INTO tenants (id, code, name, status, created_at, updated_at) VALUES (?, ?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT (code) DO UPDATE SET name = excluded.name, status = excluded.status, updated_at = CURRENT_TIMESTAMP`, DemoTenantID, DemoTenantCode, "Morfoschools Demo")
	if err != nil {
		return fmt.Errorf("seed tenant: %w", err)
	}
	_, err = execDialect(ctx, db, dialect, `INSERT INTO tenant_theme_settings (tenant_id, preset, primary_color, accent_color, logo_url, version, created_at, updated_at) VALUES (?, 'morfoschools-default', 'oklch(0.52 0.16 250)', 'oklch(0.68 0.18 70)', '', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT (tenant_id) DO UPDATE SET preset = excluded.preset, primary_color = excluded.primary_color, accent_color = excluded.accent_color, updated_at = CURRENT_TIMESTAMP`, DemoTenantID)
	if err != nil {
		return fmt.Errorf("seed tenant theme: %w", err)
	}
	return nil
}

func seedPermissions(ctx context.Context, db *sql.DB, dialect sqlDialect) error {
	for _, permission := range Permissions() {
		_, err := execDialect(ctx, db, dialect, `INSERT INTO permissions (id, code, description, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT (code) DO UPDATE SET description = excluded.description`, permission.ID, permission.Code, permission.Description)
		if err != nil {
			return fmt.Errorf("seed permission %s: %w", permission.Code, err)
		}
	}
	return nil
}

func seedRoles(ctx context.Context, db *sql.DB, dialect sqlDialect) error {
	for _, role := range Roles() {
		_, err := execDialect(ctx, db, dialect, `INSERT INTO roles (id, tenant_id, code, name, description, is_system, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'true', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT (tenant_id, code) DO UPDATE SET name = excluded.name, description = excluded.description, updated_at = CURRENT_TIMESTAMP`, role.ID, DemoTenantID, role.Code, role.Name, role.Description)
		if err != nil {
			return fmt.Errorf("seed role %s: %w", role.Code, err)
		}
	}
	return nil
}

func seedRolePermissions(ctx context.Context, db *sql.DB, dialect sqlDialect) error {
	for _, role := range Roles() {
		for _, permissionCode := range role.Permissions {
			_, err := execDialect(ctx, db, dialect, `INSERT INTO role_permissions (role_id, permission_id, created_at) SELECT r.id, p.id, CURRENT_TIMESTAMP FROM roles r JOIN permissions p ON p.code = ? WHERE r.tenant_id = ? AND r.code = ? ON CONFLICT (role_id, permission_id) DO NOTHING`, permissionCode, DemoTenantID, role.Code)
			if err != nil {
				return fmt.Errorf("seed role permission %s:%s: %w", role.Code, permissionCode, err)
			}
		}
	}
	return nil
}

func seedUsers(ctx context.Context, db *sql.DB, dialect sqlDialect) error {
	rolesByCode := map[string]string{}
	for _, role := range Roles() {
		rolesByCode[role.Code] = role.ID
	}
	for _, user := range Users() {
		_, err := execDialect(ctx, db, dialect, `INSERT INTO users (id, email, display_name, status, created_at, updated_at) VALUES (?, ?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT (id) DO UPDATE SET email = excluded.email, display_name = excluded.display_name, status = excluded.status, updated_at = CURRENT_TIMESTAMP`, user.ID, user.Email, user.DisplayName)
		if err != nil {
			return fmt.Errorf("seed user %s: %w", user.Email, err)
		}
		_, err = execDialect(ctx, db, dialect, `INSERT INTO password_credentials (user_id, password_hash, must_change_password, password_changed_at, created_at, updated_at) VALUES (?, ?, 'true', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT (user_id) DO UPDATE SET password_hash = excluded.password_hash, must_change_password = excluded.must_change_password, updated_at = CURRENT_TIMESTAMP`, user.ID, devPasswordHash())
		if err != nil {
			return fmt.Errorf("seed credential %s: %w", user.Email, err)
		}
		if user.RoleCode == "master_admin" {
			_, err = execDialect(ctx, db, dialect, `DELETE FROM tenant_memberships WHERE user_id = ?`, user.ID)
			if err != nil {
				return fmt.Errorf("remove master default membership %s: %w", user.Email, err)
			}
			_, err = execDialect(ctx, db, dialect, `INSERT INTO platform_user_roles (user_id, role_id, created_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT (user_id, role_id) DO NOTHING`, user.ID, rolesByCode[user.RoleCode])
			if err != nil {
				return fmt.Errorf("seed platform user role %s: %w", user.Email, err)
			}
			continue
		}
		membershipID := strings.Replace(user.ID, "40000000-", "50000000-", 1)
		_, err = execDialect(ctx, db, dialect, `INSERT INTO tenant_memberships (id, tenant_id, user_id, status, created_at, updated_at) VALUES (?, ?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT (tenant_id, user_id) DO UPDATE SET status = excluded.status, updated_at = CURRENT_TIMESTAMP`, membershipID, DemoTenantID, user.ID)
		if err != nil {
			return fmt.Errorf("seed membership %s: %w", user.Email, err)
		}
		_, err = execDialect(ctx, db, dialect, `INSERT INTO user_roles (membership_id, role_id, created_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT (membership_id, role_id) DO NOTHING`, membershipID, rolesByCode[user.RoleCode])
		if err != nil {
			return fmt.Errorf("seed user role %s: %w", user.Email, err)
		}
	}
	return nil
}
