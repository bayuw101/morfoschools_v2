package rbac

import "slices"

type Subject struct {
	UserID            string
	TenantID          string
	EffectiveTenantID string
	Roles             []string
	Permissions       []string
}

type Requirement struct {
	TenantID       string
	AnyPermission  []string
	AllPermissions []string
	AllowPlatform  bool
}

type Decision struct {
	Allowed bool
	Reason  string
}

func Authorize(subject Subject, req Requirement) Decision {
	if subject.UserID == "" {
		return Decision{Reason: "unauthenticated"}
	}
	if req.TenantID != "" {
		effective := subject.EffectiveTenantID
		if effective == "" {
			effective = subject.TenantID
		}
		if effective != req.TenantID && !(req.AllowPlatform && has(subject.Permissions, "platform:admin")) {
			return Decision{Reason: "tenant_mismatch"}
		}
	}
	for _, p := range req.AllPermissions {
		if !has(subject.Permissions, p) {
			return Decision{Reason: "missing_permission"}
		}
	}
	if len(req.AnyPermission) > 0 {
		for _, p := range req.AnyPermission {
			if has(subject.Permissions, p) {
				return Decision{Allowed: true}
			}
		}
		return Decision{Reason: "missing_permission"}
	}
	return Decision{Allowed: true}
}

func has(values []string, want string) bool { return slices.Contains(values, want) }
