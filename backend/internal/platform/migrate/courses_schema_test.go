package migrate

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestCoursesMigrationContract(t *testing.T) {
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("cannot resolve test path")
	}
	content, err := os.ReadFile(filepath.Join(filepath.Dir(file), "../../..", "migrations", "000006_courses.sql"))
	if err != nil {
		t.Fatal(err)
	}
	sql := string(content)
	for _, table := range []string{
		"courses",
		"course_modules",
		"course_lessons",
		"course_resources",
		"course_assignment_rules",
		"course_progress",
		"lesson_progress",
	} {
		if !strings.Contains(sql, "CREATE TABLE IF NOT EXISTS "+table) {
			t.Fatalf("missing table %s", table)
		}
	}
	for _, required := range []string{
		"tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE",
		"course_id UUID NOT NULL",
		"module_id UUID NOT NULL",
		"lesson_id UUID NOT NULL",
		"student_id UUID NOT NULL",
		"course_offering_id UUID",
		"target_type TEXT NOT NULL CHECK (target_type IN ('class_section', 'subject_group', 'individual'))",
		"provider TEXT NOT NULL DEFAULT 'external' CHECK (provider IN ('youtube', 'google_drive', 'external', 'file_reference'))",
		"progress_percent NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100)",
		"UNIQUE (tenant_id, code)",
		"UNIQUE (tenant_id, course_id, position)",
		"UNIQUE (tenant_id, module_id, position)",
		"UNIQUE (tenant_id, course_id, course_offering_id, target_type, target_id)",
		"UNIQUE (tenant_id, course_id, student_id)",
		"UNIQUE (tenant_id, lesson_id, student_id)",
		"FOREIGN KEY (tenant_id, course_id) REFERENCES courses(tenant_id, id)",
		"FOREIGN KEY (tenant_id, module_id) REFERENCES course_modules(tenant_id, id)",
		"FOREIGN KEY (tenant_id, lesson_id) REFERENCES course_lessons(tenant_id, id)",
		"FOREIGN KEY (tenant_id, course_offering_id) REFERENCES course_offerings(tenant_id, id)",
		"FOREIGN KEY (tenant_id, student_id) REFERENCES students(tenant_id, id)",
		"CREATE INDEX IF NOT EXISTS ix_courses_tenant_status",
		"CREATE INDEX IF NOT EXISTS ix_course_assignment_rules_target",
		"CREATE INDEX IF NOT EXISTS ix_course_progress_student",
		"CREATE INDEX IF NOT EXISTS ix_lesson_progress_student",
	} {
		if !strings.Contains(sql, required) {
			t.Fatalf("migration missing required contract: %s", required)
		}
	}
}

func TestResetLocalDevIncludesCourseTables(t *testing.T) {
	tables := resetLocalDevTables()
	for _, required := range []string{
		"lesson_progress",
		"course_progress",
		"course_assignment_rules",
		"course_resources",
		"course_lessons",
		"course_modules",
		"courses",
	} {
		if !contains(tables, required) {
			t.Fatalf("ResetLocalDev does not drop %s", required)
		}
	}
}
