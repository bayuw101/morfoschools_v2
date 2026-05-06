package middleware

import (
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestStackAddsRequestIDSecurityHeadersAndContext(t *testing.T) {
	stack := Chain(
		RequestID(),
		SecurityHeaders(),
		TenantContext("development"),
	)
	h := stack.Then(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if RequestIDFromContext(r.Context()) != "req-test" {
			t.Fatalf("missing request id context")
		}
		if TenantIDFromContext(r.Context()) != "tenant-dev" {
			t.Fatalf("missing tenant context")
		}
		w.WriteHeader(http.StatusNoContent)
	}))
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("X-Request-ID", "req-test")
	req.Header.Set("X-Tenant-ID", "tenant-dev")
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusNoContent {
		t.Fatalf("status = %d", rr.Code)
	}
	if rr.Header().Get("X-Frame-Options") != "DENY" {
		t.Fatalf("security header missing")
	}
	if rr.Header().Get("X-Request-ID") != "req-test" {
		t.Fatalf("request header missing")
	}
}

func TestRecoveryReturnsJSONEnvelope(t *testing.T) {
	var logs strings.Builder
	stack := Chain(RequestID(), Recovery(slog.New(slog.NewTextHandler(&logs, nil))))
	h := stack.Then(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { panic("boom") }))
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/", nil))
	if rr.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d", rr.Code)
	}
	if !strings.Contains(rr.Body.String(), "internal_server_error") || !strings.Contains(logs.String(), "panic recovered") {
		t.Fatalf("missing recovery evidence body=%s logs=%s", rr.Body.String(), logs.String())
	}
}

func TestCORSPreflightAndBodyLimit(t *testing.T) {
	corsHandler := Chain(CORS([]string{"http://localhost:1666"})).Then(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("preflight should not reach handler")
	}))
	req := httptest.NewRequest(http.MethodOptions, "/", nil)
	req.Header.Set("Origin", "http://localhost:1666")
	req.Header.Set("Access-Control-Request-Method", "POST")
	rr := httptest.NewRecorder()
	corsHandler.ServeHTTP(rr, req)
	if rr.Code != http.StatusNoContent || rr.Header().Get("Access-Control-Allow-Origin") != "http://localhost:1666" {
		t.Fatalf("cors preflight failed: %d %#v", rr.Code, rr.Header())
	}

	limited := Chain(BodySizeLimit(4)).Then(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = io.ReadAll(r.Body)
	}))
	rr = httptest.NewRecorder()
	limited.ServeHTTP(rr, httptest.NewRequest(http.MethodPost, "/", strings.NewReader("too long")))
	if rr.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("body limit status = %d", rr.Code)
	}
}
