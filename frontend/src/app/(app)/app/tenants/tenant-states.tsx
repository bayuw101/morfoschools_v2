"use client";

import { Building2, Search, X, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type TenantEmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
};

export function TenantListLoadingState() {
  return (
    <div aria-label="Loading tenants">
      <div className="hidden overflow-visible md:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[color:var(--border)] bg-[color:var(--surface-subtle)] text-left text-[11px] font-bold uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
              <th className="px-4 py-3">School tenant</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--border)]">
            {Array.from({ length: 5 }).map((_, index) => (
              <tr key={index} className="bg-[color:var(--surface)]">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-xl" />
                    <div className="min-w-0 space-y-2">
                      <Skeleton className="h-4 w-44" />
                      <Skeleton className="h-3.5 w-64" />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3"><Skeleton className="h-7 w-24 rounded-lg" /></td>
                <td className="px-4 py-3"><Skeleton className="h-6 w-20 rounded-full" /></td>
                <td className="px-4 py-3"><div className="flex justify-end gap-2"><Skeleton className="h-9 w-28 rounded-xl" /><Skeleton className="h-9 w-9 rounded-xl" /></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-3 p-3 md:hidden">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="relative min-w-0 overflow-visible rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface)] p-3 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
            <div className="flex min-w-0 items-start gap-2">
              <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-36 max-w-full" />
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Skeleton className="h-6 w-20 rounded-lg" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              </div>
              <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TenantEmptyState({ icon: Icon, title, description, action }: TenantEmptyStateProps) {
  return (
    <div className="m-4 flex min-h-48 flex-col items-center justify-center rounded-[22px] border border-dashed border-[color:var(--border)] bg-[color:var(--surface-subtle)] p-6 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--brand-soft)] text-[color:var(--brand-strong)]">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-display text-lg font-bold">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-[color:var(--muted-foreground)]">{description}</p>
      {action ? (
        <Button className="mt-4" size="sm" variant="secondary" onClick={action.onClick} icon={X}>
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}

export function NoTenantsState() {
  return (
    <TenantEmptyState
      icon={Building2}
      title="Belum ada tenant"
      description="Buat sekolah pertama untuk mulai onboarding."
    />
  );
}

export function NoTenantResultsState({ onReset }: { onReset: () => void }) {
  return (
    <TenantEmptyState
      icon={Search}
      title="Tidak ada tenant cocok"
      description="Coba reset pencarian atau pilih status lain. Filter tidak mengubah data tenant di backend."
      action={{ label: "Reset filters", onClick: onReset }}
    />
  );
}
