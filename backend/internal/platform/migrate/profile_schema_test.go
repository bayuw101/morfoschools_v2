package migrate

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestUserProfilesMigrationContract(t *testing.T) {
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("cannot resolve test path")
	}
	content, err := os.ReadFile(filepath.Join(filepath.Dir(file), "../../..", "migrations", "000002_user_profiles.sql"))
	if err != nil {
		t.Fatal(err)
	}
	sql := string(content)
	for _, table := range []string{"teachers", "students", "staff_profiles", "guardians", "student_guardians"} {
		if !strings.Contains(sql, "CREATE TABLE IF NOT EXISTS "+table) {
			t.Fatalf("missing table %s", table)
		}
	}
	for _, required := range []string{
		"tenant_id UUID NOT NULL REFERENCES tenants(id)",
		"user_id UUID NOT NULL REFERENCES users(id)",
		"UNIQUE (tenant_id, user_id)",
		"UNIQUE (tenant_id, employee_number)",
		"UNIQUE (tenant_id, student_number)",
		"FOREIGN KEY (tenant_id, student_id) REFERENCES students(tenant_id, id)",
		"FOREIGN KEY (tenant_id, guardian_id) REFERENCES guardians(tenant_id, id)",
		"CREATE UNIQUE INDEX IF NOT EXISTS ux_student_guardians_primary",
		"CREATE INDEX IF NOT EXISTS ix_teachers_tenant_status",
		"CREATE INDEX IF NOT EXISTS ix_students_tenant_status",
	} {
		if !strings.Contains(sql, required) {
			t.Fatalf("migration missing required contract: %s", required)
		}
	}
}

func TestResetLocalDevIncludesProfileTables(t *testing.T) {
	tables := resetLocalDevTables()
	for _, required := range []string{"student_guardians", "guardians", "staff_profiles", "students", "teachers"} {
		if !contains(tables, required) {
			t.Fatalf("ResetLocalDev does not drop %s", required)
		}
	}
}

func contains(values []string, want string) bool {
	for _, value := range values {
		if value == want {
			return true
		}
	}
	return false
}
