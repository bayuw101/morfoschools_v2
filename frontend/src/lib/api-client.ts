import { getSession, type AuthSession } from "./auth";

const DEFAULT_API_BASE_URL = "http://localhost:8080";

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

type SessionSnapshot = Pick<AuthSession, "tenantId" | "effectiveTenantId" | "csrfToken">;

export type ApiClientOptions = {
  baseUrl?: string;
  fetcher?: Fetcher;
  getSession?: () => Partial<SessionSnapshot> | null;
};

export type ApiRequestOptions = Omit<RequestInit, "body" | "headers"> & {
  body?: unknown;
  headers?: HeadersInit;
  tenantId?: string | null;
  csrfToken?: string | null;
};

export type FormErrorState = {
  message: string;
  fields: Record<string, string>;
};

export type MutationStatus = "idle" | "pending" | "success" | "error";

export type MutationLike = {
  status: MutationStatus;
  error?: unknown;
};

export type MutationUiState = {
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  buttonProps: {
    "aria-busy": boolean;
    disabled: boolean;
    loading: boolean;
  };
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: Record<string, string[]>;
  readonly payload: unknown;

  constructor({
    status,
    code,
    message,
    fields,
    payload,
  }: {
    status: number;
    code: string;
    message: string;
    fields?: Record<string, string[]>;
    payload: unknown;
  }) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
    this.payload = payload;
  }
}

function apiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL;
}

function sessionSnapshot(): Partial<SessionSnapshot> | null {
  return getSession();
}

function normalizeUrl(baseUrl: string, path: string) {
  if (/^https?:\/\//.test(path)) return path;
  return `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

function normalizeHeaders(headers: HeadersInit | undefined) {
  return new Headers(headers);
}

function unwrapData<T>(payload: unknown): T {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

function errorFromPayload(response: Response, payload: unknown) {
  const root = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const error = root.error && typeof root.error === "object" ? (root.error as Record<string, unknown>) : root;
  const code = String(error.code ?? root.code ?? `http_${response.status}`);
  const message = String(error.message ?? root.message ?? response.statusText ?? "request_failed");
  const fields = error.fields && typeof error.fields === "object"
    ? (error.fields as Record<string, string[]>)
    : undefined;

  return new ApiError({ status: response.status, code, message, fields, payload });
}

export function createApiClient(options: ApiClientOptions = {}) {
  const baseUrl = options.baseUrl ?? apiBaseUrl();
  const fetcher = options.fetcher ?? fetch;
  const readSession = options.getSession ?? sessionSnapshot;

  return {
    async request<T>(path: string, requestOptions: ApiRequestOptions = {}): Promise<T> {
      const session = readSession();
      const headers = normalizeHeaders(requestOptions.headers);
      const unsafeMethod = !["GET", "HEAD", "OPTIONS"].includes((requestOptions.method ?? "GET").toUpperCase());
      const tenantId = requestOptions.tenantId ?? session?.effectiveTenantId ?? session?.tenantId;
      const csrfToken = requestOptions.csrfToken ?? session?.csrfToken;

      if (requestOptions.body !== undefined && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }
      if (tenantId) headers.set("X-Tenant-ID", tenantId);
      if (unsafeMethod && csrfToken) headers.set("X-CSRF-Token", csrfToken);

      const response = await fetcher(normalizeUrl(baseUrl, path), {
        ...requestOptions,
        credentials: requestOptions.credentials ?? "include",
        headers,
        body: requestOptions.body === undefined ? undefined : JSON.stringify(requestOptions.body),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) throw errorFromPayload(response, payload);
      return unwrapData<T>(payload);
    },
  };
}

export function errorMessageFromUnknown(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return "Something went wrong. Please try again.";
}

export function mapApiErrorToFormState(error: unknown): FormErrorState {
  const fields: Record<string, string> = {};
  if (error instanceof ApiError && error.fields) {
    for (const [name, messages] of Object.entries(error.fields)) {
      fields[name] = messages.filter(Boolean).join(" ");
    }
  }

  return {
    message: errorMessageFromUnknown(error),
    fields,
  };
}

export function mutationUiState(mutation: MutationLike): MutationUiState {
  const isLoading = mutation.status === "pending";
  const isError = mutation.status === "error";
  return {
    isLoading,
    isError,
    errorMessage: isError ? errorMessageFromUnknown(mutation.error) : null,
    buttonProps: {
      "aria-busy": isLoading,
      disabled: isLoading,
      loading: isLoading,
    },
  };
}

export const apiClient = createApiClient();
