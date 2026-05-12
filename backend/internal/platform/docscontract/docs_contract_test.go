package docscontract

import (
	"os"
	"strings"
	"testing"
)

func TestOpenAPIAndManifestContractsExist(t *testing.T) {
	openapi := readDoc(t, "api/openapi.yaml")
	for _, required := range []string{"openapi:", "/api/v1/auth/login", "/api/v1/tenants/current/theme", "TenantTheme", "morfoschools_session", "ErrorEnvelope"} {
		if !strings.Contains(openapi, required) {
			t.Fatalf("openapi missing %q", required)
		}
	}
	manifest := readDoc(t, "ai-tools/MANIFEST_TEMPLATE.md")
	for _, required := range []string{"Intent", "Permission", "Confirmation Gate", "Success Proof", "Failure Cases"} {
		if !strings.Contains(manifest, required) {
			t.Fatalf("manifest missing %q", required)
		}
	}
}

func TestTenantsAPIDocumentationContract(t *testing.T) {
	openapi := readDoc(t, "api/openapi.yaml")
	for _, required := range []string{
		"/api/v1/platform/tenants:",
		"/api/v1/platform/tenants/{id}/bootstrap-admin:",
		"tenants:read",
		"tenants:write",
		"tenants:bootstrap",
		"PlatformTenantRow",
		"CreateTenantRequest",
		"BootstrapTenantAdminRequest",
		"tenants.create",
		"tenants.bootstrap_admin",
	} {
		if !strings.Contains(openapi, required) {
			t.Fatalf("openapi tenants contract missing %q", required)
		}
	}

	manifest := readDoc(t, "ai-tools/tenants.md")
	for _, required := range []string{
		"Manage platform tenant/school onboarding",
		"tenants:read",
		"tenants:write",
		"tenants:bootstrap",
		"POST /api/v1/platform/tenants",
		"POST /api/v1/platform/tenants/{id}/bootstrap-admin",
		"Confirmation Gate",
		"Success Proof",
		"tenants.create",
		"tenants.bootstrap_admin",
	} {
		if !strings.Contains(manifest, required) {
			t.Fatalf("tenants AI tool manifest missing %q", required)
		}
	}
}

func TestUsersAPIDocumentationContract(t *testing.T) {
	openapi := readDoc(t, "api/openapi.yaml")
	for _, required := range []string{
		"/api/v1/users:",
		"/api/v1/users/{id}:",
		"/api/v1/users/{id}/deactivate:",
		"users:read",
		"users:write",
		"UserDirectoryRow",
		"CreateUserRequest",
		"UpdateUserRequest",
		"tenant_context_required",
		"role_not_found",
		"users.create",
		"users.update",
		"users.deactivate",
	} {
		if !strings.Contains(openapi, required) {
			t.Fatalf("openapi users contract missing %q", required)
		}
	}

	manifest := readDoc(t, "ai-tools/users.md")
	for _, required := range []string{
		"Manage tenant users",
		"users:read",
		"users:write",
		"GET /api/v1/users",
		"POST /api/v1/users",
		"PATCH /api/v1/users/{id}",
		"PATCH /api/v1/users/{id}/deactivate",
		"Confirmation Gate",
		"Audit evidence",
		"Tenant isolation",
	} {
		if !strings.Contains(manifest, required) {
			t.Fatalf("users AI tool manifest missing %q", required)
		}
	}
}

