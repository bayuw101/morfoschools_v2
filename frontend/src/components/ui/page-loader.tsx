import { Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";

export interface PageLoaderProps {
  title?: string;
  description?: string;
  className?: string;
  compact?: boolean;
}

export function PageLoader({
  title = "Menyiapkan halaman",
  description = "Morfosis sedang memuat data, izin akses, dan state terbaru.",
  className,
  compact = false,
}: PageLoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "relative overflow-hidden rounded-[32px] border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[0_24px_70px_rgba(9,17,28,0.10)]",
        compact ? "p-5" : "p-8 md:p-10",
        className,
      )}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-[color:var(--brand)]" />
      <div className="relative flex flex-col gap-5 md:flex-row md:items-center">
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-[24px] border border-[color:var(--border)] bg-[color:var(--surface-subtle)] text-[color:var(--brand-strong)]">
          <div className="absolute inset-2 rounded-[18px] border border-[color:var(--brand-soft)]" />
          <Loader2 className="h-7 w-7 animate-spin" strokeWidth={2.4} />
          <Sparkles className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-[color:var(--surface)] p-0.5 text-[color:var(--warning)]" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-display text-xl font-bold tracking-tight text-[color:var(--foreground)]">{title}</p>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[color:var(--muted-foreground)]">{description}</p>
          <div className="mt-5 grid gap-2 md:grid-cols-3">
            <div className="h-2 rounded-full bg-[color:var(--brand)]" />
            <div className="h-2 rounded-full bg-[color:var(--surface-subtle)]" />
            <div className="h-2 rounded-full bg-[color:var(--surface-subtle)]" />
          </div>
        </div>
      </div>
    </div>
  );
}
