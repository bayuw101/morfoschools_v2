import { describe, expect, it } from "vitest";
import type { AuthSession } from "@/lib/auth";
import { primaryNavigation, visiblePrimaryNavigation } from "./navigation";

function session(role: AuthSession["role"]): AuthSession {
  return {
    userId: "u1",
    email: `${role}@morfoschools.local`,
    name: role,
    role,
    roles: [role],
    permissions: [],
    tenantId: "t1",
    tenantName: "Demo",
    effectiveTenantId: "t1",
    isActingAsTenant: false,
    csrfToken: "csrf",
    expiresAt: "2099-01-01T00:00:00Z",
    source: "backend-cookie",
  };
}

function platformSessionWithoutTenant(): AuthSession {
  return {
    ...session("master_admin"),
    tenantId: "",
    tenantName: "",
    effectiveTenantId: "",
    isActingAsTenant: false,
  };
}

describe("primaryNavigation", () => {
  it("uses unique hrefs so React list keys stay stable", () => {
    const hrefs = primaryNavigation.map((item) => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("requires explicit backend session roles; no unauthenticated menu leak", () => {
    expect(visiblePrimaryNavigation(null)).toEqual([]);
  });

  it("shows management/gallery surfaces only to staff roles, not students or parents", () => {
    expect(visiblePrimaryNavigation(session("teacher")).map((item) => item.label)).toContain("Gallery");
    expect(visiblePrimaryNavigation(session("student")).map((item) => item.label)).not.toContain("Gallery");
    expect(visiblePrimaryNavigation(session("parent")).map((item) => item.label)).not.toContain("Gallery");
  });

  it("shows manage users only to tenant/platform admins", () => {
    expect(visiblePrimaryNavigation(session("school_admin")).map((item) => item.label)).toContain("Users");
    expect(visiblePrimaryNavigation(session("master_admin")).map((item) => item.label)).toContain("Users");
    expect(visiblePrimaryNavigation(session("teacher")).map((item) => item.label)).not.toContain("Users");
    expect(visiblePrimaryNavigation(session("student")).map((item) => item.label)).not.toContain("Users");
  });

  it("shows Academic Setup and Class Sections only to platform, school, and academic admins", () => {
    for (const label of ["Academic Setup", "Class Sections"]) {
      expect(visiblePrimaryNavigation(session("master_admin")).map((item) => item.label)).toContain(label);
      expect(visiblePrimaryNavigation(session("school_admin")).map((item) => item.label)).toContain(label);
      expect(visiblePrimaryNavigation(session("academic_admin")).map((item) => item.label)).toContain(label);
      expect(visiblePrimaryNavigation(session("teacher")).map((item) => item.label)).not.toContain(label);
      expect(visiblePrimaryNavigation(session("student")).map((item) => item.label)).not.toContain(label);
    }
  });

  it("hides tenant-scoped modules when no effective tenant context exists", () => {
    const labels = visiblePrimaryNavigation(platformSessionWithoutTenant()).map((item) => item.label);
    expect(labels).toContain("Tenants");
    expect(labels).not.toContain("Users");
    expect(labels).not.toContain("Academic Setup");
    expect(labels).not.toContain("Class Sections");
  });
});
