package httpx

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestWriteJSONEnvelopeIncludesDataAndRequestID(t *testing.T) {
	rr := httptest.NewRecorder()
	WriteJSON(rr, http.StatusCreated, "req-123", map[string]string{"id": "abc"})

	if rr.Code != http.StatusCreated {
		t.Fatalf("status = %d", rr.Code)
	}
	var body map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body["requestId"] != "req-123" {
		t.Fatalf("requestId = %v", body["requestId"])
	}
	data := body["data"].(map[string]any)
	if data["id"] != "abc" {
		t.Fatalf("data.id = %v", data["id"])
	}
}

func TestWriteErrorSupportsStructuredValidation(t *testing.T) {
	rr := httptest.NewRecorder()
	err := ValidationError("invalid_request", "Invalid request").WithField("email", "Required")
	WriteError(rr, http.StatusBadRequest, "req-456", err)

	var body map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body["code"] != "invalid_request" || body["error"] != "invalid_request" {
		t.Fatalf("unexpected code/error: %#v", body)
	}
	fields := body["fieldErrors"].(map[string]any)
	messages := fields["email"].([]any)
	if messages[0] != "Required" {
		t.Fatalf("field error = %v", messages[0])
	}
}

func TestParsePaginationIsBounded(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/?page=-10&pageSize=999", nil)
	page := ParsePagination(req, 50)
	if page.Page != 1 || page.PageSize != 50 {
		t.Fatalf("pagination = %#v", page)
	}
	meta := page.Meta(101)
	if !meta.HasNext || meta.Total != 101 {
		t.Fatalf("meta = %#v", meta)
	}
}
