import { getSession, type AuthSession } from "./auth";

const DEFAULT_API_BASE_URL = "http://127.0.0.1:18080";

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
  message: string | null;
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
  const rawFields = error.fields ?? error.fieldErrors ?? root.fields ?? root.fieldErrors;
  const fields = rawFields && typeof rawFields === "object"
    ? Object.fromEntries(
        Object.entries(rawFields as Record<string, unknown>).map(([name, value]) => [
          name,
          Array.isArray(value) ? value.map(String) : [String(value)],
        ]),
      )
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
      const tenantId = requestOptions.tenantId === null
        ? null
        : requestOptions.tenantId ?? session?.effectiveTenantId ?? session?.tenantId;
      const csrfToken = requestOptions.csrfToken ?? session?.csrfToken;

      const isFormData = typeof FormData !== "undefined" && requestOptions.body instanceof FormData;
      if (requestOptions.body !== undefined && !isFormData && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }
      if (tenantId) headers.set("X-Tenant-ID", tenantId);
      if (unsafeMethod && csrfToken) headers.set("X-CSRF-Token", csrfToken);

      const response = await fetcher(normalizeUrl(baseUrl, path), {
        ...requestOptions,
        credentials: requestOptions.credentials ?? "include",
        headers,
        body: requestOptions.body === undefined ? undefined : isFormData ? requestOptions.body as BodyInit : JSON.stringify(requestOptions.body),
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

const inferredFieldMessages: Record<string, string> = {
  academicYearId: "Academic year is required.",
  code: "Code is required.",
  displayName: "Display name is required.",
  email: "Email is required.",
  endsOn: "End date is required.",
  gradeLevel: "Grade level is required.",
  name: "Name is required.",
  roleCodes: "Select at least one role.",
  startsOn: "Start date is required.",
  status: "Status is required.",
  tenantId: "Tenant selection is required.",
};

function addInferredFieldError(fields: Record<string, string>, name: string, message: string) {
  if (!fields[name]) fields[name] = message;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function messageMentionsField(normalizedMessage: string, ...fieldNames: string[]) {
  return fieldNames.some((fieldName) => {
    const normalizedField = fieldName.toLowerCase();
    if (normalizedField.includes(" ") || normalizedField.includes("_")) {
      return normalizedMessage.includes(normalizedField);
    }
    return new RegExp(`(^|[^a-z0-9])${escapeRegExp(normalizedField)}([^a-z0-9]|$)`).test(normalizedMessage);
  });
}

function inferRequiredFieldFromMessage(fields: Record<string, string>, normalizedMessage: string, fieldName: keyof typeof inferredFieldMessages, ...aliases: string[]) {
  if (messageMentionsField(normalizedMessage, fieldName, ...aliases)) {
    addInferredFieldError(fields, fieldName, inferredFieldMessages[fieldName]);
  }
}

function inferFieldErrors(error: ApiError, fields: Record<string, string>) {
  const message = errorMessageFromUnknown(error);
  const normalized = message.toLowerCase();

  if (error.code === "role_not_found") {
    addInferredFieldError(fields, "roleCodes", "One or more selected roles were not found in this tenant.");
    return;
  }

  inferRequiredFieldFromMessage(fields, normalized, "academicYearId", "academic year", "academic_year_id");
  inferRequiredFieldFromMessage(fields, normalized, "code", "school year", "semester");
  inferRequiredFieldFromMessage(fields, normalized, "displayName", "display name");
  inferRequiredFieldFromMessage(fields, normalized, "email");
  inferRequiredFieldFromMessage(fields, normalized, "endsOn", "endson", "ends_on", "end date");
  inferRequiredFieldFromMessage(fields, normalized, "gradeLevel", "gradelevel", "grade_level", "grade level");
  inferRequiredFieldFromMessage(fields, normalized, "name");
  inferRequiredFieldFromMessage(fields, normalized, "roleCodes", "role codes", "role");
  inferRequiredFieldFromMessage(fields, normalized, "startsOn", "startson", "starts_on", "start date");
  inferRequiredFieldFromMessage(fields, normalized, "status");
  inferRequiredFieldFromMessage(fields, normalized, "tenantId", "tenant context", "tenant");
}

export function mapApiErrorToFormState(error: unknown): FormErrorState {
  const fields: Record<string, string> = {};
  if (error instanceof ApiError) {
    if (error.fields) {
      for (const [name, messages] of Object.entries(error.fields)) {
        fields[name] = messages.filter(Boolean).join(" ");
      }
    }
    if (error.code === "validation_failed" || error.code === "role_not_found") {
      inferFieldErrors(error, fields);
    }
  }

  const hasFieldErrors = Object.keys(fields).length > 0;

  return {
    message: hasFieldErrors ? null : errorMessageFromUnknown(error),
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