func TestAcademicYearsTermsAPIDocumentationContract(t *testing.T) {
	openapi := readDoc(t, "api/openapi.yaml")
	for _, required := range []string{
		"/api/v1/academic-years:",
		"/api/v1/academic-years/{id}/archive:",
		"/api/v1/terms:",
		"/api/v1/terms/{id}:",
		"academic:read",
		"academic:write",
		"AcademicYearRow",
		"TermRow",
		"CreateAcademicYearRequest",
		"CreateTermRequest",
		"UpdateTermRequest",
		"tenant_context_required",
		"term_outside_academic_year",
		"academic_years.create",
		"terms.create",
		"terms.update",
		"academic_years.archive",
	} {
		if !strings.Contains(openapi, required) {
			t.Fatalf("openapi academic contract missing %q", required)
		}
	}

	manifest := readDoc(t, "ai-tools/academic-years-terms.md")
	for _, required := range []string{
		"Manage academic years and terms",
		"academic:read",
		"academic:write",
		"GET /api/v1/academic-years",
		"POST /api/v1/academic-years",
		"POST /api/v1/terms",
		"PATCH /api/v1/terms/{id}",
		"PATCH /api/v1/academic-years/{id}/archive",
		"Confirmation Gate",
		"Audit evidence",
		"Tenant isolation",
	} {
		if !strings.Contains(manifest, required) {
			t.Fatalf("academic AI tool manifest missing %q", required)
		}
	}
}

func TestClassSectionsAPIDocumentationContract(t *testing.T) {
	openapi := readDoc(t, "api/openapi.yaml")
	for _, required := range []string{
		"/api/v1/class-sections:",
		"/api/v1/class-sections/{id}:",
		"/api/v1/class-sections/{id}/archive:",
		"academic:read",
		"academic:write",
		"ClassSectionRow",
		"UpsertClassSectionRequest",
		"tenant_context_required",
		"academic_year_not_found",
		"homeroom_teacher_not_found",
		"class_sections.create",
		"class_sections.update",
		"class_sections.archive",
	} {
		if !strings.Contains(openapi, required) {
			t.Fatalf("openapi class sections contract missing %q", required)
		}
	}

	manifest := readDoc(t, "ai-tools/class-sections.md")
	for _, required := range []string{
		"Manage class sections",
		"academic:read",
		"academic:write",
		"GET /api/v1/class-sections",
		"POST /api/v1/class-sections",
		"PATCH /api/v1/class-sections/{id}",
		"PATCH /api/v1/class-sections/{id}/archive",
		"Confirmation Gate",
		"Audit evidence",
		"Tenant isolation",
	} {
		if !strings.Contains(manifest, required) {
			t.Fatalf("class sections AI tool manifest missing %q", required)
		}
	}
}

func TestGoldenCRUDProtocolDocsExist(t *testing.T) {
	checks := map[string][]string{
		"rewrite/GOLDEN_CRUD_PATTERN.md": {
			"Schema / existing tables",
			"backend repository/service/handler",
			"RBAC + tenant isolation",
			"OpenAPI + AI Tool Manifest",
			"docs/rewrite/module-reviews/ISSUE-NNN-<module>.md",
			"ISSUE-032 Golden Users Module Expectations",
		},
		"rewrite/BROWSER_SMOKE_PROTOCOL.md": {
			"Frontend: http://localhost:1666",
			"Login/session",
			"Initial loading",
			"Create flow",
			"Denied/limited role behavior",
		},
		"security/SECURITY_REVIEW_PROTOCOL.md": {
			"Authentication",
			"Authorization",
			"Tenant isolation",
			"CSRF/session",
			"Audit",
			"Sensitive data",
		},
		"rewrite/PERFORMANCE_REVIEW_PROTOCOL.md": {
			"Backend Query/Index Review",
			"Frontend Perceived Performance",
			"Exam critical path impact",
			"Do not introduce ClickHouse, AI providers, Google APIs",
		},
	}

	for docPath, snippets := range checks {
		content := readDoc(t, docPath)
		for _, snippet := range snippets {
			if !strings.Contains(content, snippet) {
				t.Fatalf("%s missing %q", docPath, snippet)
			}
		}
	}
}

func readDoc(t *testing.T, path string) string {
	t.Helper()
	content, err := os.ReadFile("../../../../docs/" + path)
	if err != nil {
		t.Fatal(err)
	}
	return string(content)
}
