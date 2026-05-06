package migrate

import (
	"database/sql"
	"testing"
	"testing/fstest"

	_ "modernc.org/sqlite"
)

func TestRunnerAppliesMigrationsRepeatably(t *testing.T) {
	db := openTestDB(t)
	fsys := fstest.MapFS{
		"000001_init.sql":  {Data: []byte(`CREATE TABLE IF NOT EXISTS tenants (id TEXT PRIMARY KEY, name TEXT NOT NULL);`)},
		"000002_users.sql": {Data: []byte(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id));`)},
	}

	r := NewRunner(db, fsys)
	if err := r.Run(t.Context()); err != nil {
		t.Fatalf("first run failed: %v", err)
	}
	if err := r.Run(t.Context()); err != nil {
		t.Fatalf("second run should be repeatable: %v", err)
	}

	var count int
	if err := db.QueryRow(`SELECT COUNT(*) FROM schema_migrations`).Scan(&count); err != nil {
		t.Fatalf("count schema migrations: %v", err)
	}
	if count != 2 {
		t.Fatalf("expected 2 applied migrations, got %d", count)
	}
}

func TestResetDropsKnownTablesForLocalDev(t *testing.T) {
	db := openTestDB(t)
	fsys := fstest.MapFS{
		"000001_init.sql": {Data: []byte(`CREATE TABLE IF NOT EXISTS tenants (id TEXT PRIMARY KEY); CREATE TABLE IF NOT EXISTS audit_events (id TEXT PRIMARY KEY);`)},
	}
	r := NewRunner(db, fsys)
	if err := r.Run(t.Context()); err != nil {
		t.Fatalf("run failed: %v", err)
	}
	if err := ResetLocalDev(t.Context(), db); err != nil {
		t.Fatalf("reset failed: %v", err)
	}
	if tableExists(t, db, "tenants") || tableExists(t, db, "audit_events") || tableExists(t, db, "schema_migrations") {
		t.Fatalf("expected known tables to be dropped")
	}
}

func TestMigrationFilenameParsingAndSorting(t *testing.T) {
	migrations, err := List(fstest.MapFS{
		"000010_later.sql": {Data: []byte(`SELECT 10;`)},
		"000002_two.sql":   {Data: []byte(`SELECT 2;`)},
	})
	if err != nil {
		t.Fatalf("list failed: %v", err)
	}
	if len(migrations) != 2 || migrations[0].Version != 2 || migrations[1].Version != 10 {
		t.Fatalf("unexpected sorted migrations: %#v", migrations)
	}
}

func openTestDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	return db
}

func tableExists(t *testing.T, db *sql.DB, name string) bool {
	t.Helper()
	var found string
	err := db.QueryRow(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`, name).Scan(&found)
	return err == nil
}
