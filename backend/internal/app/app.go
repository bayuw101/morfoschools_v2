package app

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"time"
)

type Config struct {
	ServiceName   string
	Port          string
	LogLevel      string
	SecureCookies bool
}

type DependencyCheck struct {
	Name  string
	Check func() error
}

type Dependencies struct {
	DB         *sql.DB
	Database   DependencyCheck
	Valkey     DependencyCheck
	NATS       DependencyCheck
	ThemeCache themeCache
}

type App struct {
	cfg         Config
	deps        Dependencies
	logger      *slog.Logger
	loginLimits *loginLimiter
}

type contextKey string

const requestIDKey contextKey = "requestID"

func New(cfg Config, deps Dependencies) *App {
	if cfg.ServiceName == "" {
		cfg.ServiceName = "morfoschools-api"
	}
	if cfg.Port == "" {
		cfg.Port = "8080"
	}
	return &App{cfg: cfg, deps: deps, logger: slog.New(slog.NewJSONHandler(os.Stdout, nil)), loginLimits: newLoginLimiter()}
}

func (a *App) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", a.healthz)
	mux.HandleFunc("/readyz", a.readyz)
	a.registerAuthRoutes(mux)
	a.registerPlatformRoutes(mux)
	a.registerThemeRoutes(mux)
	a.registerUserRoutes(mux)
	return a.wrap(mux)
}

func (a *App) Addr() string { return ":" + a.cfg.Port }

func (a *App) healthz(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"status":    "ok",
		"service":   a.cfg.ServiceName,
		"requestId": RequestIDFromContext(r.Context()),
	})
}

func (a *App) readyz(w http.ResponseWriter, r *http.Request) {
	checks := []DependencyCheck{a.deps.Database, a.deps.Valkey, a.deps.NATS}
	deps := map[string]string{}
	ready := true
	for _, dep := range checks {
		if dep.Name == "" {
			continue
		}
		status := "ready"
		if dep.Check == nil || dep.Check() != nil {
			status = "unavailable"
			ready = false
		}
		deps[dep.Name] = status
	}
	status := "ready"
	code := http.StatusOK
	if !ready {
		status = "degraded"
		code = http.StatusServiceUnavailable
	}
	payload := map[string]any{"status": status, "service": a.cfg.ServiceName, "requestId": RequestIDFromContext(r.Context())}
	for k, v := range deps {
		payload[k] = v
	}
	writeJSON(w, code, payload)
}

func (a *App) wrap(next http.Handler) http.Handler {
	return requestID(recovery(a.logger)(securityHeaders(cors(next))))
}

func cors(next http.Handler) http.Handler {
	allowed := map[string]bool{
		"http://localhost:1666": true,
		"http://127.0.0.1:1666": true,
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if allowed[origin] {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Add("Vary", "Origin")
		}
		if r.Method == http.MethodOptions {
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Request-ID, X-Tenant-ID, X-CSRF-Token, Idempotency-Key")
			w.Header().Set("Access-Control-Max-Age", "600")
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func requestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := r.Header.Get("X-Request-ID")
		if id == "" {
			id = newRequestID()
		}
		w.Header().Set("X-Request-ID", id)
		ctx := context.WithValue(r.Context(), requestIDKey, id)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func recovery(logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if recovered := recover(); recovered != nil {
					logger.Error("panic recovered", "requestId", RequestIDFromContext(r.Context()), "panic", recovered)
					writeJSON(w, http.StatusInternalServerError, map[string]any{
						"code":      "internal_server_error",
						"message":   "Internal server error",
						"requestId": RequestIDFromContext(r.Context()),
					})
				}
			}()
			next.ServeHTTP(w, r)
		})
	}
}

func securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		w.Header().Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
		next.ServeHTTP(w, r)
	})
}

func RequestIDFromContext(ctx context.Context) string {
	if v, ok := ctx.Value(requestIDKey).(string); ok {
		return v
	}
	return ""
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func newRequestID() string {
	var b [8]byte
	if _, err := rand.Read(b[:]); err != nil {
		return "req-" + time.Now().Format("20060102150405")
	}
	return "req-" + hex.EncodeToString(b[:])
}

type dependencyUnavailable string

func (e dependencyUnavailable) Error() string { return string(e) }

func errDependencyUnavailable(msg string) error { return dependencyUnavailable(msg) }

func IsDependencyUnavailable(err error) bool {
	var target dependencyUnavailable
	return errors.As(err, &target)
}
