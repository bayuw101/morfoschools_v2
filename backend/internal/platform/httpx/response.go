package httpx

import (
	"encoding/json"
	"net/http"
	"strconv"
)

type Envelope struct {
	Data      any    `json:"data,omitempty"`
	RequestID string `json:"requestId"`
}

type ErrorEnvelope struct {
	Error       string              `json:"error"`
	Code        string              `json:"code"`
	Message     string              `json:"message"`
	RequestID   string              `json:"requestId"`
	FieldErrors map[string][]string `json:"fieldErrors,omitempty"`
	Details     any                 `json:"details,omitempty"`
}

type APIError struct {
	Code        string
	Message     string
	FieldErrors map[string][]string
	Details     any
}

func (e APIError) Error() string { return e.Message }

func ValidationError(code, message string) APIError {
	return APIError{Code: code, Message: message, FieldErrors: map[string][]string{}}
}

func (e APIError) WithField(field, message string) APIError {
	if e.FieldErrors == nil {
		e.FieldErrors = map[string][]string{}
	}
	e.FieldErrors[field] = append(e.FieldErrors[field], message)
	return e
}

func WriteJSON(w http.ResponseWriter, status int, requestID string, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(Envelope{Data: data, RequestID: requestID})
}

func WriteError(w http.ResponseWriter, status int, requestID string, err error) {
	apiErr, ok := err.(APIError)
	if !ok {
		apiErr = APIError{Code: "internal_server_error", Message: "Internal server error"}
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(ErrorEnvelope{
		Error:       apiErr.Code,
		Code:        apiErr.Code,
		Message:     apiErr.Message,
		RequestID:   requestID,
		FieldErrors: apiErr.FieldErrors,
		Details:     apiErr.Details,
	})
}

type Pagination struct {
	Page     int
	PageSize int
}

type PaginationMeta struct {
	Page     int  `json:"page"`
	PageSize int  `json:"pageSize"`
	Total    int  `json:"total"`
	HasNext  bool `json:"hasNext"`
}

func ParsePagination(r *http.Request, maxPageSize int) Pagination {
	if maxPageSize <= 0 {
		maxPageSize = 100
	}
	page := parsePositiveInt(r.URL.Query().Get("page"), 1)
	pageSize := parsePositiveInt(r.URL.Query().Get("pageSize"), 20)
	if pageSize > maxPageSize {
		pageSize = maxPageSize
	}
	return Pagination{Page: page, PageSize: pageSize}
}

func (p Pagination) Meta(total int) PaginationMeta {
	return PaginationMeta{Page: p.Page, PageSize: p.PageSize, Total: total, HasNext: p.Page*p.PageSize < total}
}

func parsePositiveInt(raw string, fallback int) int {
	v, err := strconv.Atoi(raw)
	if err != nil || v < 1 {
		return fallback
	}
	return v
}
