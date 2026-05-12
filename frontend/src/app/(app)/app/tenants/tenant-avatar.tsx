import type { PlatformTenantRow } from "@/lib/tenants-api";

function initials(value: string) {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "TN";
}

export function TenantAvatar({ tenant }: { tenant: PlatformTenantRow }) {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--brand-soft)] font-display text-xs font-bold text-[color:var(--brand-strong)]">
      {tenant.logoUrl ? <img src={tenant.logoUrl} alt={`${tenant.name} logo`} className="h-full w-full object-cover" /> : initials(tenant.name)}
    </div>
  );
}
