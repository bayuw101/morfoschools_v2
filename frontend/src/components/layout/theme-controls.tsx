"use client";

import * as React from "react";
import { Check, Loader2, MoonStar, Palette, SunMedium } from "lucide-react";
import { cn } from "@/lib/cn";
import { useTheme } from "@/lib/theme-provider";
import { PALETTES, type PaletteName, type ThemeMode } from "@/lib/theme";

export function ThemeControls() {
  const { preference, setMode, setPalette, tenantThemeLoading, tenantThemeError } = useTheme();
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const mode = preference.mode;
  const palette = preference.palette;

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
          {tenantThemeLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : mode === "dark" ? (
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
            <div className="flex items-center justify-between gap-2 px-2 pb-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">
                Palette presets
              </p>
              {tenantThemeError ? (
                <span className="rounded-full bg-[color:var(--danger-soft)] px-2 py-0.5 text-[10px] font-bold text-[color:var(--danger)]">
                  Tenant theme offline
                </span>
              ) : null}
            </div>
            <div className="space-y-1">
              {PALETTES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPalette(option.value as PaletteName)}
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
