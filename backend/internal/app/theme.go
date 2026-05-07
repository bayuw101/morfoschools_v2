package app

import (
	"bufio"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/http"
	"regexp"
	"strings"
	"sync"
	"time"
)

type tenantTheme struct {
	TenantID     string `json:"tenantId"`
	Preset       string `json:"preset"`
	PrimaryColor string `json:"primaryColor"`
	AccentColor  string `json:"accentColor"`
	LogoURL      string `json:"logoUrl"`
	Version         int               `json:"version"`
	CacheKey        string            `json:"cacheKey"`
	CSSVariableData map[string]string `json:"cssVariables"`
}

func (t tenantTheme) CSSVariables() map[string]string {
	vars := map[string]string{
		"--morfoschool-color-primary": t.PrimaryColor,
		"--morfoschool-color-accent":  t.AccentColor,
	}
	if t.LogoURL != "" {
		vars["--morfoschool-logo-url"] = t.LogoURL
	}
	return vars
}

type themeCache interface {
	Get(ctx context.Context, tenantID string, version int) (tenantTheme, bool, error)
	Set(ctx context.Context, theme tenantTheme) error
}

type memoryThemeCache struct {
	mu     sync.RWMutex
	themes map[string]tenantTheme
}

func newMemoryThemeCache() *memoryThemeCache {
	return &memoryThemeCache{themes: map[string]tenantTheme{}}
}

func (c *memoryThemeCache) Get(ctx context.Context, tenantID string, version int) (tenantTheme, bool, error) {
	_ = ctx
	c.mu.RLock()
	defer c.mu.RUnlock()
	theme, ok := c.themes[themeCacheKey(tenantID, version)]
	return theme, ok, nil
}

func (c *memoryThemeCache) Set(ctx context.Context, theme tenantTheme) error {
	_ = ctx
	theme.CacheKey = themeCacheKey(theme.TenantID, theme.Version)
	c.mu.Lock()
	defer c.mu.Unlock()
	c.themes[theme.CacheKey] = theme
	return nil
}

type redisThemeCache struct {
	address string
}

func NewValkeyThemeCache(rawURL string) themeCache {
	address := strings.TrimPrefix(strings.TrimSpace(rawURL), "redis://")
	if address == "" {
		return newMemoryThemeCache()
	}
	if at := strings.LastIndex(address, "@"); at >= 0 {
		address = address[at+1:]
	}
	if slash := strings.Index(address, "/"); slash >= 0 {
		address = address[:slash]
	}
	if !strings.Contains(address, ":") {
		address = net.JoinHostPort(address, "6379")
	}
	return &redisThemeCache{address: address}
}

func (c *redisThemeCache) Get(ctx context.Context, tenantID string, version int) (tenantTheme, bool, error) {
	payload, err := c.command(ctx, "GET", themeCacheKey(tenantID, version))
	if err != nil || payload == "" {
		return tenantTheme{}, false, err
	}
	var theme tenantTheme
	if err := json.Unmarshal([]byte(payload), &theme); err != nil {
		return tenantTheme{}, false, err
	}
	return theme, true, nil
}

func (c *redisThemeCache) Set(ctx context.Context, theme tenantTheme) error {
	theme.CacheKey = themeCacheKey(theme.TenantID, theme.Version)
	payload, err := json.Marshal(theme)
	if err != nil {
		return err
	}
	_, err = c.command(ctx, "SETEX", theme.CacheKey, "300", string(payload))
	return err
}

func (c *redisThemeCache) command(ctx context.Context, args ...string) (string, error) {
	d := net.Dialer{Timeout: 750 * time.Millisecond}
	conn, err := d.DialContext(ctx, "tcp", c.address)
	if err != nil {
		return "", err
	}
	defer conn.Close()
	_ = conn.SetDeadline(time.Now().Add(1500 * time.Millisecond))
	var b strings.Builder
	fmt.Fprintf(&b, "*%d\r\n", len(args))
	for _, arg := range args {
		fmt.Fprintf(&b, "$%d\r\n%s\r\n", len(arg), arg)
	}
	if _, err := conn.Write([]byte(b.String())); err != nil {
		return "", err
	}
	reader := bufio.NewReader(conn)
	line, err := reader.ReadString('\n')
	if err != nil {
		return "", err
	}
	line = strings.TrimSpace(line)
	if strings.HasPrefix(line, "-") {
		return "", fmt.Errorf("valkey error: %s", line)
	}
	if strings.HasPrefix(line, "+") || strings.HasPrefix(line, ":") {
		return strings.TrimPrefix(strings.TrimPrefix(line, "+"), ":"), nil
	}
	if strings.HasPrefix(line, "$-1") {
		return "", nil
	}
	if strings.HasPrefix(line, "$") {
		var n int
		_, _ = fmt.Sscanf(line, "$%d", &n)
		buf := make([]byte, n+2)
		if _, err := reader.Read(buf); err != nil {
			return "", err
		}
		return string(buf[:n]), nil
	}
	return "", fmt.Errorf("unsupported valkey response: %s", line)
}

