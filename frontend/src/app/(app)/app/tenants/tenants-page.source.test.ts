import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync(join(process.cwd(), "src/app/(app)/app/tenants/tenants-page.tsx"), "utf8");
const listSource = readFileSync(join(process.cwd(), "src/app/(app)/app/tenants/tenant-list.tsx"), "utf8");
const drawersSource = readFileSync(join(process.cwd(), "src/app/(app)/app/tenants/tenant-drawers.tsx"), "utf8");
const formDrawerSource = readFileSync(join(process.cwd(), "src/app/(app)/app/tenants/tenant-form-drawer.tsx"), "utf8");
const adminDrawerSource = readFileSync(join(process.cwd(), "src/app/(app)/app/tenants/tenant-admin-drawer.tsx"), "utf8");

describe("tenants page mobile UX contract", () => {
  it("uses reusable directory toolbar, list, and drawer single-file components", () => {
    expect(pageSource).toContain("DirectoryToolbar");
    expect(pageSource).toContain("TenantDesktopTable");
    expect(pageSource).toContain("TenantMobileCards");
    expect(pageSource).toContain("TenantFormDrawer");
    expect(pageSource).toContain("TenantAdminDrawer");
    expect(drawersSource).toContain("TenantFormDrawer");
    expect(drawersSource).toContain("TenantAdminDrawer");
    expect(formDrawerSource).toContain("export function TenantFormDrawer");
    expect(adminDrawerSource).toContain("export function TenantAdminDrawer");
    expect(listSource).toContain("export function TenantDesktopTable");
    expect(listSource).toContain("export function TenantMobileCards");
  });

  it("does not render tenant UUID in mobile cards", () => {
    const mobileStart = listSource.indexOf("export function TenantMobileCards");
    const mobileSource = listSource.slice(mobileStart);

    expect(mobileSource).toContain("{tenant.code}");
    expect(mobileSource).not.toContain(">{tenant.id}<");
    expect(mobileSource).not.toContain("<TenantActions");
    expect(mobileSource).toContain("Open actions for");
  });
});
