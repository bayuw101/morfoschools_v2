package app

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	_ "modernc.org/sqlite"
)

func TestCreatePlatformTenantCreatesThemeRolesAndAudit(t *testing.T) {
	db := openPlatformTestDB(t)
	seedPlatformFixture(t, db)
	a := New(Config{}, Dependencies{DB: db})
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/platform/tenants", strings.NewReader(`{"code":"sma-nusantara","name":"SMA Nusantara"}`))
	req.Header.Set("Content-Type", "application/json")
	ctx := WithSubject(req.Context(), Subject{UserID: platformMasterID, Permissions: []string{"tenants:write"}})
	ctx = context.WithValue(ctx, requestIDKey, "req-create-tenant")
	req = withCSRFCookie(req).WithContext(ctx)

	a.createPlatformTenant(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d body=%s", rec.Code, rec.Body.String())
	}
	var payload struct {
		Data struct {
			Tenant struct {
				ID, Code, Name, Status string
			} `json:"tenant"`
		} `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode tenant response: %v body=%s", err, rec.Body.String())
	}
	if payload.Data.Tenant.ID == "" || payload.Data.Tenant.Code != "sma-nusantara" || payload.Data.Tenant.Name != "SMA Nusantara" || payload.Data.Tenant.Status != "active" {
		t.Fatalf("unexpected tenant response: %#v", payload.Data.Tenant)
	}
	var themeCount, roleCount, auditCount int
	if err := db.QueryRow(`SELECT COUNT(*) FROM tenant_theme_settings WHERE tenant_id=?`, payload.Data.Tenant.ID).Scan(&themeCount); err != nil {
		t.Fatalf("theme lookup failed: %v", err)
	}
	if err := db.QueryRow(`SELECT COUNT(*) FROM roles WHERE tenant_id=? AND code IN ('school_admin','teacher','student')`, payload.Data.Tenant.ID).Scan(&roleCount); err != nil {
		t.Fatalf("role lookup failed: %v", err)
	}
	if err := db.QueryRow(`SELECT COUNT(*) FROM audit_events WHERE tenant_id=? AND actor_user_id=? AND request_id='req-create-tenant' AND action='tenants.create'`, payload.Data.Tenant.ID, platformMasterID).Scan(&auditCount); err != nil {
		t.Fatalf("audit lookup failed: %v", err)
	}
	if themeCount != 1 || roleCount != 3 || auditCount != 1 {
		t.Fatalf("expected theme=1 roles=3 audit=1, got theme=%d roles=%d audit=%d", themeCount, roleCount, auditCount)
	}
}

func TestPlatformTenantUnsafeWritesRequireCSRF(t *testing.T) {
	db := openPlatformTestDB(t)
	seedPlatformFixture(t, db)
	a := New(Config{}, Dependencies{DB: db})
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/platform/tenants", strings.NewReader(`{"code":"no-csrf","name":"No CSRF"}`))
	req = req.WithContext(WithSubject(req.Context(), Subject{UserID: platformMasterID, Permissions: []string{"tenants:write"}}))
	a.createPlatformTenant(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected missing CSRF to be 403, got %d body=%s", rec.Code, rec.Body.String())
	}
	var tenantCount int
	if err := db.QueryRow(`SELECT COUNT(*) FROM tenants WHERE code='no-csrf'`).Scan(&tenantCount); err != nil {
		t.Fatalf("tenant lookup failed: %v", err)
	}
	if tenantCount != 0 {
		t.Fatalf("unsafe write without csrf created %d tenants", tenantCount)
	}
}

func TestUpdatePlatformTenantCanChangeStatus(t *testing.T) {
	db := openPlatformTestDB(t)
	seedPlatformFixture(t, db)
	a := New(Config{}, Dependencies{DB: db})
	tenantID := createTenantForPlatformTest(t, a, db)

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPatch, "/api/v1/platform/tenants/"+tenantID, strings.NewReader(`{"code":"tenant-suspended","name":"Tenant Suspended","status":"suspended"}`))
	req.SetPathValue("id", tenantID)
	req.Header.Set("Content-Type", "application/json")
	ctx := WithSubject(req.Context(), Subject{UserID: platformMasterID, Permissions: []string{"tenants:write"}})
	ctx = context.WithValue(ctx, requestIDKey, "req-update-tenant")
	req = withCSRFCookie(req).WithContext(ctx)
	a.updatePlatformTenant(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d body=%s", rec.Code, rec.Body.String())
	}
	var tenantStatus string
	if err := db.QueryRow(`SELECT status FROM tenants WHERE id=?`, tenantID).Scan(&tenantStatus); err != nil {
		t.Fatalf("tenant status lookup failed: %v", err)
	}
	var auditCount int
	if err := db.QueryRow(`SELECT COUNT(*) FROM audit_events WHERE tenant_id=? AND actor_user_id=? AND request_id='req-update-tenant' AND action='tenants.update' AND resource_type='tenant' AND resource_id=?`, tenantID, platformMasterID, tenantID).Scan(&auditCount); err != nil {
		t.Fatalf("audit lookup failed: %v", err)
	}
	if tenantStatus != "suspended" || !strings.Contains(rec.Body.String(), `"status":"suspended"`) || auditCount != 1 {
		t.Fatalf("expected suspended tenant with audit=1, db status=%q audit=%d body=%s", tenantStatus, auditCount, rec.Body.String())
	}
}

func TestUpdatePlatformTenantRejectsInvalidStatus(t *testing.T) {
	db := openPlatformTestDB(t)
	seedPlatformFixture(t, db)
	a := New(Config{}, Dependencies{DB: db})
	tenantID := createTenantForPlatformTest(t, a, db)

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPatch, "/api/v1/platform/tenants/"+tenantID, strings.NewReader(`{"code":"tenant-invalid","name":"Tenant Invalid","status":"deleted"}`))
	req.SetPathValue("id", tenantID)
	req = withCSRFCookie(req).WithContext(WithSubject(req.Context(), Subject{UserID: platformMasterID, Permissions: []string{"tenants:write"}}))
	a.updatePlatformTenant(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d body=%s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), "status must be active, suspended, or archived") {
		t.Fatalf("expected status validation response, body=%s", rec.Body.String())
	}
}

func TestUploadTenantLogoAcceptsPNGAndStoresPublicURL(t *testing.T) {
	db := openPlatformTestDB(t)
	seedPlatformFixture(t, db)
	storage := &fakeLogoStorage{}
	a := New(Config{R2PublicBaseURL: "https://pub-8d50d0828aa846e0bc9896b87480b502.r2.dev", TenantLogoPrefix: "logo"}, Dependencies{DB: db, LogoStorage: storage})
	tenantID := createTenantForPlatformTest(t, a, db)

	rec := httptest.NewRecorder()
	req := newLogoUploadRequest(t, tenantID, "school.png", []byte{0x89, 'P', 'N', 'G', 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3})
	req.SetPathValue("id", tenantID)
	ctx := WithSubject(req.Context(), Subject{UserID: platformMasterID, Permissions: []string{"tenants:write"}})
	ctx = context.WithValue(ctx, requestIDKey, "req-upload-logo")
	req = withCSRFCookie(req).WithContext(ctx)
	a.uploadTenantLogo(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d body=%s", rec.Code, rec.Body.String())
	}
	expectedKey := "logo/" + tenantID + "/school-logo.png"
	if storage.objectKey != expectedKey || storage.contentType != "image/png" {
		t.Fatalf("unexpected storage call key=%q type=%q", storage.objectKey, storage.contentType)
	}
	var logoURL, objectKey, contentType string
	if err := db.QueryRow(`SELECT logo_url, logo_object_key, logo_content_type FROM tenants WHERE id=?`, tenantID).Scan(&logoURL, &objectKey, &contentType); err != nil {
		t.Fatalf("logo metadata lookup failed: %v", err)
	}
	var auditCount int
	if err := db.QueryRow(`SELECT COUNT(*) FROM audit_events WHERE tenant_id=? AND actor_user_id=? AND request_id='req-upload-logo' AND action='tenants.logo_upload' AND resource_type='tenant' AND resource_id=?`, tenantID, platformMasterID, tenantID).Scan(&auditCount); err != nil {
		t.Fatalf("audit lookup failed: %v", err)
	}
	if logoURL != "https://pub-8d50d0828aa846e0bc9896b87480b502.r2.dev/"+expectedKey || objectKey != expectedKey || contentType != "image/png" || auditCount != 1 {
		t.Fatalf("unexpected logo metadata/audit url=%q key=%q type=%q audit=%d", logoURL, objectKey, contentType, auditCount)
	}
}

func TestUploadTenantLogoAcceptsJPEG(t *testing.T) {
	db := openPlatformTestDB(t)
	seedPlatformFixture(t, db)
	storage := &fakeLogoStorage{}
	a := New(Config{R2PublicBaseURL: "https://pub.example", TenantLogoPrefix: "logo"}, Dependencies{DB: db, LogoStorage: storage})
	tenantID := createTenantForPlatformTest(t, a, db)

	rec := httptest.NewRecorder()
	req := newLogoUploadRequest(t, tenantID, "school.jpg", []byte{0xff, 0xd8, 0xff, 0xe0, 1, 2, 3})
	req.SetPathValue("id", tenantID)
	req = withCSRFCookie(req).WithContext(WithSubject(req.Context(), Subject{UserID: platformMasterID, Permissions: []string{"tenants:write"}}))
	a.uploadTenantLogo(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d body=%s", rec.Code, rec.Body.String())
	}
	expectedKey := "logo/" + tenantID + "/school-logo.jpg"
	if storage.objectKey != expectedKey || storage.contentType != "image/jpeg" {
		t.Fatalf("unexpected storage call key=%q type=%q", storage.objectKey, storage.contentType)
	}
}

func TestBootstrapTenantAdminCreatesIdentityMembershipCredentialRoleAndAudit(t *testing.T) {
	db := openPlatformTestDB(t)
	seedPlatformFixture(t, db)
	a := New(Config{}, Dependencies{DB: db})
	tenantID := createTenantForPlatformTest(t, a, db)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/platform/tenants/tenant-new/bootstrap-admin", strings.NewReader(`{"email":"admin@smanusantara.sch.id","displayName":"Admin SMA Nusantara","password": "safe-password-123"}`))
	req.SetPathValue("id", tenantID)
	ctx := WithSubject(req.Context(), Subject{UserID: platformMasterID, Permissions: []string{"tenants:bootstrap"}})
	ctx = context.WithValue(ctx, requestIDKey, "req-bootstrap-admin")
	req = withCSRFCookie(req).WithContext(ctx)

	a.bootstrapTenantAdmin(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d body=%s", rec.Code, rec.Body.String())
	}
	var userID, membershipStatus, roleCode, passwordHash string
	var isPrimaryAdmin bool
	if err := db.QueryRow(`SELECT u.id, tm.status, tm.is_primary_admin, r.code, pc.password_hash FROM users u JOIN password_credentials pc ON pc.user_id=u.id JOIN tenant_memberships tm ON tm.user_id=u.id JOIN user_roles ur ON ur.membership_id=tm.id JOIN roles r ON r.id=ur.role_id WHERE u.email='admin@smanusantara.sch.id' AND tm.tenant_id=?`, tenantID).Scan(&userID, &membershipStatus, &isPrimaryAdmin, &roleCode, &passwordHash); err != nil {
		t.Fatalf("bootstrapped admin graph missing: %v", err)
	}
	if userID == "" || membershipStatus != "active" || !isPrimaryAdmin || roleCode != "school_admin" || passwordHash == "" || strings.Contains(passwordHash, "safe-password-123") {
		t.Fatalf("unexpected bootstrap graph user=%q membership=%q primary=%v role=%q hash=%q", userID, membershipStatus, isPrimaryAdmin, roleCode, passwordHash)
	}
	var auditCount int
	if err := db.QueryRow(`SELECT COUNT(*) FROM audit_events WHERE tenant_id=? AND actor_user_id=? AND request_id='req-bootstrap-admin' AND action='tenants.bootstrap_admin' AND resource_type='user'`, tenantID, platformMasterID).Scan(&auditCount); err != nil {
		t.Fatalf("audit lookup failed: %v", err)
	}
	if auditCount != 1 {
		t.Fatalf("expected one bootstrap audit event, got %d", auditCount)
	}
}

func TestFormatDBValueSupportsPostgresTimeValues(t *testing.T) {
	got := formatDBValue(time.Date(2026, 5, 9, 10, 0, 0, 0, time.UTC))
	if got != "2026-05-09T10:00:00Z" {
		t.Fatalf("expected RFC3339 timestamp, got %q", got)
	}
}

func TestBootstrapTenantAdminReturnsTenantNotActiveForArchivedTenant(t *testing.T) {
	db := openPlatformTestDB(t)
	seedPlatformFixture(t, db)
	a := New(Config{}, Dependencies{DB: db})
	tenantID := createTenantForPlatformTest(t, a, db)
	if _, err := db.Exec(`UPDATE tenants SET status='archived' WHERE id=?`, tenantID); err != nil {
		t.Fatalf("archive tenant fixture failed: %v", err)
	}

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/platform/tenants/"+tenantID+"/bootstrap-admin", strings.NewReader(`{"email":"admin-archived@smanusantara.sch.id","displayName":"Archived Admin","password": "safe-password-123"}`))
	req.SetPathValue("id", tenantID)
	req = withCSRFCookie(req).WithContext(WithSubject(req.Context(), Subject{UserID: platformMasterID, Permissions: []string{"tenants:bootstrap"}}))
	a.bootstrapTenantAdmin(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d body=%s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), "tenant_not_active") {
		t.Fatalf("expected tenant_not_active response, body=%s", rec.Body.String())
	}
}

func TestBootstrapTenantAdminReplacesPrimaryAdminWithoutDuplicatePrimary(t *testing.T) {
	db := openPlatformTestDB(t)
	seedPlatformFixture(t, db)
	a := New(Config{}, Dependencies{DB: db})
	tenantID := createTenantForPlatformTest(t, a, db)

	insertAdminForPlatformTest(t, a, tenantID, "first-admin@smanusantara.sch.id", "First Admin")
	insertAdminForPlatformTest(t, a, tenantID, "second-admin@smanusantara.sch.id", "Second Admin")

	var primaryCount int
	if err := db.QueryRow(`SELECT COUNT(*) FROM tenant_memberships WHERE tenant_id=? AND status='active' AND is_primary_admin=TRUE`, tenantID).Scan(&primaryCount); err != nil {
		t.Fatalf("primary admin count lookup failed: %v", err)
	}
	if primaryCount != 1 {
		t.Fatalf("expected exactly one primary admin, got %d", primaryCount)
	}
	var firstPrimary, secondPrimary bool
	if err := db.QueryRow(`SELECT tm.is_primary_admin FROM tenant_memberships tm JOIN users u ON u.id=tm.user_id WHERE tm.tenant_id=? AND u.email='first-admin@smanusantara.sch.id'`, tenantID).Scan(&firstPrimary); err != nil {
		t.Fatalf("first primary lookup failed: %v", err)
	}
	if err := db.QueryRow(`SELECT tm.is_primary_admin FROM tenant_memberships tm JOIN users u ON u.id=tm.user_id WHERE tm.tenant_id=? AND u.email='second-admin@smanusantara.sch.id'`, tenantID).Scan(&secondPrimary); err != nil {
		t.Fatalf("second primary lookup failed: %v", err)
	}
	if firstPrimary || !secondPrimary {
		t.Fatalf("expected second admin primary only, first=%v second=%v", firstPrimary, secondPrimary)
	}
}

func TestDeletePlatformTenantArchivesTenantMembershipsRolesAndAudit(t *testing.T) {
	db := openPlatformTestDB(t)
	seedPlatformFixture(t, db)
	a := New(Config{}, Dependencies{DB: db})
	tenantID := createTenantForPlatformTest(t, a, db)
	insertBootstrapAdminForPlatformTest(t, a, tenantID)

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodDelete, "/api/v1/platform/tenants/"+tenantID, nil)
	req.SetPathValue("id", tenantID)
	ctx := WithSubject(req.Context(), Subject{UserID: platformMasterID, Permissions: []string{"tenants:delete"}})
	ctx = context.WithValue(ctx, requestIDKey, "req-delete-tenant")
	req = withCSRFCookie(req).WithContext(ctx)

	a.deletePlatformTenant(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d body=%s", rec.Code, rec.Body.String())
	}
	var tenantStatus string
	if err := db.QueryRow(`SELECT status FROM tenants WHERE id=?`, tenantID).Scan(&tenantStatus); err != nil {
		t.Fatalf("tenant status lookup failed: %v", err)
	}
	var activeMemberships, activeRoles, auditCount int
	if err := db.QueryRow(`SELECT COUNT(*) FROM tenant_memberships WHERE tenant_id=? AND status <> 'archived'`, tenantID).Scan(&activeMemberships); err != nil {
		t.Fatalf("membership lookup failed: %v", err)
	}
	if err := db.QueryRow(`SELECT COUNT(*) FROM user_roles ur JOIN tenant_memberships tm ON tm.id=ur.membership_id WHERE tm.tenant_id=?`, tenantID).Scan(&activeRoles); err != nil {
		t.Fatalf("role link lookup failed: %v", err)
	}
	if err := db.QueryRow(`SELECT COUNT(*) FROM audit_events WHERE tenant_id=? AND actor_user_id=? AND request_id='req-delete-tenant' AND action='tenants.delete'`, tenantID, platformMasterID).Scan(&auditCount); err != nil {
		t.Fatalf("audit lookup failed: %v", err)
	}
	if tenantStatus != "archived" || activeMemberships != 0 || activeRoles != 0 || auditCount != 1 {
		t.Fatalf("expected archived tenant, memberships=0 roles=0 audit=1; got status=%q memberships=%d roles=%d audit=%d", tenantStatus, activeMemberships, activeRoles, auditCount)
	}
}

func TestDeletePlatformTenantDoesNotArchiveOtherTenantMembershipForSameUser(t *testing.T) {
	db := openPlatformTestDB(t)
	seedPlatformFixture(t, db)
	a := New(Config{}, Dependencies{DB: db})
	tenantA := createTenantForPlatformTest(t, a, db)
	if _, err := db.Exec(`INSERT INTO tenants (id, code, name, status) VALUES ('aaaaaaaa-0000-7000-8000-000000000001', 'tenant-other', 'Tenant Other', 'active')`); err != nil {
		t.Fatalf("insert second tenant failed: %v", err)
	}
	tenantB := "aaaaaaaa-0000-7000-8000-000000000001"
	tx := mustBeginTx(t, db)
	if err := seedTenantDefaultRolesWithContext(context.Background(), tx, tenantB); err != nil {
		t.Fatalf("seed second tenant roles failed: %v", err)
	}
	if err := tx.Commit(); err != nil {
		t.Fatalf("commit second tenant roles failed: %v", err)
	}
	insertAdminForPlatformTest(t, a, tenantA, "shared-admin@smanusantara.sch.id", "Shared Admin A")
	insertAdminForPlatformTest(t, a, tenantB, "shared-admin@smanusantara.sch.id", "Shared Admin B")

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodDelete, "/api/v1/platform/tenants/"+tenantA, nil)
	req.SetPathValue("id", tenantA)
	req = withCSRFCookie(req).WithContext(WithSubject(req.Context(), Subject{UserID: platformMasterID, Permissions: []string{"tenants:delete"}}))
	a.deletePlatformTenant(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d body=%s", rec.Code, rec.Body.String())
	}
	var otherStatus string
	var otherRoleLinks int
	if err := db.QueryRow(`SELECT tm.status FROM tenant_memberships tm JOIN users u ON u.id=tm.user_id WHERE tm.tenant_id=? AND u.email='shared-admin@smanusantara.sch.id'`, tenantB).Scan(&otherStatus); err != nil {
		t.Fatalf("other membership lookup failed: %v", err)
	}
	if err := db.QueryRow(`SELECT COUNT(*) FROM user_roles ur JOIN tenant_memberships tm ON tm.id=ur.membership_id WHERE tm.tenant_id=?`, tenantB).Scan(&otherRoleLinks); err != nil {
		t.Fatalf("other role links lookup failed: %v", err)
	}
	if otherStatus != "active" || otherRoleLinks != 1 {
		t.Fatalf("expected other tenant membership active with role link intact, status=%q roleLinks=%d", otherStatus, otherRoleLinks)
	}
}

func TestRolesAndPermissionsPreservesPlatformPermissionsWhenMasterActsAsTenant(t *testing.T) {
	db := openPlatformTestDB(t)
	seedPlatformFixture(t, db)
	a := New(Config{}, Dependencies{DB: db})
	tenantID := createTenantForPlatformTest(t, a, db)

	roles, perms, err := a.rolesAndPermissions(context.Background(), platformMasterID, tenantID)
	if err != nil {
		t.Fatalf("rolesAndPermissions failed: %v", err)
	}
	if !contains(roles, "master_admin") || !contains(perms, "platform:admin") || !contains(perms, "tenants:read") || !contains(perms, "tenants:switch") || !contains(perms, "tenants:write") {
		t.Fatalf("expected platform master role/perms preserved after act-as tenant, roles=%v perms=%v", roles, perms)
	}
}

const platformMasterID = "90000000-0000-7000-8000-000000000001"

func insertBootstrapAdminForPlatformTest(t *testing.T, a *App, tenantID string) {
	t.Helper()
	insertAdminForPlatformTest(t, a, tenantID, "delete-admin@smanusantara.sch.id", "Delete Admin")
}

func insertAdminForPlatformTest(t *testing.T, a *App, tenantID, email, displayName string) {
	t.Helper()
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/platform/tenants/"+tenantID+"/bootstrap-admin", strings.NewReader(`{"email":"`+email+`","displayName":"`+displayName+`","password": "safe-password-123"}`))
	req.SetPathValue("id", tenantID)
	req = withCSRFCookie(req).WithContext(WithSubject(req.Context(), Subject{UserID: platformMasterID, Permissions: []string{"tenants:bootstrap"}}))
	a.bootstrapTenantAdmin(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("bootstrap admin fixture failed: %d body=%s", rec.Code, rec.Body.String())
	}
}

func withCSRFCookie(req *http.Request) *http.Request {
	req.AddCookie(&http.Cookie{Name: csrfCookieName, Value: "test-csrf"})
	req.Header.Set("X-CSRF-Token", "test-csrf")
	return req
}

func mustBeginTx(t *testing.T, db *sql.DB) *sql.Tx {
	t.Helper()
	tx, err := db.Begin()
	if err != nil {
		t.Fatalf("begin tx: %v", err)
	}
	t.Cleanup(func() { _ = tx.Rollback() })
	return tx
}

func createTenantForPlatformTest(t *testing.T, a *App, db *sql.DB) string {
	t.Helper()
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/platform/tenants", strings.NewReader(`{"code":"tenant-new","name":"Tenant New"}`))
	req = withCSRFCookie(req).WithContext(WithSubject(req.Context(), Subject{UserID: platformMasterID, Permissions: []string{"tenants:write"}}))
	a.createPlatformTenant(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create tenant fixture failed: %d body=%s", rec.Code, rec.Body.String())
	}
	var id string
	if err := db.QueryRow(`SELECT id FROM tenants WHERE code='tenant-new'`).Scan(&id); err != nil {
		t.Fatalf("created tenant lookup failed: %v", err)
	}
	return id
}

type fakeLogoStorage struct {
	objectKey   string
	contentType string
	body        []byte
}

func (s *fakeLogoStorage) PutTenantLogo(ctx context.Context, objectKey string, contentType string, body io.Reader) error {
	s.objectKey = objectKey
	s.contentType = contentType
	data, err := io.ReadAll(body)
	if err != nil {
		return err
	}
	s.body = data
	return nil
}

func newLogoUploadRequest(t *testing.T, tenantID, filename string, data []byte) *http.Request {
	t.Helper()
	body := bytes.NewBuffer(nil)
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("logo", filename)
	if err != nil {
		t.Fatalf("create form file: %v", err)
	}
	if _, err := part.Write(data); err != nil {
		t.Fatalf("write form file: %v", err)
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("close multipart writer: %v", err)
	}
	req := httptest.NewRequest(http.MethodPost, "/api/v1/platform/tenants/"+tenantID+"/logo", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	return req
}

func openPlatformTestDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	_, err = db.Exec(`
		CREATE TABLE tenants (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-7000-8000-' || lower(hex(randomblob(6)))), code TEXT NOT NULL UNIQUE, name TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active', logo_url TEXT NOT NULL DEFAULT '', logo_object_key TEXT NOT NULL DEFAULT '', logo_content_type TEXT NOT NULL DEFAULT '', created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
		CREATE TABLE tenant_theme_settings (tenant_id TEXT PRIMARY KEY, preset TEXT NOT NULL, primary_color TEXT NOT NULL, accent_color TEXT NOT NULL, logo_url TEXT NOT NULL DEFAULT '', version INTEGER NOT NULL DEFAULT 1, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
		CREATE TABLE users (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-7000-8000-' || lower(hex(randomblob(6)))), email TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
		CREATE TABLE password_credentials (user_id TEXT PRIMARY KEY, password_hash TEXT NOT NULL, must_change_password TEXT NOT NULL, password_changed_at TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
		CREATE TABLE tenant_memberships (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-7000-8000-' || lower(hex(randomblob(6)))), tenant_id TEXT NOT NULL, user_id TEXT NOT NULL, status TEXT NOT NULL, is_primary_admin BOOLEAN NOT NULL DEFAULT FALSE, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, UNIQUE (tenant_id, user_id));
		CREATE TABLE roles (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-7000-8000-' || lower(hex(randomblob(6)))), tenant_id TEXT, code TEXT NOT NULL, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', is_system TEXT NOT NULL DEFAULT 'true', created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, UNIQUE (tenant_id, code));
		CREATE TABLE permissions (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-7000-8000-' || lower(hex(randomblob(6)))), code TEXT NOT NULL UNIQUE, description TEXT NOT NULL DEFAULT '', created_at TEXT DEFAULT CURRENT_TIMESTAMP);
		CREATE TABLE role_permissions (role_id TEXT NOT NULL, permission_id TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (role_id, permission_id));
		CREATE TABLE platform_user_roles (user_id TEXT NOT NULL, role_id TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (user_id, role_id));
		CREATE TABLE user_roles (membership_id TEXT NOT NULL, role_id TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (membership_id, role_id));
		CREATE TABLE audit_events (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-7000-8000-' || lower(hex(randomblob(6)))), tenant_id TEXT, actor_user_id TEXT, request_id TEXT NOT NULL DEFAULT '', action TEXT NOT NULL, resource_type TEXT NOT NULL, resource_id TEXT NOT NULL DEFAULT '', metadata TEXT NOT NULL DEFAULT '{}', created_at TEXT DEFAULT CURRENT_TIMESTAMP);
	`)
	if err != nil {
		t.Fatalf("create platform test schema: %v", err)
	}
	return db
}

func seedPlatformFixture(t *testing.T, db *sql.DB) {
	t.Helper()
	_, err := db.Exec(`
		INSERT INTO users (id, email, display_name, status) VALUES ('90000000-0000-7000-8000-000000000001', 'master@morfoschools.local', 'Master Admin', 'active');
		INSERT INTO permissions (code, description) VALUES
			('platform:admin', 'Platform admin'),
			('tenants:read', 'Read tenants'),
			('tenants:switch', 'Switch tenants'),
			('tenants:write', 'Write tenants'),
			('tenants:delete', 'Delete tenants'),
			('tenants:bootstrap', 'Bootstrap tenant admins'),
			('tenant:admin', 'Tenant admin'),
			('users:read', 'Read users'),
			('users:write', 'Write users');
		INSERT INTO roles (id, tenant_id, code, name, description, is_system) VALUES ('91000000-0000-7000-8000-000000000001', NULL, 'master_admin', 'Master Admin', '', 'true');
		INSERT INTO role_permissions (role_id, permission_id) SELECT '91000000-0000-7000-8000-000000000001', id FROM permissions WHERE code IN ('platform:admin','tenants:read','tenants:switch','tenants:write','tenants:bootstrap','tenants:delete');
		INSERT INTO platform_user_roles (user_id, role_id) VALUES ('90000000-0000-7000-8000-000000000001', '91000000-0000-7000-8000-000000000001');
	`)
	if err != nil {
		t.Fatalf("seed platform fixture: %v", err)
	}
}
