export type ThemeMode = "light" | "dark";

export type PaletteName =
  | "morfosis"
  | "tokyo-night"
  | "monokai"
  | "blue"
  | "dracula"
  | "nord"
  | "catppuccin"
  | "rose-pine"
  | "gruvbox"
  | "solarized"
  | "github-dark"
  | "one-dark";

export type LocalThemePreference = {
  mode: ThemeMode;
  palette: PaletteName;
};

export type TenantTheme = {
  tenantId: string;
  preset: string;
  primaryColor: string;
  accentColor: string;
  logoUrl: string;
  version: number;
  cacheKey: string;
  cssVariables: Record<string, string>;
};

export const THEME_STORAGE_KEY = "morfoschools-theme-v1";
export const DEFAULT_THEME_PREFERENCE: LocalThemePreference = {
  mode: "dark",
  palette: "morfosis",
};

export const PALETTES: Array<{ value: PaletteName; label: string; swatch: string }> = [
  { value: "morfosis", label: "Morfosis Blue", swatch: "bg-[#486b9c]" },
  { value: "tokyo-night", label: "Tokyo Night", swatch: "bg-[#7aa2f7]" },
  { value: "monokai", label: "Monokai", swatch: "bg-[#a6e22e]" },
  { value: "blue", label: "Blue", swatch: "bg-[#2563eb]" },
  { value: "dracula", label: "Dracula", swatch: "bg-[#bd93f9]" },
  { value: "nord", label: "Nord", swatch: "bg-[#88c0d0]" },
  { value: "catppuccin", label: "Catppuccin Mocha", swatch: "bg-[#cba6f7]" },
  { value: "rose-pine", label: "Rosé Pine", swatch: "bg-[#ebbcba]" },
  { value: "gruvbox", label: "Gruvbox", swatch: "bg-[#d79921]" },
  { value: "solarized", label: "Solarized", swatch: "bg-[#268bd2]" },
  { value: "github-dark", label: "GitHub Dark", swatch: "bg-[#2f81f7]" },
  { value: "one-dark", label: "One Dark", swatch: "bg-[#61afef]" },
];

const allowedPalettes = new Set(PALETTES.map((palette) => palette.value));
const allowedTenantVariables = new Set([
  "--morfoschool-color-primary",
  "--morfoschool-color-accent",
  "--morfoschool-logo-url",
]);

const safeHexColor = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const safeOklchColor = /^oklch\(\s*(?:0(?:\.\d+)?|1(?:\.0+)?|\d{1,2}(?:\.\d+)?%)\s+\d?(?:\.\d+)?\s+\d{1,3}(?:\.\d+)?(?:\s*\/\s*(?:0(?:\.\d+)?|1(?:\.0+)?|\d{1,2}(?:\.\d+)?%))?\s*\)$/i;
const safeHttpsUrl = /^url\("https:\/\/[^"\n\r]+"\)$/i;

export function isPaletteName(value: unknown): value is PaletteName {
  return typeof value === "string" && allowedPalettes.has(value as PaletteName);
}

export function normalizeLocalThemePreference(input: unknown): LocalThemePreference {
  const value = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  return {
    mode: value.mode === "light" ? "light" : "dark",
    palette: isPaletteName(value.palette) ? value.palette : DEFAULT_THEME_PREFERENCE.palette,
  };
}

export function isSafeThemeVariableValue(value: unknown): value is string {
  if (typeof value !== "string" || value.includes(";") || value.includes("javascript:")) return false;
  return safeHexColor.test(value) || safeOklchColor.test(value) || safeHttpsUrl.test(value);
}

export function sanitizeThemeVariables(input: unknown): Record<string, string> {
  if (!input || typeof input !== "object") return {};
  return Object.fromEntries(
    Object.entries(input as Record<string, unknown>).filter(
      ([name, value]) => allowedTenantVariables.has(name) && isSafeThemeVariableValue(value),
    ) as Array<[string, string]>,
  );
}

export function normalizeTenantTheme(payload: unknown): TenantTheme {
  const root = payload && typeof payload === "object" ? (payload as any).data ?? payload : {};
  const raw = root.theme ?? root;
  return {
    tenantId: String(raw.tenantId ?? ""),
    preset: String(raw.preset ?? "morfoschools-default"),
    primaryColor: String(raw.primaryColor ?? "oklch(0.52 0.16 250)"),
    accentColor: String(raw.accentColor ?? "oklch(0.68 0.18 70)"),
    logoUrl: String(raw.logoUrl ?? ""),
    version: Number(raw.version ?? 1),
    cacheKey: String(raw.cacheKey ?? ""),
    cssVariables: sanitizeThemeVariables(raw.cssVariables),
  };
}

export function applyThemePreference(target: HTMLElement, preference: LocalThemePreference): void {
  target.dataset.theme = preference.mode;
  target.dataset.palette = preference.palette;
  target.style.colorScheme = preference.mode;
}

export function applyTenantThemeVariables(
  target: Pick<CSSStyleDeclaration, "setProperty">,
  variables: unknown,
): void {
  for (const [name, value] of Object.entries(sanitizeThemeVariables(variables))) {
    target.setProperty(name, value);
  }
}

const DEFAULT_API_BASE_URL = "http://localhost:8080";
type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

function apiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL;
}

async function parseJsonOrError(response: Response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message ?? payload.code ?? "request_failed");
  }
  return payload;
}

export async function fetchCurrentTenantTheme(
  options: { fetcher?: Fetcher } = {},
): Promise<TenantTheme> {
  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher(`${apiBaseUrl()}/api/v1/tenants/current/theme`, {
    credentials: "include",
  });
  return normalizeTenantTheme(await parseJsonOrError(response));
}

export function removeTenantThemeVariables(target: Pick<CSSStyleDeclaration, "removeProperty">): void {
  for (const name of Array.from(allowedTenantVariables)) {
    target.removeProperty(name);
  }
}
