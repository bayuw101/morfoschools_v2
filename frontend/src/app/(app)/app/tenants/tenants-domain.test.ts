import { describe, expect, it } from "vitest";

import { filterTenants, getTenantMetrics, tenantSlug, type TenantStatusFilter } from "./tenants-domain";
import type { PlatformTenantRow } from "@/lib/tenants-api";

const tenants: PlatformTenantRow[] = [
  { id: "t-1", code: "sma-nusantara", name: "SMA Nusantara", status: "active" },
  { id: "t-2", code: "smp-arsip", name: "SMP Arsip", status: "archived" },
  { id: "t-3", code: "smk-jeda", name: "SMK Jeda", status: "suspended" },
];

describe("tenant directory domain", () => {
  it("normalizes tenant slugs from school names and manual code edits", () => {
    expect(tenantSlug("  SMA Nusantara Baru!! ")).toBe("sma-nusantara-baru");
    expect(tenantSlug("SMP 01 / Jakarta")).toBe("smp-01-jakarta");
  });

  it("filters tenants by search query across name, code, id, and status", () => {
    expect(filterTenants(tenants, { query: "nusantara", status: "all" }).map((tenant) => tenant.id)).toEqual(["t-1"]);
    expect(filterTenants(tenants, { query: "smp-arsip", status: "all" }).map((tenant) => tenant.id)).toEqual(["t-2"]);
    expect(filterTenants(tenants, { query: "t-3", status: "all" }).map((tenant) => tenant.id)).toEqual(["t-3"]);
    expect(filterTenants(tenants, { query: "suspended", status: "all" }).map((tenant) => tenant.id)).toEqual(["t-3"]);
  });

  it("filters tenants by status without mutating source order", () => {
    expect(filterTenants(tenants, { query: "", status: "active" }).map((tenant) => tenant.id)).toEqual(["t-1"]);
    expect(filterTenants(tenants, { query: "", status: "archived" }).map((tenant) => tenant.id)).toEqual(["t-2"]);
    expect(filterTenants(tenants, { query: "", status: "suspended" }).map((tenant) => tenant.id)).toEqual(["t-3"]);
    expect(filterTenants(tenants, { query: "", status: "all" }).map((tenant) => tenant.id)).toEqual(["t-1", "t-2", "t-3"]);
  });

  it("computes directory metrics for status chips", () => {
    expect(getTenantMetrics(tenants)).toEqual({ total: 3, active: 1, archived: 1, suspended: 1 });
  });

  it("keeps unknown status filters safe by returning no rows for that explicit status", () => {
    expect(filterTenants(tenants, { query: "", status: "trial" as TenantStatusFilter })).toEqual([]);
  });
});
