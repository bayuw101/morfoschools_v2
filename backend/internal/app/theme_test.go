package app

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestCurrentTenantThemeRequiresAuthenticatedSession(t *testing.T) {
	a := New(Config{}, Dependencies{})
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/tenants/current/theme", nil)

	a.Handler().ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized || !strings.Contains(rec.Body.String(), `"code":"unauthenticated"`) {
		t.Fatalf("expected unauthenticated theme response, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestLoadTenantThemeFallsBackToMorfosisDefaultWithoutDatabase(t *testing.T) {
	a := New(Config{}, Dependencies{})

	theme, err := a.loadTenantTheme(t.Context(), "tenant-1")
	if err != nil {
		t.Fatalf("load fallback theme: %v", err)
	}
	if theme.Preset != "morfoschools-default" || theme.PrimaryColor == "" || theme.AccentColor == "" || theme.CacheKey != "" {
		t.Fatalf("unexpected fallback theme: %#v", theme)
	}
}

func TestValidateTenantThemeRejectsUnsafeColorInjection(t *testing.T) {
	theme := tenantTheme{Preset: "custom", PrimaryColor: "red; background:url(javascript:alert(1))", AccentColor: "oklch(0.68 0.18 70)", LogoURL: ""}

	if err := validateTenantTheme(theme); err == nil {
		t.Fatalf("expected unsafe primary color to be rejected")
	}
}

func TestValidateTenantThemeAcceptsSafeOklchAndHex(t *testing.T) {
	theme := tenantTheme{Preset: "morfoschools-default", PrimaryColor: "oklch(0.52 0.16 250)", AccentColor: "#f5a524", LogoURL: "https://cdn.example.test/logo.svg"}

	if err := validateTenantTheme(theme); err != nil {
		t.Fatalf("expected safe theme to pass validation: %v", err)
	}
}

func TestThemeCacheKeyIncludesTenantAndVersion(t *testing.T) {
	if got := themeCacheKey("tenant-1", 7); got != "tenant_theme:tenant-1:v7" {
		t.Fatalf("unexpected cache key: %s", got)
	}
}

func TestTenantThemeCSSVariablesUseSafeNames(t *testing.T) {
	theme := tenantTheme{TenantID: "tenant-1", Preset: "morfoschools-default", PrimaryColor: "oklch(0.52 0.16 250)", AccentColor: "#f5a524", LogoURL: "", Version: 3}
	vars := theme.CSSVariables()

	if vars["--morfoschool-color-primary"] != theme.PrimaryColor || vars["--morfoschool-color-accent"] != theme.AccentColor {
		t.Fatalf("unexpected css variable contract: %#v", vars)
	}
	if _, exists := vars["background"]; exists {
		t.Fatalf("css variable contract must not expose arbitrary property names: %#v", vars)
	}
}

func TestThemeCacheStoresByTenantVersion(t *testing.T) {
	cache := newMemoryThemeCache()
	theme := tenantTheme{TenantID: "tenant-1", Preset: "morfoschools-default", PrimaryColor: "oklch(0.52 0.16 250)", AccentColor: "#f5a524", Version: 9}

	if err := cache.Set(t.Context(), theme); err != nil {
		t.Fatalf("set cache: %v", err)
	}
	got, ok, err := cache.Get(t.Context(), theme.TenantID, theme.Version)
	if err != nil || !ok {
		t.Fatalf("expected cached theme, ok=%v err=%v", ok, err)
	}
	if got.CacheKey != "tenant_theme:tenant-1:v9" || got.PrimaryColor != theme.PrimaryColor {
		t.Fatalf("unexpected cached theme: %#v", got)
	}
}
