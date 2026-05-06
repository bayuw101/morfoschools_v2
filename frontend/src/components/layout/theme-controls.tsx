"use client";

import * as React from "react";
import { Check, MoonStar, Palette, SunMedium } from "lucide-react";
import { cn } from "@/lib/cn";

type ThemeMode = "light" | "dark";
type PaletteName =
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

const storageKey = "morfoschools-theme-v1";

const palettes: Array<{ value: PaletteName; label: string; swatch: string }> = [
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

function applyTheme(mode: ThemeMode, palette: PaletteName) {
  document.documentElement.dataset.theme = mode;
  document.documentElement.dataset.palette = palette;
  document.documentElement.style.colorScheme = mode;
}

function readInitialTheme(): { mode: ThemeMode; palette: PaletteName } {
  if (typeof window === "undefined")
    return { mode: "dark", palette: "morfosis" };

  const stored = window.localStorage.getItem(storageKey);
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as Partial<{
        mode: ThemeMode;
        palette: PaletteName;
      }>;
      return {
        mode: parsed.mode === "light" ? "light" : "dark",
        palette: palettes.some((palette) => palette.value === parsed.palette)
          ? parsed.palette!
          : "morfosis",
      };
    } catch {
      // ignore invalid localStorage payload
    }
  }

  const prefersDark =
    window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? true;
  return { mode: prefersDark ? "dark" : "light", palette: "morfosis" };
}

export function ThemeControls() {
  const [mounted, setMounted] = React.useState(false);
  const [mode, setMode] = React.useState<ThemeMode>("dark");
  const [palette, setPalette] = React.useState<PaletteName>("morfosis");
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const initial = readInitialTheme();
    setMode(initial.mode);
    setPalette(initial.palette);
    applyTheme(initial.mode, initial.palette);
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!mounted) return;
    applyTheme(mode, palette);
    window.localStorage.setItem(storageKey, JSON.stringify({ mode, palette }));
  }, [mode, mounted, palette]);

  React.useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative hidden sm:block">
      <button
        type="button"
        className="flex h-10 items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-subtle)] py-1 pl-1.5 pr-3 text-xs font-bold text-[color:var(--foreground)] transition-colors hover:border-[color:var(--border-strong)] hover:bg-[color:var(--surface)]"
        aria-label="Theme and palette controls"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--brand-soft)] text-[color:var(--brand-strong)]">
          {mode === "dark" ? (
            <MoonStar className="h-4 w-4" />
          ) : (
            <SunMedium className="h-4 w-4" />
          )}
        </span>
        <span className="hidden lg:inline">Theme</span>
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 max-h-[min(560px,calc(100vh-96px))] w-[300px] overflow-y-auto rounded-[24px] border border-[color:var(--border-strong)] bg-[color:var(--surface)] p-2 shadow-[0_24px_56px_rgba(6,15,29,0.2)]">
          <div className="rounded-[18px] bg-[color:var(--surface-subtle)] p-2">
            <p className="px-2 pb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">
              Mode
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(["light", "dark"] as ThemeMode[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setMode(option)}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-2xl border px-3 py-2 text-xs font-bold capitalize transition-colors",
                    mode === option
                      ? "border-[color:var(--brand)] bg-[color:var(--brand-soft)] text-[color:var(--brand-strong)]"
                      : "border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground)] hover:border-[color:var(--border-strong)]",
                  )}
                >
                  {option === "dark" ? (
                    <MoonStar className="h-4 w-4" />
                  ) : (
                    <SunMedium className="h-4 w-4" />
                  )}
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-2 rounded-[18px] bg-[color:var(--surface-subtle)] p-2">
            <p className="px-2 pb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">
              Palette presets
            </p>
            <div className="space-y-1">
              {palettes.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPalette(option.value)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-xs font-bold transition-colors",
                    palette === option.value
                      ? "bg-[color:var(--brand-soft)] text-[color:var(--brand-strong)]"
                      : "text-[color:var(--foreground)] hover:bg-[color:var(--surface)]",
                  )}
                >
                  <span
                    className={cn(
                      "h-4 w-4 rounded-full ring-2 ring-white/60",
                      option.swatch,
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {option.label}
                  </span>
                  {palette === option.value ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Palette className="h-4 w-4 text-[color:var(--muted-foreground)]" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
