import { describe, expect, it, vi } from "vitest";

import { bootstrapTenantAdmin, createTenant, deleteTenant, listTenants, updateTenant, type PlatformTenantRow } from "./tenants-api";

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("tenants API module", () => {
  it("lists platform tenants through the backend envelope without dummy rows", async () => {
    const tenants: PlatformTenantRow[] = [
      { id: "tenant-1", code: "sma-demo", name: "SMA Demo", status: "active" },
    ];
    const fetcher = vi.fn(async () => jsonResponse({ data: { tenants } }));

    await expect(listTenants({ baseUrl: "http://api.test", fetcher })).resolves.toEqual(tenants);
    expect(fetcher).toHaveBeenCalledWith(
      "http://api.test/api/v1/platform/tenants",
      expect.objectContaining({ method: "GET", credentials: "include" }),
    );
  });

  it("keeps empty tenant lists empty instead of injecting seeded tenants", async () => {
    const fetcher = vi.fn(async () => jsonResponse({ data: { tenants: [] } }));

    await expect(listTenants({ baseUrl: "http://api.test", fetcher })).resolves.toEqual([]);
  });

  it("uses platform tenant create, bootstrap, and delete routes with CSRF but no tenant header requirement", async () => {
    const tenant: PlatformTenantRow = { id: "tenant-1", code: "sma-demo", name: "SMA Demo", status: "active" };
    const fetcher = vi.fn(async (input: string, _init?: RequestInit) => {
      if (input.endsWith("/bootstrap-admin")) return jsonResponse({ data: { user: { id: "u1" } } }, 201);
      if (input.endsWith("/tenant-1")) return jsonResponse({ data: { ok: true } });
      return jsonResponse({ data: { tenant } }, 201);
    });
    const options = {
      baseUrl: "http://api.test",
      fetcher,
      getSession: () => ({ csrfToken: "csrf-1" }),
    };

    await createTenant(options, { code: "SMA Demo", name: "SMA Demo" });
    await updateTenant(options, "tenant-1", { code: "sma-demo-updated", name: "SMA Demo Updated", status: "suspended" });
    await bootstrapTenantAdmin(options, "tenant-1", {
      email: "admin@sma-demo.local",
      displayName: "Admin SMA Demo",
      password: "Password123!",
    });
    await deleteTenant(options, "tenant-1");

    expect(fetcher.mock.calls.map(([input]) => input)).toEqual([
      "http://api.test/api/v1/platform/tenants",
      "http://api.test/api/v1/platform/tenants/tenant-1",
      "http://api.test/api/v1/platform/tenants/tenant-1/bootstrap-admin",
      "http://api.test/api/v1/platform/tenants/tenant-1",
    ]);
    expect(fetcher.mock.calls.map(([, init]) => init?.method)).toEqual(["POST", "PATCH", "POST", "DELETE"]);
    expect(JSON.parse(fetcher.mock.calls[0][1]?.body as string)).toEqual({ code: "SMA Demo", name: "SMA Demo" });
    expect(JSON.parse(fetcher.mock.calls[1][1]?.body as string)).toEqual({ code: "sma-demo-updated", name: "SMA Demo Updated", status: "suspended" });
    expect(JSON.parse(fetcher.mock.calls[2][1]?.body as string)).toEqual({
      email: "admin@sma-demo.local",
      displayName: "Admin SMA Demo",
      password: "Password123!",
    });
    expect(fetcher.mock.calls[3][1]?.body).toBeUndefined();
    for (const [, init] of fetcher.mock.calls) {
      const headers = init?.headers as Headers;
      expect(headers.get("X-CSRF-Token")).toBe("csrf-1");
      expect(headers.get("X-Tenant-ID")).toBeNull();
    }
  });
});
