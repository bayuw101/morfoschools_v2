// Demo-only browser session helpers for the clean ISSUE #0-#11 rewrite scope.
// Real backend auth is intentionally out of scope until the auth vertical slice exists.

const SESSION_KEY = "morfoschools_session";
export const AUTH_TOKEN_COOKIE = "morfoschools_token";

export type AuthSession = {
  token: string;
  userId: string;
  email: string;
  name: string;
  role: "admin" | "teacher" | "student";
  tenantId: string;
  tenantName: string;
  expiresAt: string;
  source: "demo-local";
};

export type LoginCredentials = {
  tenantId: string;
  email: string;
  password: string;
};

export type SessionStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

const DEMO_TENANT_ID = "00000000-0000-4000-8000-000000000001";
const DEMO_PASSWORD = "morfosis123";

const demoUsers: Record<string, { userId: string; name: string; role: AuthSession["role"] }> = {
  "admin@morfosis.demo": { userId: "demo-admin", name: "Admin Morfosis", role: "admin" },
  "guru.biologi@morfosis.demo": { userId: "demo-teacher-bio", name: "Guru Biologi", role: "teacher" },
  "alya@morfosis.demo": { userId: "demo-student-alya", name: "Alya Rahma", role: "student" },
  "bima@morfosis.demo": { userId: "demo-student-bima", name: "Bima Pratama", role: "student" },
};

function defaultStorage(): SessionStorage | null {
  if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  return null;
}

function setTokenCookie(token: string, expiresAt: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_TOKEN_COOKIE}=${token}; path=/; expires=${new Date(expiresAt).toUTCString()}; SameSite=Lax`;
}

function clearTokenCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_TOKEN_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

export function storeSession(session: AuthSession, storage?: SessionStorage | null): void {
  const s = storage ?? defaultStorage();
  s?.setItem(SESSION_KEY, JSON.stringify(session));
  setTokenCookie(session.token, session.expiresAt);
}

export function getSession(storage?: SessionStorage | null): AuthSession | null {
  const s = storage ?? defaultStorage();
  const raw = s?.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function clearSession(storage?: SessionStorage | null): void {
  const s = storage ?? defaultStorage();
  s?.removeItem(SESSION_KEY);
  clearTokenCookie();
}

export function isAuthenticated(storage?: SessionStorage | null): boolean {
  const session = getSession(storage);
  if (!session) return false;
  return new Date(session.expiresAt) > new Date();
}

export function createDemoSession(creds: LoginCredentials): AuthSession {
  const email = creds.email.trim().toLowerCase();
  const demoUser = demoUsers[email];
  if (creds.tenantId !== DEMO_TENANT_ID || creds.password !== DEMO_PASSWORD || !demoUser) {
    throw new Error("invalid_demo_credentials");
  }

  return {
    token: `demo-local-${demoUser.userId}`,
    userId: demoUser.userId,
    email,
    name: demoUser.name,
    role: demoUser.role,
    tenantId: creds.tenantId,
    tenantName: "Morfosis Demo School",
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString(),
    source: "demo-local",
  };
}
