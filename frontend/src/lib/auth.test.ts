import { beforeEach, describe, expect, it } from "vitest";
import {
  type AuthSession,
  type LoginCredentials,
  clearSession,
  createDemoSession,
  getSession,
  isAuthenticated,
  storeSession,
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
    token: "tok_abc",
    userId: "u1",
    email: "a@b.com",
    name: "Test User",
    role: "student",
    tenantId: "t1",
    tenantName: "Demo",
    expiresAt: "2099-01-01T00:00:00Z",
    source: "demo-local",
    ...overrides,
  };
}

beforeEach(() => storageStub.clear());

describe("session store", () => {
  it("returns null when no session stored", () => {
    expect(getSession(storageStub)).toBeNull();
  });

  it("stores and retrieves a session", () => {
    const value = session();
    storeSession(value, storageStub);
    expect(getSession(storageStub)).toEqual(value);
  });

  it("clearSession removes the session", () => {
    storeSession(session(), storageStub);
    clearSession(storageStub);
    expect(getSession(storageStub)).toBeNull();
  });

  it("isAuthenticated returns true for valid unexpired session", () => {
    storeSession(session({ expiresAt: "2099-12-31T23:59:59Z" }), storageStub);
    expect(isAuthenticated(storageStub)).toBe(true);
  });

  it("isAuthenticated returns false for expired session", () => {
    storeSession(session({ expiresAt: "2000-01-01T00:00:00Z" }), storageStub);
    expect(isAuthenticated(storageStub)).toBe(false);
  });
});

describe("createDemoSession", () => {
  const creds: LoginCredentials = {
    tenantId: "00000000-0000-4000-8000-000000000001",
    email: "guru.biologi@morfosis.demo",
    password: "morfosis123",
  };

  it("creates an explicit local demo session without backend API calls", () => {
    const value = createDemoSession(creds);
    expect(value).toMatchObject({
      token: "demo-local-demo-teacher-bio",
      userId: "demo-teacher-bio",
      email: "guru.biologi@morfosis.demo",
      name: "Guru Biologi",
      role: "teacher",
      tenantName: "Morfosis Demo School",
      source: "demo-local",
    });
  });

  it("rejects unknown demo credentials", () => {
    expect(() => createDemoSession({ ...creds, password: "wrong" })).toThrow("invalid_demo_credentials");
    expect(() => createDemoSession({ ...creds, email: "real@school.id" })).toThrow("invalid_demo_credentials");
  });
});
