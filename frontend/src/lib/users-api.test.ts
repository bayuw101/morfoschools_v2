import { describe, expect, it, vi } from "vitest";

import {
  createUser,
  deactivateUser,
  listUsers,
  updateUser,
  type UserDirectoryRow,
} from "./users-api";

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("users API module", () => {
  it("lists tenant users through the API envelope without dummy rows", async () => {
    const users: UserDirectoryRow[] = [
      {
        id: "u1",
        email: "admin@morfoschools.local",
        displayName: "School Admin",
        status: "active",
        membershipId: "m1",
        tenantId: "t1",
        tenantStatus: "active",
        roles: ["school_admin"],
        roleNames: ["School Admin"],
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-02T00:00:00Z",
      },
    ];
    const fetcher = vi.fn(async () => jsonResponse({ data: { users } }));

    await expect(listUsers({ baseUrl: "http://api.test", fetcher })).resolves.toEqual(users);
    expect(fetcher).toHaveBeenCalledWith(
      "http://api.test/api/v1/users",
      expect.objectContaining({ method: "GET", credentials: "include" }),
    );
  });

  it("keeps empty user directories empty instead of injecting placeholder users", async () => {
    const fetcher = vi.fn(async () => jsonResponse({ data: { users: [] } }));

    await expect(listUsers({ baseUrl: "http://api.test", fetcher })).resolves.toEqual([]);
  });

  it("uses backend CRUD routes for create, update, and deactivate actions", async () => {
    const fetcher = vi.fn(async (_input: string, _init?: RequestInit) => jsonResponse({ data: { ok: true } }));
    const options = {
      baseUrl: "http://api.test",
      fetcher,
      getSession: () => ({ tenantId: "tenant-1", csrfToken: "csrf-1" }),
    };

    await createUser(options, {
      email: "teacher@morfoschools.local",
      displayName: "Teacher Demo",
      roleCodes: ["teacher"],
    });
    await updateUser(options, "u1", {
      displayName: "Teacher Updated",
      roleCodes: ["school_admin"],
    });
    await deactivateUser(options, "u1");

    expect(fetcher.mock.calls.map(([input]) => input)).toEqual([
      "http://api.test/api/v1/users",
      "http://api.test/api/v1/users/u1",
      "http://api.test/api/v1/users/u1/deactivate",
    ]);
    expect(fetcher.mock.calls.map(([, init]) => init?.method)).toEqual(["POST", "PATCH", "PATCH"]);
    for (const [, init] of fetcher.mock.calls) {
      const headers = init?.headers as Headers;
      expect(headers.get("X-Tenant-ID")).toBe("tenant-1");
      expect(headers.get("X-CSRF-Token")).toBe("csrf-1");
    }
  });
});
