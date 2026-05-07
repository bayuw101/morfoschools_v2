import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type AuthSession,
  type LoginCredentials,
  clearSession,
  fetchCurrentSession,
  getSession,
  isAuthenticated,
  loginWithPassword,
  logout,
  storeSession,
  switchTenant,
} from "./auth";

const storageStub = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => {
      store[key] = val;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

function session(overrides: Partial<AuthSession> = {}): AuthSession {
  return {
    userId: "u1",
    email: "a@b.com",
    name: "Test User",
    role: "student",
    roles: ["student"],
    permissions: ["courses:read"],
    tenantId: "t1",
    tenantName: "Demo",
    effectiveTenantId: "t1",
    isActingAsTenant: false,
    csrfToken: "csrf_abc",
    expiresAt: "2099-01-01T00:00:00Z",
    source: "backend-cookie",
    ...overrides,
  };
}

function okResponse(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => storageStub.clear());

describe("session store", () => {
  it("returns null when no session stored", () => {
    expect(getSession(storageStub)).toBeNull();
  });

  it("stores and retrieves a backend cookie session cache", () => {
    const value = session();
    storeSession(value, storageStub);
    expect(getSession(storageStub)).toEqual(value);
  });

  it("clearSession removes the session", () => {
    storeSession(session(), storageStub);
    clearSession(storageStub);
    expect(getSession(storageStub)).toBeNull();
  });

  it("isAuthenticated returns false for expired session", () => {
    storeSession(session({ expiresAt: "2000-01-01T00:00:00Z" }), storageStub);
    expect(isAuthenticated(storageStub)).toBe(false);
  });
});

describe("backend auth client", () => {
  const creds: LoginCredentials = {
    tenantId: "11111111-1111-7111-8111-111111111111",
    email: "student@morfoschools.local",
    password: "morfosis123",
  };

  it("logs in through backend cookie auth and never stores raw session token", async () => {
    const fetcher = vi.fn(async (_input: string, _init?: RequestInit) =>
      okResponse({
        user: { id: "u1", email: creds.email, name: "Student", roles: ["student"], permissions: ["courses:read"] },
        tenant: { id: creds.tenantId, name: "Demo" },
        csrfToken: "csrf_1",
        expiresAt: "2099-01-01T00:00:00Z",
      }),
    );

    const value = await loginWithPassword(creds, { fetcher, storage: storageStub });

    expect(fetcher).toHaveBeenCalledWith(
      "http://localhost:8080/api/v1/auth/login",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: expect.objectContaining({ "X-Tenant-ID": creds.tenantId }),
      }),
    );
    expect(value).toMatchObject({ email: creds.email, role: "student", source: "backend-cookie" });
    expect(JSON.stringify(getSession(storageStub))).not.toContain("demo-local");
    expect(JSON.stringify(getSession(storageStub))).not.toContain("sessionToken");
  });

  it("logs in master admin without sending a default tenant", async () => {
    const fetcher = vi.fn(async (_input: string, _init?: RequestInit) =>
      okResponse({
        data: {
          session: {
            userId: "master",
            email: "master.admin@morfoschools.local",
            displayName: "Master Admin",
            roles: ["master_admin"],
            permissions: ["platform:admin", "tenants:read", "tenants:switch"],
          },
          csrfToken: "csrf_master",
        },
      }),
    );

    const value = await loginWithPassword({ email: "master.admin@morfoschools.local", password: "morfosis123" }, { fetcher, storage: storageStub });
    const [, init] = fetcher.mock.calls[0];

    expect(init?.headers).not.toMatchObject({ "X-Tenant-ID": expect.any(String) });
    expect(JSON.parse(String(init?.body))).not.toHaveProperty("tenantId");
    expect(value).toMatchObject({ role: "master_admin", tenantId: "", effectiveTenantId: "" });
  });

  it("loads /auth/me and normalizes role permissions", async () => {
    const fetcher = vi.fn(async (_input: string, _init?: RequestInit) =>
      okResponse({
        user: { id: "u2", email: "teacher@morfoschools.local", name: "Teacher", roles: ["teacher"], permissions: ["courses:teach"] },
        tenant: { id: creds.tenantId, name: "Demo" },
        csrfToken: "csrf_2",
      }),
    );

    const value = await fetchCurrentSession({ fetcher, storage: storageStub });
    expect(value?.permissions).toContain("courses:teach");
    expect(getSession(storageStub)?.role).toBe("teacher");
  });

  it("maps legacy backend seed role aliases into frontend role names", async () => {
    const fetcher = vi.fn(async (_input: string, _init?: RequestInit) =>
      okResponse({
        data: {
          session: {
            userId: "u7",
            email: "guardian@morfoschools.local",
            displayName: "Guardian Demo",
            tenantId: creds.tenantId,
            tenantName: "Demo",
            roles: ["guardian", "finance_staff", "exam_proctor"],
            permissions: ["guardian:view"],
          },
        },
      }),
    );

    const value = await fetchCurrentSession({ fetcher, storage: storageStub });
    expect(value?.role).toBe("parent");
    expect(value?.roles).toEqual(["parent", "finance", "proctor"]);
  });

  it("sends CSRF token on logout and switch-tenant", async () => {
    storeSession(session({ csrfToken: "csrf_saved", roles: ["master_admin"], role: "master_admin" }), storageStub);
    const fetcher = vi.fn(async (_input: string, _init?: RequestInit) => okResponse({ ok: true }));
    fetcher.mockResolvedValueOnce(okResponse({ ok: true }));
    fetcher.mockResolvedValueOnce(okResponse({
        user: { id: "u1", email: "master.admin@morfoschools.local", roles: ["master_admin"], permissions: ["tenants:switch"], effectiveTenantId: "t2", isActingAsTenant: true },
        tenant: { id: "t2", name: "Other" },
        csrfToken: "csrf_saved",
      }));

    await logout({ fetcher, storage: storageStub });
    storeSession(session({ csrfToken: "csrf_saved", roles: ["master_admin"], role: "master_admin" }), storageStub);
    await switchTenant("t2", { fetcher, storage: storageStub });

    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      "http://localhost:8080/api/v1/auth/logout",
      expect.objectContaining({ headers: { "X-CSRF-Token": "csrf_saved" } }),
    );
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "http://localhost:8080/api/v1/auth/switch-tenant",
      expect.objectContaining({ headers: expect.objectContaining({ "X-CSRF-Token": "csrf_saved" }) }),
    );
  });
});
