import { describe, expect, it, vi } from "vitest";

import {
  ApiError,
  createApiClient,
  mapApiErrorToFormState,
  mutationUiState,
} from "./api-client";

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("api client", () => {
  it("unwraps typed API envelopes and injects credentials, tenant, and csrf headers", async () => {
    const fetcher = vi.fn(async (_input: string, _init?: RequestInit) =>
      jsonResponse({ data: { id: "u1", email: "teacher@morfoschools.local" } }),
    );
    const client = createApiClient({
      baseUrl: "http://api.test",
      fetcher,
      getSession: () => ({ tenantId: "tenant-1", csrfToken: "csrf-1" }),
    });

    const result = await client.request<{ id: string; email: string }>("/api/v1/users/u1", {
      method: "PATCH",
      body: { name: "Teacher" },
    });

    expect(result).toEqual({ id: "u1", email: "teacher@morfoschools.local" });
    const [input, init] = fetcher.mock.calls[0];
    const headers = init?.headers as Headers;
    expect(input).toBe("http://api.test/api/v1/users/u1");
    expect(init).toMatchObject({
      method: "PATCH",
      credentials: "include",
      body: JSON.stringify({ name: "Teacher" }),
    });
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("X-Tenant-ID")).toBe("tenant-1");
    expect(headers.get("X-CSRF-Token")).toBe("csrf-1");
  });

  it("normalizes API errors with status, code, message, and validation fields", async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse(
        {
          error: {
            code: "validation_failed",
            message: "Email is required",
            fields: { email: ["required"] },
          },
        },
        422,
      ),
    );
    const client = createApiClient({ baseUrl: "http://api.test", fetcher });

    await expect(client.request("/api/v1/users", { method: "POST", body: {} })).rejects.toMatchObject({
      name: "ApiError",
      status: 422,
      code: "validation_failed",
      message: "Email is required",
      fields: { email: ["required"] },
    } satisfies Partial<ApiError>);
  });

  it("maps API errors to global and field form UI state", () => {
    const error = new ApiError({
      status: 422,
      code: "validation_failed",
      message: "Please fix the highlighted fields.",
      fields: { email: ["Email is required"], password: ["Too short", "Must contain number"] },
      payload: {},
    });

    expect(mapApiErrorToFormState(error)).toEqual({
      message: "Please fix the highlighted fields.",
      fields: {
        email: "Email is required",
        password: "Too short Must contain number",
      },
    });
    expect(mapApiErrorToFormState(new Error("Network offline"))).toEqual({
      message: "Network offline",
      fields: {},
    });
  });

  it("standardizes mutation loading/error flags for UI controls", () => {
    expect(mutationUiState({ status: "pending" })).toEqual({
      isLoading: true,
      isError: false,
      errorMessage: null,
      buttonProps: { "aria-busy": true, disabled: true, loading: true },
    });
    expect(mutationUiState({ status: "error", error: new Error("Failed") })).toEqual({
      isLoading: false,
      isError: true,
      errorMessage: "Failed",
      buttonProps: { "aria-busy": false, disabled: false, loading: false },
    });
  });

  it("does not seed dummy data and returns empty arrays from real empty API responses", async () => {
    const fetcher = vi.fn(async () => jsonResponse({ data: [] }));
    const client = createApiClient({ baseUrl: "http://api.test", fetcher });

    const rows = await client.request<Array<{ id: string }>>("/api/v1/courses");

    expect(rows).toEqual([]);
  });
});
