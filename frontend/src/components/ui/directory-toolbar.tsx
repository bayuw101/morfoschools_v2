"use client";

import { Search, X, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export type DirectoryFilterOption<T extends string> = {
  value: T;
  label: string;
};

export type DirectoryMetric = {
  label: string;
  value: number;
  icon?: LucideIcon;
};

export function DirectoryToolbar<T extends string>({
  metrics,
  query,
  onQueryChange,
  searchLabel = "Search",
  searchPlaceholder = "Search...",
  filters,
  selectedFilter,
  onFilterChange,
  hasFilters,
  onReset,
}: {
  metrics: DirectoryMetric[];
  query: string;
  onQueryChange: (value: string) => void;
  searchLabel?: string;
  searchPlaceholder?: string;
  filters: DirectoryFilterOption<T>[];
  selectedFilter: T;
  onFilterChange: (value: T) => void;
  hasFilters: boolean;
  onReset: () => void;
}) {
  const [primaryMetric, ...secondaryMetrics] = metrics;
  const PrimaryIcon = primaryMetric?.icon;

  return (
    <div className="border-b border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-3 sm:px-4">
      <div className="flex min-w-0 items-start justify-between gap-3 max-sm:flex-col sm:items-center">
        <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 sm:shrink-0 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
          {PrimaryIcon ? <PrimaryIcon className="h-4 w-4 shrink-0 text-[color:var(--brand-strong)]" /> : null}
          <div className="min-w-0 text-sm">
            <span className="font-display text-base font-bold text-[color:var(--foreground)]">{primaryMetric?.value ?? 0}</span>
            <span className="ml-1 font-semibold text-[color:var(--foreground)]">{primaryMetric?.label ?? "items"}</span>
            {secondaryMetrics.length ? (
              <span className="ml-2 hidden whitespace-nowrap text-xs font-semibold text-[color:var(--muted-foreground)] md:inline">
                {secondaryMetrics.map((metric) => `${metric.value} ${metric.label}`).join(" · ")}
              </span>
            ) : null}
          </div>
        </div>

        <div className="grid w-full min-w-0 grid-cols-1 gap-2 sm:w-auto sm:flex sm:flex-1 sm:items-center sm:justify-end lg:flex-none">
          <div className="relative min-w-0 sm:w-[min(300px,32vw)] lg:w-[320px]">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--muted-foreground)]" />
            <input
              aria-label={searchLabel}
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder={searchPlaceholder}
              className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] pl-10 pr-10 text-sm font-medium text-[color:var(--foreground)] outline-none transition focus:border-[color:var(--brand-strong)] focus:ring-2 focus:ring-[color:var(--brand-soft)] sm:h-11"
            />
            {query ? <button type="button" aria-label="Clear search" onClick={() => onQueryChange("")} className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-[color:var(--muted-foreground)] hover:bg-[color:var(--surface-subtle)]"><X className="h-3.5 w-3.5" /></button> : null}
          </div>
          <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-1 sm:justify-end sm:pb-0 lg:overflow-visible">
            {filters.map((filter) => {
              const selected = selectedFilter === filter.value;
              return <button key={filter.value} type="button" aria-pressed={selected} onClick={() => onFilterChange(filter.value)} className={`h-10 shrink-0 rounded-xl border px-3 text-xs font-bold transition ${selected ? "border-[color:var(--brand-strong)] bg-[color:var(--brand-soft)] text-[color:var(--brand-strong)]" : "border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"}`}>{filter.label}</button>;
            })}
            {hasFilters ? <Button size="sm" variant="ghost" onClick={onReset} icon={X}>Reset</Button> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
