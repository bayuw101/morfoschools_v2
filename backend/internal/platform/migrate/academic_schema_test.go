package migrate

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestAcademicMigrationContract(t *testing.T) {
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("cannot resolve test path")
	}
	content, err := os.ReadFile(filepath.Join(filepath.Dir(file), "../../..", "migrations", "000005_academic_foundation.sql"))
	if err != nil {
		t.Fatal(err)
	}
	sql := string(content)
	for _, table := range []string{
		"academic_years",
		"terms",
		"class_sections",
		"subjects",
		"subject_groups",
		"subject_group_members",
		"course_offerings",
		"teaching_assignments",
		"enrollments",
	} {
		if !strings.Contains(sql, "CREATE TABLE IF NOT EXISTS "+table) {
			t.Fatalf("missing table %s", table)
		}
	}
	for _, required := range []string{
		"tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE",
		"academic_year_id UUID NOT NULL",
		"term_id UUID NOT NULL",
		"class_section_id UUID NOT NULL",
		"subject_id UUID NOT NULL",
		"subject_group_id UUID NOT NULL",
		"teacher_id UUID NOT NULL",
		"student_id UUID NOT NULL",
		"target_type TEXT NOT NULL DEFAULT 'class_section' CHECK (target_type IN ('class_section', 'subject_group', 'individual'))",
		"UNIQUE (tenant_id, code)",
		"UNIQUE (tenant_id, academic_year_id, code)",
		"UNIQUE (tenant_id, academic_year_id, grade_level, name)",
		"UNIQUE (tenant_id, subject_group_id, student_id)",
		"UNIQUE (tenant_id, term_id, class_section_id, subject_id)",
		"UNIQUE (tenant_id, course_offering_id, teacher_id)",
		"UNIQUE (tenant_id, course_offering_id, student_id)",
		"FOREIGN KEY (tenant_id, academic_year_id) REFERENCES academic_years(tenant_id, id)",
		"FOREIGN KEY (tenant_id, term_id) REFERENCES terms(tenant_id, id)",
		"FOREIGN KEY (tenant_id, class_section_id) REFERENCES class_sections(tenant_id, id)",
		"FOREIGN KEY (tenant_id, subject_id) REFERENCES subjects(tenant_id, id)",
		"FOREIGN KEY (tenant_id, subject_group_id) REFERENCES subject_groups(tenant_id, id)",
		"FOREIGN KEY (tenant_id, teacher_id) REFERENCES teachers(tenant_id, id)",
		"FOREIGN KEY (tenant_id, student_id) REFERENCES students(tenant_id, id)",
		"CREATE INDEX IF NOT EXISTS ix_course_offerings_teacher_lookup",
		"CREATE INDEX IF NOT EXISTS ix_enrollments_student_lookup",
	} {
		if !strings.Contains(sql, required) {
			t.Fatalf("migration missing required contract: %s", required)
		}
	}
}

func TestResetLocalDevIncludesAcademicTables(t *testing.T) {
	tables := resetLocalDevTables()
	for _, required := range []string{
		"enrollments",
		"teaching_assignments",
		"course_offerings",
		"subject_group_members",
		"subject_groups",
		"subjects",
		"class_sections",
		"terms",
		"academic_years",
	} {
		if !contains(tables, required) {
			t.Fatalf("ResetLocalDev does not drop %s", required)
		}
	}
}
