package migrate

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestExamsMigrationContract(t *testing.T) {
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("cannot resolve test path")
	}
	content, err := os.ReadFile(filepath.Join(filepath.Dir(file), "../../..", "migrations", "000007_exams.sql"))
	if err != nil {
		t.Fatal(err)
	}
	sql := string(content)
	for _, table := range []string{
		"exams",
		"exam_sections",
		"exam_questions",
		"exam_question_options",
		"exam_targets",
		"exam_gate_windows",
		"exam_prerequisites",
		"exam_eligible_students",
		"exam_attempts",
		"exam_responses",
		"exam_submission_inbox",
		"exam_submission_receipts",
		"exam_integrity_events",
		"exam_grading_tasks",
		"exam_grade_results",
	} {
		if !strings.Contains(sql, "CREATE TABLE IF NOT EXISTS "+table) {
			t.Fatalf("missing table %s", table)
		}
	}
	for _, required := range []string{
		"tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE",
		"question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'short_answer', 'essay'))",
		"correct_answer_text TEXT",
		"expected_answer_rubric JSONB NOT NULL DEFAULT '{}'::jsonb",
		"UNIQUE (tenant_id, exam_id, student_id)",
		"CREATE INDEX IF NOT EXISTS ix_exam_eligible_students_gate",
		"CREATE INDEX IF NOT EXISTS ix_exam_attempts_runtime",
		"idempotency_key TEXT NOT NULL",
		"UNIQUE (tenant_id, idempotency_key)",
		"status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'processed', 'failed'))",
		"CREATE INDEX IF NOT EXISTS ix_exam_submission_inbox_pending",
		"receipt_code TEXT NOT NULL",
		"UNIQUE (tenant_id, attempt_id)",
		"FOREIGN KEY (tenant_id, exam_id) REFERENCES exams(tenant_id, id)",
		"FOREIGN KEY (tenant_id, student_id) REFERENCES students(tenant_id, id)",
		"FOREIGN KEY (tenant_id, attempt_id) REFERENCES exam_attempts(tenant_id, id)",
	} {
		if !strings.Contains(sql, required) {
			t.Fatalf("migration missing required contract: %s", required)
		}
	}
}

func TestResetLocalDevIncludesExamTables(t *testing.T) {
	tables := resetLocalDevTables()
	for _, required := range []string{
		"exam_grade_results",
		"exam_grading_tasks",
		"exam_integrity_events",
		"exam_submission_receipts",
		"exam_submission_inbox",
		"exam_responses",
		"exam_attempts",
		"exam_eligible_students",
		"exam_prerequisites",
		"exam_gate_windows",
		"exam_targets",
		"exam_question_options",
		"exam_questions",
		"exam_sections",
		"exams",
	} {
		if !contains(tables, required) {
			t.Fatalf("ResetLocalDev does not drop %s", required)
		}
	}
}
