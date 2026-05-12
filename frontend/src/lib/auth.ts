export const AUTH_TOKEN_COOKIE = "morfoschools_session_present";
export const CSRF_COOKIE = "morfoschools_csrf";

const SESSION_KEY = "morfoschools_session_cache";
const DEFAULT_API_BASE_URL = "http://127.0.0.1:18080";
export const AUTH_SESSION_CHANGED_EVENT = "morfoschools:auth-session-changed";

export type UserRole =
  | "master_admin"
  | "school_admin"
  | "academic_admin"
  | "teacher"
  | "student"
  | "parent"
  | "finance"
  | "proctor"
  | "content_reviewer";

export type AuthSession = {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  roles: UserRole[];
  permissions: string[];
  tenantId: string;
  tenantName: string;
  effectiveTenantId: string;
  isActingAsTenant: boolean;
  csrfToken: string;
  expiresAt: string;
  source: "backend-cookie";
};

export type LoginCredentials = {
  tenantId?: string;
  email: string;
  password: string;
};

export type SessionStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

function defaultStorage(): SessionStorage | null {
  if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  return null;
}

function apiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL;
}

function setTokenCookie(expiresAt: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_TOKEN_COOKIE}=1; path=/; expires=${new Date(expiresAt).toUTCString()}; SameSite=Lax`;
}

function clearTokenCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_TOKEN_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

function csrfTokenFromCookie(): string {
  if (typeof document === "undefined") return "";
  return document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${CSRF_COOKIE}=`))
    ?.slice(CSRF_COOKIE.length + 1) ?? "";
}

function normalizeRole(role: string): UserRole {
  const aliases: Record<string, UserRole> = {
    guardian: "parent",
    finance_staff: "finance",
    exam_proctor: "proctor",
    staff: "school_admin",
  };
  return aliases[role] ?? (role as UserRole);
}

function normalizeSession(payload: any): AuthSession {
  const root = payload.data ?? payload;
  const user = root.session ?? root.user ?? root;
  const tenant = root.tenant ?? {};
  const rawRoles = user.roles?.length ? user.roles : user.role ? [user.role] : [];
  const roles = rawRoles.map((role: string) => normalizeRole(role));
  const primaryRole = roles[0] ?? "student";
  return {
    userId: user.id ?? user.userId,
    email: user.email,
    name: user.name ?? user.displayName ?? user.email,
    role: primaryRole,
    roles,
    permissions: user.permissions ?? [],
    tenantId: user.effectiveTenantId ?? tenant.id ?? user.tenantId ?? "",
    tenantName: user.effectiveTenantName ?? tenant.name ?? user.tenantName ?? "",
    effectiveTenantId: user.effectiveTenantId ?? tenant.id ?? user.tenantId ?? "",
    isActingAsTenant: Boolean(user.isActingAsTenant ?? user.effectiveTenantId),
    csrfToken: root.csrfToken ?? csrfTokenFromCookie(),
    expiresAt: user.expiresAt ?? root.expiresAt ?? new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString(),
    source: "backend-cookie",
  };
}

function emitSessionChanged(session: AuthSession | null) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AUTH_SESSION_CHANGED_EVENT, { detail: session }));
}

export function storeSession(session: AuthSession, storage?: SessionStorage | null): void {
  const s = storage ?? defaultStorage();
  s?.setItem(SESSION_KEY, JSON.stringify(session));
  setTokenCookie(session.expiresAt);
  emitSessionChanged(session);
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
  emitSessionChanged(null);
}

export function isAuthenticated(storage?: SessionStorage | null): boolean {
  const session = getSession(storage);
  if (!session) return false;
  return new Date(session.expiresAt) > new Date();
}

async function parseJsonOrError(response: Response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message ?? payload.code ?? "request_failed");
  }
  return payload;
}

export async function loginWithPassword(
  creds: LoginCredentials,
  options: { fetcher?: Fetcher; storage?: SessionStorage | null } = {},
): Promise<AuthSession> {
  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher(`${apiBaseUrl()}/api/v1/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(creds.tenantId ? { "X-Tenant-ID": creds.tenantId } : {}) },
    body: JSON.stringify({ email: creds.email, password: creds.password, ...(creds.tenantId ? { tenantId: creds.tenantId } : {}) }),
  });
  const session = normalizeSession(await parseJsonOrError(response));
  storeSession(session, options.storage);
  return session;
}

export async function fetchCurrentSession(
  options: { fetcher?: Fetcher; storage?: SessionStorage | null } = {},
): Promise<AuthSession | null> {
  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher(`${apiBaseUrl()}/api/v1/auth/me`, {
    credentials: "include",
  });
  if (response.status === 401) {
    clearSession(options.storage);
    return null;
  }
  const session = normalizeSession(await parseJsonOrError(response));
  storeSession(session, options.storage);
  return session;
}

export async function logout(options: { fetcher?: Fetcher; storage?: SessionStorage | null } = {}) {
  const fetcher = options.fetcher ?? fetch;
  await fetcher(`${apiBaseUrl()}/api/v1/auth/logout`, {
    method: "POST",
    credentials: "include",
    headers: { "X-CSRF-Token": getSession(options.storage)?.csrfToken ?? csrfTokenFromCookie() },
  });
  clearSession(options.storage);
}

export async function switchTenant(
  tenantId: string,
  options: { fetcher?: Fetcher; storage?: SessionStorage | null } = {},
): Promise<AuthSession> {
  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher(`${apiBaseUrl()}/api/v1/auth/switch-tenant`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": getSession(options.storage)?.csrfToken ?? csrfTokenFromCookie(),
    },
    body: JSON.stringify({ tenantId }),
  });
  const session = normalizeSession(await parseJsonOrError(response));
  storeSession(session, options.storage);
  return session;
}
