"use client";

import * as React from "react";

import {
  applyTenantThemeVariables,
  applyThemePreference,
  fetchCurrentTenantTheme,
  normalizeLocalThemePreference,
  removeTenantThemeVariables,
  THEME_STORAGE_KEY,
  type LocalThemePreference,
  type PaletteName,
  type TenantTheme,
  type ThemeMode,
} from "@/lib/theme";

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

type ThemeContextValue = {
  preference: LocalThemePreference;
  tenantTheme: TenantTheme | null;
  tenantThemeLoading: boolean;
  tenantThemeError: string | null;
  setMode: (mode: ThemeMode) => void;
  setPalette: (palette: PaletteName) => void;
  refreshTenantTheme: () => Promise<TenantTheme | null>;
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function readPreference(): LocalThemePreference {
  if (typeof window === "undefined") return normalizeLocalThemePreference(null);
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored) {
    try {
      return normalizeLocalThemePreference(JSON.parse(stored));
    } catch {
      return normalizeLocalThemePreference(null);
    }
  }
  return normalizeLocalThemePreference({
    mode: window.matchMedia?.("(prefers-color-scheme: dark)").matches === false ? "light" : "dark",
    palette: "morfosis",
  });
}

export function ThemeProvider({
  children,
  fetcher,
  sessionKey,
}: {
  children: React.ReactNode;
  fetcher?: Fetcher;
  sessionKey?: string;
}) {
  const [preference, setPreference] = React.useState<LocalThemePreference>(() => normalizeLocalThemePreference(null));
  const [preferenceHydrated, setPreferenceHydrated] = React.useState(false);
  const [tenantTheme, setTenantTheme] = React.useState<TenantTheme | null>(null);
  const [tenantThemeLoading, setTenantThemeLoading] = React.useState(false);
  const [tenantThemeError, setTenantThemeError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setPreference(readPreference());
    setPreferenceHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!preferenceHydrated) return;

    const root = document.documentElement;
    applyThemePreference(root, preference);
    window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(preference));
  }, [preference, preferenceHydrated]);

  const refreshTenantTheme = React.useCallback(async () => {
    setTenantThemeLoading(true);
    setTenantThemeError(null);
    try {
      const nextTheme = await fetchCurrentTenantTheme({ fetcher });
      setTenantTheme(nextTheme);
      removeTenantThemeVariables(document.documentElement.style);
      applyTenantThemeVariables(document.documentElement.style, nextTheme.cssVariables);
      return nextTheme;
    } catch (error) {
      setTenantTheme(null);
      removeTenantThemeVariables(document.documentElement.style);
      setTenantThemeError(error instanceof Error ? error.message : "tenant_theme_load_failed");
      return null;
    } finally {
      setTenantThemeLoading(false);
    }
  }, [fetcher]);

  React.useEffect(() => {
    void refreshTenantTheme();
  }, [refreshTenantTheme, sessionKey]);

  const value = React.useMemo<ThemeContextValue>(
    () => ({
      preference,
      tenantTheme,
      tenantThemeLoading,
      tenantThemeError,
      setMode: (mode) => setPreference((current) => normalizeLocalThemePreference({ ...current, mode })),
      setPalette: (palette) => setPreference((current) => normalizeLocalThemePreference({ ...current, palette })),
      refreshTenantTheme,
    }),
    [preference, refreshTenantTheme, tenantTheme, tenantThemeError, tenantThemeLoading],
  );

  return React.createElement(ThemeContext.Provider, { value }, children);
}

export function useTheme() {
  const context = React.useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
