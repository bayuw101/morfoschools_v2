package app

import (
	"net/http"
)

func (a *App) registerPlatformRoutes(mux *http.ServeMux) {
	mux.Handle("/api/v1/platform/tenants", a.authenticated(a.requireAnyPermission("tenants:read")(http.HandlerFunc(a.listPlatformTenants))))
}

func (a *App) listPlatformTenants(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, errPayload(r, "method_not_allowed", "Method not allowed"))
		return
	}
	if a.deps.DB == nil {
		writeJSON(w, http.StatusServiceUnavailable, errPayload(r, "database_unavailable", "Database unavailable"))
		return
	}
	rows, err := a.deps.DB.QueryContext(r.Context(), `SELECT id::text, code, name, status FROM tenants ORDER BY code ASC`)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, errPayload(r, "tenant_list_failed", "Could not list tenants"))
		return
	}
	defer rows.Close()
	type tenant struct {
		ID     string `json:"id"`
		Code   string `json:"code"`
		Name   string `json:"name"`
		Status string `json:"status"`
	}
	tenants := []tenant{}
	for rows.Next() {
		var t tenant
		if err := rows.Scan(&t.ID, &t.Code, &t.Name, &t.Status); err != nil {
			writeJSON(w, http.StatusInternalServerError, errPayload(r, "tenant_list_failed", "Could not list tenants"))
			return
		}
		tenants = append(tenants, t)
	}
	if err := rows.Err(); err != nil {
		writeJSON(w, http.StatusInternalServerError, errPayload(r, "tenant_list_failed", "Could not list tenants"))
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": map[string]any{"tenants": tenants}})
}
