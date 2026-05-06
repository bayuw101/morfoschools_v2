package backend

import "embed"

// MigrationsFS embeds SQL migrations into the API binary.
//
//go:embed migrations/*.sql
var MigrationsFS embed.FS
