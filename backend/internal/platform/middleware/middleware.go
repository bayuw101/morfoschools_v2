package middleware

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"
	"time"
)

type Middleware func(http.Handler) http.Handler

type ChainBuilder struct{ middleware []Middleware }

func Chain(middleware ...Middleware) ChainBuilder { return ChainBuilder{middleware: middleware} }

func (c ChainBuilder) Then(next http.Handler) http.Handler {
	for i := len(c.middleware) - 1; i >= 0; i-- {
		next = c.middleware[i](next)
	}
	return next
}

type contextKey string

const (
	requestIDKey contextKey = "requestID"
	tenantIDKey  contextKey = "tenantID"
)

func RequestID() Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			id := r.Header.Get("X-Request-ID")
			if id == "" {
				id = newRequestID()
			}
			w.Header().Set("X-Request-ID", id)
			next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), requestIDKey, id)))
		})
	}
}

func RequestIDFromContext(ctx context.Context) string {
	if v, ok := ctx.Value(requestIDKey).(string); ok {
		return v
	}
	return ""
}

func TenantContext(env string) Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			tenantID := ""
			if env == "development" {
				tenantID = r.Header.Get("X-Tenant-ID")
			}
			next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), tenantIDKey, tenantID)))
		})
	}
}

func TenantIDFromContext(ctx context.Context) string {
	if v, ok := ctx.Value(tenantIDKey).(string); ok {
		return v
	}
	return ""
}

func Recovery(logger *slog.Logger) Middleware {
	if logger == nil {
		logger = slog.Default()
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if recovered := recover(); recovered != nil {
					requestID := RequestIDFromContext(r.Context())
					logger.Error("panic recovered", "requestId", requestID, "panic", recovered)
					writeError(w, http.StatusInternalServerError, requestID, "internal_server_error", "Internal server error")
				}
			}()
			next.ServeHTTP(w, r)
		})
	}
}

func SecurityHeaders() Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("X-Content-Type-Options", "nosniff")
			w.Header().Set("X-Frame-Options", "DENY")
			w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
			w.Header().Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
			next.ServeHTTP(w, r)
		})
	}
}

func CORS(allowedOrigins []string) Middleware {
	allowed := map[string]bool{}
	for _, origin := range allowedOrigins {
		allowed[origin] = true
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			if allowed[origin] {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Access-Control-Allow-Credentials", "true")
				w.Header().Set("Vary", "Origin")
			}
			if r.Method == http.MethodOptions && r.Header.Get("Access-Control-Request-Method") != "" {
				w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
				w.Header().Set("Access-Control-Allow-Headers", "Content-Type,X-CSRF-Token,X-Request-ID,X-Tenant-ID")
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func BodySizeLimit(maxBytes int64) Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Body != nil && r.ContentLength > maxBytes && r.ContentLength != -1 {
				writeError(w, http.StatusRequestEntityTooLarge, RequestIDFromContext(r.Context()), "request_body_too_large", "Request body is too large")
				return
			}
			r.Body = http.MaxBytesReader(w, r.Body, maxBytes)
			next.ServeHTTP(w, r)
		})
	}
}

func writeError(w http.ResponseWriter, status int, requestID, code, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]any{"error": code, "code": code, "message": message, "requestId": requestID})
}

func newRequestID() string {
	var b [8]byte
	if _, err := rand.Read(b[:]); err != nil {
		return "req-" + strings.ReplaceAll(time.Now().Format(time.RFC3339Nano), ":", "")
	}
	return "req-" + hex.EncodeToString(b[:])
}
