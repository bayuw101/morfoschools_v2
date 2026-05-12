import type { PlatformTenantRow } from "@/lib/tenants-api";

export type TenantStatusFilter = "all" | "active" | "suspended" | "archived";

export type TenantDirectoryFilters = {
  query: string;
  status: TenantStatusFilter;
};

export type TenantMetrics = {
  total: number;
  active: number;
  suspended: number;
  archived: number;
};

export function tenantSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function getTenantMetrics(tenants: PlatformTenantRow[]): TenantMetrics {
  return tenants.reduce<TenantMetrics>(
    (metrics, tenant) => {
      metrics.total += 1;
      if (tenant.status === "active") metrics.active += 1;
      if (tenant.status === "suspended") metrics.suspended += 1;
      if (tenant.status === "archived") metrics.archived += 1;
      return metrics;
    },
    { total: 0, active: 0, suspended: 0, archived: 0 },
  );
}

export function filterTenants(tenants: PlatformTenantRow[], filters: TenantDirectoryFilters) {
  const query = filters.query.trim().toLowerCase();
  return tenants.filter((tenant) => {
    const matchesStatus = filters.status === "all" || tenant.status === filters.status;
    if (!matchesStatus) return false;
    if (!query) return true;
    return [tenant.id, tenant.code, tenant.name, tenant.status].some((value) => value.toLowerCase().includes(query));
  });
}
