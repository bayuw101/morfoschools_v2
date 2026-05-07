package main

import (
	"context"
	"database/sql"
	"io/fs"
	"log"
	"net"
	"net/http"
	"os"
	"strings"
	"time"

	morfoschools "morfoschools/backend"
	"morfoschools/backend/internal/app"
	"morfoschools/backend/internal/platform/devseed"
	"morfoschools/backend/internal/platform/migrate"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func main() {
	ctx := context.Background()
	databaseURL := env("DATABASE_URL", "")
	db, err := openDatabase(databaseURL)
	if err != nil {
		log.Fatalf("open database: %v", err)
	}
	if db != nil {
		defer db.Close()
		migrations, err := fs.Sub(morfoschools.MigrationsFS, "migrations")
		if err != nil {
			log.Fatalf("load migrations: %v", err)
		}
		if env("RESET_LOCAL_DEV_DB", "") == "true" && env("APP_ENV", "development") != "production" {
			if err := migrate.ResetLocalDev(ctx, db); err != nil {
				log.Fatalf("reset local dev database: %v", err)
			}
		}
		if err := migrate.NewRunner(db, migrations).Run(ctx); err != nil {
			log.Fatalf("run migrations: %v", err)
		}
		if err := devseed.Run(ctx, db, devseed.Config{
			Enabled: env("SEED_DEV_DATA", "") == "true" || env("APP_ENV", "development") == "development",
			AppEnv:  env("APP_ENV", "development"),
			Driver:  "pgx",
		}); err != nil {
			log.Fatalf("seed development data: %v", err)
		}
	}

	cfg := app.Config{
		ServiceName:   "morfoschools-api",
		Port:          env("PORT", "8080"),
		LogLevel:      env("LOG_LEVEL", "info"),
		SecureCookies: env("SECURE_COOKIES", env("APP_ENV", "development")) == "true" || env("APP_ENV", "development") == "production",
	}

	a := app.New(cfg, app.Dependencies{
		DB:       db,
		Database: app.DependencyCheck{Name: "database", Check: dbPingCheck(db)},
		Valkey:   app.DependencyCheck{Name: "valkey", Check: tcpCheckFromURL(env("VALKEY_URL", "redis://valkey:6379/0"), "6379")},
		NATS:     app.DependencyCheck{Name: "nats", Check: tcpCheckFromURL(env("NATS_URL", "nats://nats:4222"), "4222")},
	})

	srv := &http.Server{
		Addr:              a.Addr(),
		Handler:           a.Handler(),
		ReadHeaderTimeout: 5 * time.Second,
	}
	log.Printf("morfoschools api foundation listening on %s", a.Addr())
	log.Fatal(srv.ListenAndServe())
}

func openDatabase(databaseURL string) (*sql.DB, error) {
	if databaseURL == "" {
		return nil, nil
	}
	db, err := sql.Open("pgx", databaseURL)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(8)
	db.SetMaxIdleConns(4)
	db.SetConnMaxLifetime(30 * time.Minute)
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		_ = db.Close()
		return nil, err
	}
	return db, nil
}

func dbPingCheck(db *sql.DB) func() error {
	return func() error {
		if db == nil {
			return nil
		}
		ctx, cancel := context.WithTimeout(context.Background(), 750*time.Millisecond)
		defer cancel()
		return db.PingContext(ctx)
	}
}

func env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func tcpCheckFromURL(raw string, fallbackPort string) func() error {
	return func() error {
		if raw == "" {
			return nil
		}
		hostPort := raw
		if idx := strings.Index(hostPort, "://"); idx >= 0 {
			hostPort = hostPort[idx+3:]
		}
		if at := strings.LastIndex(hostPort, "@"); at >= 0 {
			hostPort = hostPort[at+1:]
		}
		if slash := strings.Index(hostPort, "/"); slash >= 0 {
			hostPort = hostPort[:slash]
		}
		if q := strings.Index(hostPort, "?"); q >= 0 {
			hostPort = hostPort[:q]
		}
		if !strings.Contains(hostPort, ":") {
			hostPort = net.JoinHostPort(hostPort, fallbackPort)
		}
		ctx, cancel := context.WithTimeout(context.Background(), 750*time.Millisecond)
		defer cancel()
		d := net.Dialer{}
		conn, err := d.DialContext(ctx, "tcp", hostPort)
		if err != nil {
			return err
		}
		return conn.Close()
	}
}
