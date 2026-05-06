package testkit

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

type Fixture struct {
	TenantID    string
	UserID      string
	SessionID   string
	Permissions []string
}

func NewFixture() Fixture {
	return Fixture{TenantID: "00000000-0000-7000-8000-000000000101", UserID: "00000000-0000-7000-8000-000000000201", SessionID: "test-session", Permissions: []string{}}
}

func (f Fixture) WithPermission(permission string) Fixture {
	f.Permissions = append(f.Permissions, permission)
	return f
}

func NewJSONRequest(t *testing.T, method, path string, body any) *http.Request {
	t.Helper()
	var buf bytes.Buffer
	if body != nil {
		if err := json.NewEncoder(&buf).Encode(body); err != nil {
			t.Fatal(err)
		}
	}
	req := httptest.NewRequest(method, path, &buf)
	req.Header.Set("Content-Type", "application/json")
	return req
}

func AttachAuth(req *http.Request, f Fixture) {
	req.Header.Set("X-User-ID", f.UserID)
	req.Header.Set("X-Test-Session-ID", f.SessionID)
}

func AttachTenant(req *http.Request, f Fixture) {
	req.Header.Set("X-Tenant-ID", f.TenantID)
}

func DecodeJSON(t *testing.T, rr *httptest.ResponseRecorder, out any) {
	t.Helper()
	if err := json.Unmarshal(rr.Body.Bytes(), out); err != nil {
		t.Fatal(err)
	}
}

func AssertStatus(t *testing.T, rr *httptest.ResponseRecorder, want int) {
	t.Helper()
	if rr.Code != want {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, want, rr.Body.String())
	}
}
