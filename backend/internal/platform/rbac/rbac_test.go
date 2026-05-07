package rbac

import "testing"

func TestAuthorizeAllowsMatchingPermission(t *testing.T) {
	decision := Authorize(Subject{UserID: "u1", TenantID: "t1", Permissions: []string{"courses:read"}}, Requirement{TenantID: "t1", AnyPermission: []string{"courses:read"}})
	if !decision.Allowed {
		t.Fatalf("expected allowed, got %s", decision.Reason)
	}
}

func TestAuthorizeDeniesMissingPermission(t *testing.T) {
	decision := Authorize(Subject{UserID: "u1", TenantID: "t1"}, Requirement{TenantID: "t1", AnyPermission: []string{"courses:read"}})
	if decision.Allowed || decision.Reason != "missing_permission" {
		t.Fatalf("expected missing_permission, got %#v", decision)
	}
}

func TestAuthorizeDeniesTenantMismatch(t *testing.T) {
	decision := Authorize(Subject{UserID: "u1", TenantID: "t1", Permissions: []string{"courses:read"}}, Requirement{TenantID: "t2", AnyPermission: []string{"courses:read"}})
	if decision.Allowed || decision.Reason != "tenant_mismatch" {
		t.Fatalf("expected tenant_mismatch, got %#v", decision)
	}
}

func TestAuthorizeAllowsPlatformAdminWhenExplicitlyAllowed(t *testing.T) {
	decision := Authorize(Subject{UserID: "u1", TenantID: "", Permissions: []string{"platform:admin"}}, Requirement{TenantID: "t2", AllowPlatform: true})
	if !decision.Allowed {
		t.Fatalf("expected platform allowed, got %#v", decision)
	}
}
