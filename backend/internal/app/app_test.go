package app

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
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

func TestMiddlewareHandlesCredentialedCorsPreflightBeforeAuth(t *testing.T) {
	a := New(Config{ServiceName: "morfoschools-api"}, Dependencies{})
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodOptions, "/api/v1/auth/me", nil)
	req.Header.Set("Origin", "http://localhost:1666")
	req.Header.Set("Access-Control-Request-Method", "POST")

	a.Handler().ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected 204 preflight, got %d body=%s", rec.Code, rec.Body.String())
	}
	if rec.Header().Get("Access-Control-Allow-Origin") != "http://localhost:1666" || rec.Header().Get("Access-Control-Allow-Credentials") != "true" {
		t.Fatalf("missing credentialed CORS headers: %#v", rec.Header())
	}
	if !strings.Contains(rec.Header().Get("Access-Control-Allow-Headers"), "X-CSRF-Token") {
		t.Fatalf("expected CSRF header allowed, got %#v", rec.Header())
	}
}

func TestLoginRequiresEmailPasswordBeforeDatabaseAccess(t *testing.T) {
	a := New(Config{ServiceName: "morfoschools-api"}, Dependencies{})
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", strings.NewReader(`{"email":"teacher@morfoschools.local"}`))

	a.Handler().ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 validation before database access, got %d body=%s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), `"code":"validation_failed"`) || !strings.Contains(rec.Body.String(), "Email and password") {
		t.Fatalf("expected email/password validation error, got %s", rec.Body.String())
	}
}

func TestSecureCookieFlagFollowsAppConfig(t *testing.T) {
	rec := httptest.NewRecorder()
	expires := time.Now().UTC().Add(time.Hour)

	setCookie(rec, sessionCookieName, "token", true, expires, true)

	cookies := rec.Result().Cookies()
	if len(cookies) != 1 || !cookies[0].Secure || !cookies[0].HttpOnly {
		t.Fatalf("expected secure httpOnly session cookie, got %#v", cookies)
	}
}

func TestAuthenticatedMiddlewareRejectsMissingSession(t *testing.T) {
	a := New(Config{}, Dependencies{})
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/protected", nil)

	a.authenticated(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("handler must not run without session")
	})).ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized || !strings.Contains(rec.Body.String(), `"code":"unauthenticated"`) {
		t.Fatalf("expected unauthenticated envelope, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestRequirePermissionAllowsAuthorizedSubject(t *testing.T) {
	a := New(Config{}, Dependencies{})
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req = req.WithContext(WithSubject(req.Context(), Subject{UserID: "u1", TenantID: "t1", Permissions: []string{"courses:read"}}))

	a.requireAnyPermission("courses:read")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{"ok": true})
	})).ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected allowed subject, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestRequirePermissionDeniesMissingPermission(t *testing.T) {
	a := New(Config{}, Dependencies{})
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req = req.WithContext(WithSubject(req.Context(), Subject{UserID: "u1", TenantID: "t1", Permissions: []string{"courses:read"}}))

	a.requireAnyPermission("courses:write")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("handler must not run when RBAC denies access")
	})).ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden || !strings.Contains(rec.Body.String(), `"code":"forbidden"`) {
		t.Fatalf("expected forbidden RBAC envelope, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestPlatformTenantListRequiresAuthenticatedMasterPermission(t *testing.T) {
	a := New(Config{}, Dependencies{})
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/platform/tenants", nil)

	a.Handler().ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized || !strings.Contains(rec.Body.String(), `"code":"unauthenticated"`) {
		t.Fatalf("expected tenant list to require auth before DB access, got %d body=%s", rec.Code, rec.Body.String())
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
