import { describe, expect, it } from "vitest";

import {
  applyTenantThemeVariables,
  fetchCurrentTenantTheme,
  normalizeLocalThemePreference,
  normalizeTenantTheme,
  sanitizeThemeVariables,
} from "./theme";

describe("theme contract", () => {
  it("normalizes invalid local theme preference to dark morfosis default", () => {
    expect(normalizeLocalThemePreference({ mode: "sepia", palette: "unknown" })).toEqual({
      mode: "dark",
      palette: "morfosis",
    });
  });

  it("keeps valid light mode preference and known palette", () => {
    expect(normalizeLocalThemePreference({ mode: "light", palette: "tokyo-night" })).toEqual({
      mode: "light",
      palette: "tokyo-night",
    });
  });

  it("accepts only allowlisted tenant css variables", () => {
    const safe = sanitizeThemeVariables({
      "--morfoschool-color-primary": "oklch(0.52 0.16 250)",
      "--morfoschool-color-accent": "#f5a524",
      background: "red",
      "--unknown": "blue",
    });

    expect(safe).toEqual({
      "--morfoschool-color-primary": "oklch(0.52 0.16 250)",
      "--morfoschool-color-accent": "#f5a524",
    });
  });

  it("rejects unsafe tenant variable values", () => {
    expect(
      sanitizeThemeVariables({
        "--morfoschool-color-primary": "red; background:url(javascript:alert(1))",
        "--morfoschool-color-accent": "oklch(0.68 0.18 70)",
      }),
    ).toEqual({ "--morfoschool-color-accent": "oklch(0.68 0.18 70)" });
  });

  it("normalizes backend tenant theme envelope", () => {
    const theme = normalizeTenantTheme({
      data: {
        theme: {
          tenantId: "tenant-1",
          preset: "morfoschools-default",
          primaryColor: "oklch(0.52 0.16 250)",
          accentColor: "oklch(0.68 0.18 70)",
          logoUrl: "",
          version: 4,
          cacheKey: "tenant_theme:tenant-1:v4",
          cssVariables: {
            "--morfoschool-color-primary": "oklch(0.52 0.16 250)",
            "--morfoschool-color-accent": "oklch(0.68 0.18 70)",
          },
        },
      },
    });

    expect(theme.tenantId).toBe("tenant-1");
    expect(theme.version).toBe(4);
    expect(theme.cssVariables["--morfoschool-color-primary"]).toBe("oklch(0.52 0.16 250)");
  });

  it("applies only sanitized tenant variables to a style target", () => {
    const writes: Array<[string, string]> = [];
    const target = { setProperty: (name: string, value: string) => writes.push([name, value]) };

    applyTenantThemeVariables(target, {
      "--morfoschool-color-primary": "#123456",
      background: "red",
    });

    expect(writes).toEqual([["--morfoschool-color-primary", "#123456"]]);
  });

  it("fetches current tenant theme with cookie credentials", async () => {
    const calls: Array<[string, RequestInit | undefined]> = [];
    const theme = await fetchCurrentTenantTheme({
      fetcher: async (input, init) => {
        calls.push([input, init]);
        return new Response(
          JSON.stringify({
            data: {
              theme: {
                tenantId: "tenant-1",
                preset: "morfoschools-default",
                primaryColor: "#123456",
                accentColor: "#f5a524",
                logoUrl: "",
                version: 2,
                cacheKey: "tenant_theme:tenant-1:v2",
                cssVariables: { "--morfoschool-color-primary": "#123456" },
              },
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    });

    expect(calls[0]).toEqual([
      "http://localhost:8080/api/v1/tenants/current/theme",
      { credentials: "include" },
    ]);
    expect(theme.version).toBe(2);
    expect(theme.cssVariables).toEqual({ "--morfoschool-color-primary": "#123456" });
  });
});