var (
	safeHexColor   = regexp.MustCompile(`^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$`)
	safeOklchColor = regexp.MustCompile(`^oklch\(\s*(?:0(?:\.\d+)?|1(?:\.0+)?)\s+\d(?:\.\d+)?\s+\d{1,3}(?:\.\d+)?\s*\)$`)
	safeLogoURL    = regexp.MustCompile(`^https://[A-Za-z0-9._~:/?#\[\]@!$&'()*+,;=%-]+$`)
)

func (a *App) registerThemeRoutes(mux *http.ServeMux) {
	mux.Handle("/api/v1/tenants/current/theme", a.authenticated(http.HandlerFunc(a.currentTenantTheme)))
}

func (a *App) currentTenantTheme(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, errPayload(r, "method_not_allowed", "Method not allowed"))
		return
	}
	session, err := a.sessionByToken(r.Context(), cookieValue(r, sessionCookieName))
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, errPayload(r, "unauthenticated", "Authentication required"))
		return
	}
	tenantID := session.EffectiveTenantID
	if tenantID == "" {
		tenantID = session.TenantID
	}
	if tenantID == "" {
		writeJSON(w, http.StatusBadRequest, errPayload(r, "tenant_context_required", "Tenant context is required"))
		return
	}
	theme, err := a.loadTenantTheme(r.Context(), tenantID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, errPayload(r, "theme_lookup_failed", "Could not load tenant theme"))
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": map[string]any{"theme": theme}})
}

func (a *App) loadTenantTheme(ctx context.Context, tenantID string) (tenantTheme, error) {
	if a.deps.DB == nil {
		return defaultTenantTheme(tenantID), nil
	}
	var theme tenantTheme
	err := a.deps.DB.QueryRowContext(ctx, `SELECT tenant_id::text, preset, primary_color, accent_color, logo_url, version FROM tenant_theme_settings WHERE tenant_id=$1::uuid`, tenantID).Scan(&theme.TenantID, &theme.Preset, &theme.PrimaryColor, &theme.AccentColor, &theme.LogoURL, &theme.Version)
	if errors.Is(err, sql.ErrNoRows) {
		theme = defaultTenantTheme(tenantID)
	} else if err != nil {
		return tenantTheme{}, err
	}
	if err := validateTenantTheme(theme); err != nil {
		return tenantTheme{}, err
	}
	if a.deps.ThemeCache != nil {
		if cached, ok, err := a.deps.ThemeCache.Get(ctx, theme.TenantID, theme.Version); err == nil && ok {
			return cached, nil
		}
	}
	theme.CacheKey = themeCacheKey(theme.TenantID, theme.Version)
	theme.CSSVariableData = theme.CSSVariables()
	if a.deps.ThemeCache != nil {
		_ = a.deps.ThemeCache.Set(ctx, theme)
	}
	return theme, nil
}

func defaultTenantTheme(tenantID string) tenantTheme {
	return tenantTheme{TenantID: tenantID, Preset: "morfoschools-default", PrimaryColor: "oklch(0.52 0.16 250)", AccentColor: "oklch(0.68 0.18 70)", LogoURL: "", Version: 1}
}

func validateTenantTheme(theme tenantTheme) error {
	if strings.TrimSpace(theme.Preset) == "" || len(theme.Preset) > 80 || strings.ContainsAny(theme.Preset, "<>;{}") {
		return fmt.Errorf("unsafe preset")
	}
	if !safeColor(theme.PrimaryColor) {
		return fmt.Errorf("unsafe primary color")
	}
	if !safeColor(theme.AccentColor) {
		return fmt.Errorf("unsafe accent color")
	}
	if theme.LogoURL != "" && !safeLogoURL.MatchString(theme.LogoURL) {
		return fmt.Errorf("unsafe logo url")
	}
	return nil
}

func safeColor(value string) bool {
	value = strings.TrimSpace(value)
	return safeHexColor.MatchString(value) || safeOklchColor.MatchString(value)
}

func themeCacheKey(tenantID string, version int) string {
	return fmt.Sprintf("tenant_theme:%s:v%d", tenantID, version)
}
