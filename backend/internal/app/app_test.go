package app

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestHealthzReturnsOKEnvelopeAndRequestID(t *testing.T) {
	a := New(Config{ServiceName: "morfoschools-api"}, Dependencies{})
	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	req.Header.Set("X-Request-ID", "req-test-123")
	rec := httptest.NewRecorder()

	a.Handler().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", rec.Code, rec.Body.String())
	}
	if got := rec.Header().Get("X-Request-ID"); got != "req-test-123" {
		t.Fatalf("expected response request id, got %q", got)
	}
	var body map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("invalid json: %v", err)
	}
	if body["status"] != "ok" || body["service"] != "morfoschools-api" || body["requestId"] != "req-test-123" {
		t.Fatalf("unexpected body: %#v", body)
	}
}

func TestReadyzChecksCriticalDependencies(t *testing.T) {
	a := New(Config{ServiceName: "morfoschools-api"}, Dependencies{
		Database: DependencyCheck{Name: "database", Check: func() error { return nil }},
		Valkey:   DependencyCheck{Name: "valkey", Check: func() error { return nil }},
		NATS:     DependencyCheck{Name: "nats", Check: func() error { return nil }},
	})
	rec := httptest.NewRecorder()
	a.Handler().ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/readyz", nil))

	if rec.Code != http.StatusOK {
		t.Fatalf("expected ready status 200, got %d body=%s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), `"status":"ready"`) {
		t.Fatalf("expected ready body, got %s", rec.Body.String())
	}
}

func TestReadyzReportsUnavailableDependency(t *testing.T) {
	a := New(Config{ServiceName: "morfoschools-api"}, Dependencies{
		Database: DependencyCheck{Name: "database", Check: func() error { return errDependencyUnavailable("dial failed") }},
		Valkey:   DependencyCheck{Name: "valkey", Check: func() error { return nil }},
		NATS:     DependencyCheck{Name: "nats", Check: func() error { return nil }},
	})
	rec := httptest.NewRecorder()
	a.Handler().ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/readyz", nil))

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503, got %d body=%s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), `"database":"unavailable"`) || !strings.Contains(rec.Body.String(), `"status":"degraded"`) {
		t.Fatalf("expected degraded database status, got %s", rec.Body.String())
	}
}

func TestMiddlewareAddsSecurityHeadersAndRecoversPanic(t *testing.T) {
	a := New(Config{ServiceName: "morfoschools-api"}, Dependencies{})
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/panic-test", nil)
	a.wrap(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { panic("boom") })).ServeHTTP(rec, req)

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500, got %d body=%s", rec.Code, rec.Body.String())
	}
	if rec.Header().Get("X-Content-Type-Options") != "nosniff" || rec.Header().Get("X-Frame-Options") != "DENY" {
		t.Fatalf("missing security headers: %#v", rec.Header())
	}
	if !strings.Contains(rec.Body.String(), `"code":"internal_server_error"`) || !strings.Contains(rec.Body.String(), `"requestId"`) {
		t.Fatalf("expected error envelope with request id, got %s", rec.Body.String())
	}
}
