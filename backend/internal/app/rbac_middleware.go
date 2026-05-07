package app

import (
	"context"
	"net/http"

	"morfoschools/backend/internal/platform/rbac"
)

type Subject = rbac.Subject

type subjectContextKey struct{}

func WithSubject(ctx context.Context, subject Subject) context.Context {
	return context.WithValue(ctx, subjectContextKey{}, subject)
}

func SubjectFromContext(ctx context.Context) (Subject, bool) {
	subject, ok := ctx.Value(subjectContextKey{}).(Subject)
	return subject, ok
}

func subjectFromSession(s sessionContext) Subject {
	return Subject{
		UserID:            s.UserID,
		TenantID:          s.TenantID,
		EffectiveTenantID: s.EffectiveTenantID,
		Roles:             append([]string(nil), s.Roles...),
		Permissions:       append([]string(nil), s.Permissions...),
	}
}

func (a *App) authenticated(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		session, err := a.sessionByToken(r.Context(), cookieValue(r, sessionCookieName))
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, errPayload(r, "unauthenticated", "Authentication required"))
			return
		}
		next.ServeHTTP(w, r.WithContext(WithSubject(r.Context(), subjectFromSession(session))))
	})
}

func (a *App) requireAnyPermission(permissions ...string) func(http.Handler) http.Handler {
	return a.requirePermission(rbac.Requirement{AnyPermission: permissions})
}

func (a *App) requireTenantPermission(tenantID string, permissions ...string) func(http.Handler) http.Handler {
	return a.requirePermission(rbac.Requirement{TenantID: tenantID, AnyPermission: permissions})
}

func (a *App) requirePermission(requirement rbac.Requirement) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			subject, ok := SubjectFromContext(r.Context())
			if !ok || subject.UserID == "" {
				writeJSON(w, http.StatusUnauthorized, errPayload(r, "unauthenticated", "Authentication required"))
				return
			}
			decision := rbac.Authorize(subject, requirement)
			if !decision.Allowed {
				writeJSON(w, http.StatusForbidden, errPayload(r, "forbidden", "Missing required permission"))
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
