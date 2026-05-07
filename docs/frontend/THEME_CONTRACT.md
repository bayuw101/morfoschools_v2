# Tenant Theme Contract

Status: ISSUE-015 backend contract baseline.

## Purpose

Morfoschools supports tenant palette bootstrap without allowing raw CSS injection and without relying on repeated database reads for every request.

The backend exposes the current tenant theme through:

```txt
GET /api/v1/tenants/current/theme
```

The endpoint requires the existing browser session cookie. For `master_admin`, an effective tenant must be selected before reading tenant theme settings.

## Response Shape

```json
{
  "data": {
    "theme": {
      "tenantId": "11111111-1111-7111-8111-111111111111",
      "preset": "morfoschools-default",
      "primaryColor": "oklch(0.52 0.16 250)",
      "accentColor": "oklch(0.68 0.18 70)",
      "logoUrl": "",
      "version": 1,
      "cacheKey": "tenant_theme:11111111-1111-7111-8111-111111111111:v1",
      "cssVariables": {
        "--morfoschool-color-primary": "oklch(0.52 0.16 250)",
        "--morfoschool-color-accent": "oklch(0.68 0.18 70)"
      }
    }
  }
}
```

## Safety Rules

Allowed color formats:

- Hex: `#fff`, `#ffffff`
- OKLCH: `oklch(0.52 0.16 250)`

Rejected values include raw CSS fragments, semicolon injection, arbitrary property names, JavaScript URLs, and non-HTTPS logo URLs.

The backend owns the allowlist for CSS variable names:

```txt
--morfoschool-color-primary
--morfoschool-color-accent
--morfoschool-logo-url optional when logoUrl is non-empty
```

Frontend code must not convert tenant-provided strings into arbitrary CSS properties.

## Cache Contract

Tenant themes are versioned. The cache key format is:

```txt
tenant_theme:{tenantId}:v{version}
```

When `tenant_theme_settings.version` changes, clients and backend cache lookups naturally move to a new key.

Backend uses Valkey when configured and keeps a safe in-process fallback for tests/local degraded mode.

## No-Flicker Bootstrap Direction

Frontend should use the Morfosis default palette for initial paint, then apply the authenticated tenant theme as soon as session/theme loading resolves.

Future SSR/no-flicker work should inject only the allowlisted CSS variables above, never raw tenant CSS.

Recommended frontend sequence for ISSUE-017:

1. Render base default Morfosis variables in global CSS.
2. Load `/api/v1/auth/me`.
3. Load `/api/v1/tenants/current/theme` when tenant context exists.
4. Apply only `theme.cssVariables` keys that are in the allowlist.
5. Persist dark/light local preference separately from tenant palette.
