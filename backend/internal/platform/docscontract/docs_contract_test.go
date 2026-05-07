package docscontract

import (
	"os"
	"strings"
	"testing"
)

func TestOpenAPIAndManifestContractsExist(t *testing.T) {
	openapi, err := os.ReadFile("../../../../docs/api/openapi.yaml")
	if err != nil {
		t.Fatal(err)
	}
	for _, required := range []string{"openapi:", "/api/v1/auth/login", "/api/v1/tenants/current/theme", "TenantTheme", "morfoschools_session", "ErrorEnvelope"} {
		if !strings.Contains(string(openapi), required) {
			t.Fatalf("openapi missing %q", required)
		}
	}
	manifest, err := os.ReadFile("../../../../docs/ai-tools/MANIFEST_TEMPLATE.md")
	if err != nil {
		t.Fatal(err)
	}
	for _, required := range []string{"Intent", "Permission", "Confirmation Gate", "Success Proof", "Failure Cases"} {
		if !strings.Contains(string(manifest), required) {
			t.Fatalf("manifest missing %q", required)
		}
	}
}
