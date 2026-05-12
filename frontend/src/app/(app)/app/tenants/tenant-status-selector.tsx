"use client";

import type { TenantStatus } from "@/lib/tenants-api";

export const tenantStatusOptions: Array<{ value: TenantStatus; label: string; description: string }> = [
  { value: "active", label: "Active", description: "Tenant dapat login, switch, dan setup admin." },
  { value: "suspended", label: "Suspended", description: "Bekukan sementara tanpa mengarsipkan data." },
  { value: "archived", label: "Archived", description: "Arsip/soft-delete; switch dan admin disabled." },
];

export function toTenantStatus(value?: string): TenantStatus {
  if (value === "suspended" || value === "archived") return value;
  return "active";
}

export function TenantStatusSelector({ value, onChange }: { value: TenantStatus; onChange: (value: TenantStatus) => void }) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">Tenant status</p>
        <p className="mt-1 text-xs leading-5 text-[color:var(--muted-foreground)]">Status menentukan apakah tenant boleh dipakai untuk login/switch/setup admin.</p>
      </div>
      <div className="grid gap-2">
        {tenantStatusOptions.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={`rounded-2xl border p-3 text-left transition ${selected ? "border-[color:var(--brand-strong)] bg-[color:var(--brand-soft)] text-[color:var(--brand-strong)]" : "border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground)] hover:bg-[color:var(--surface-subtle)]"}`}
            >
              <span className="block font-display text-sm font-bold capitalize">{option.label}</span>
              <span className="mt-1 block text-xs leading-5 text-[color:var(--muted-foreground)]">{option.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
