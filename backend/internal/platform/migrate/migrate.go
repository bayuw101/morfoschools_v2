package migrate

import (
	"context"
	"database/sql"
	"fmt"
	"io/fs"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
)

type Migration struct {
	Version int
	Name    string
	SQL     string
}

type Runner struct {
	db   *sql.DB
	fsys fs.FS
}

func NewRunner(db *sql.DB, fsys fs.FS) *Runner {
	return &Runner{db: db, fsys: fsys}
}

func (r *Runner) Run(ctx context.Context) error {
	if _, err := r.db.ExecContext(ctx, `CREATE TABLE IF NOT EXISTS schema_migrations (
		version INTEGER PRIMARY KEY,
		name TEXT NOT NULL,
		applied_at TIMESTAMP NOT NULL
	)`); err != nil {
		return fmt.Errorf("ensure schema_migrations: %w", err)
	}

	migrations, err := List(r.fsys)
	if err != nil {
		return err
	}
	applied, err := r.appliedVersions(ctx)
	if err != nil {
		return err
	}
	for _, migration := range migrations {
		if applied[migration.Version] {
			continue
		}
		if err := r.apply(ctx, migration); err != nil {
			return err
		}
	}
	return nil
}

func (r *Runner) appliedVersions(ctx context.Context) (map[int]bool, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT version FROM schema_migrations`)
	if err != nil {
		return nil, fmt.Errorf("read schema_migrations: %w", err)
	}
	defer rows.Close()
	applied := map[int]bool{}
	for rows.Next() {
		var version int
		if err := rows.Scan(&version); err != nil {
			return nil, err
		}
		applied[version] = true
	}
	return applied, rows.Err()
}

func (r *Runner) apply(ctx context.Context, migration Migration) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin migration %s: %w", migration.Name, err)
	}
	defer func() { _ = tx.Rollback() }()
	if _, err := tx.ExecContext(ctx, migration.SQL); err != nil {
		return fmt.Errorf("apply migration %s: %w", migration.Name, err)
	}
	recordSQL := fmt.Sprintf(
		`INSERT INTO schema_migrations(version, name, applied_at) VALUES (%d, '%s', CURRENT_TIMESTAMP)`,
		migration.Version,
		strings.ReplaceAll(migration.Name, `'`, `''`),
	)
	if _, err := tx.ExecContext(ctx, recordSQL); err != nil {
		return fmt.Errorf("record migration %s: %w", migration.Name, err)
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit migration %s: %w", migration.Name, err)
	}
	return nil
}

func List(fsys fs.FS) ([]Migration, error) {
	entries, err := fs.ReadDir(fsys, ".")
	if err != nil {
		return nil, fmt.Errorf("read migrations: %w", err)
	}
	migrations := make([]Migration, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() || filepath.Ext(entry.Name()) != ".sql" {
			continue
		}
		version, err := parseVersion(entry.Name())
		if err != nil {
			return nil, err
		}
		content, err := fs.ReadFile(fsys, entry.Name())
		if err != nil {
			return nil, fmt.Errorf("read migration %s: %w", entry.Name(), err)
		}
		migrations = append(migrations, Migration{Version: version, Name: entry.Name(), SQL: string(content)})
	}
	sort.Slice(migrations, func(i, j int) bool { return migrations[i].Version < migrations[j].Version })
	return migrations, nil
}

func parseVersion(name string) (int, error) {
	prefix, _, ok := strings.Cut(name, "_")
	if !ok {
		return 0, fmt.Errorf("migration filename %q must start with numeric prefix and underscore", name)
	}
	version, err := strconv.Atoi(prefix)
	if err != nil || version < 1 {
		return 0, fmt.Errorf("migration filename %q has invalid version", name)
	}
	return version, nil
}

func ResetLocalDev(ctx context.Context, db *sql.DB) error {
	for _, table := range resetLocalDevTables() {
		if _, err := db.ExecContext(ctx, `DROP TABLE IF EXISTS `+table); err != nil {
			return fmt.Errorf("drop %s: %w", table, err)
		}
	}
	return nil
}

func resetLocalDevTables() []string {
	return []string{
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
		"lesson_progress",
		"course_progress",
		"course_assignment_rules",
		"course_resources",
		"course_lessons",
		"course_modules",
		"courses",
		"enrollments",
		"teaching_assignments",
		"course_offerings",
		"subject_group_members",
		"subject_groups",
		"subjects",
		"class_sections",
		"terms",
		"academic_years",
		"student_guardians",
		"guardians",
		"staff_profiles",
		"students",
		"teachers",
		"audit_events",
		"platform_user_roles",
		"user_roles",
		"role_permissions",
		"permissions",
		"roles",
		"tenant_memberships",
		"sessions",
		"password_credentials",
		"users",
		"tenant_theme_settings",
		"tenants",
		"schema_migrations",
	}
}
