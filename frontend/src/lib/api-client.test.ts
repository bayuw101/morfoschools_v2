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

  it("maps validation errors to field-only form UI state", () => {
    const error = new ApiError({
      status: 422,
      code: "validation_failed",
      message: "Please fix the highlighted fields.",
      fields: { email: ["Email is required"], password: ["Too short", "Must contain number"] },
      payload: {},
    });

    expect(mapApiErrorToFormState(error)).toEqual({
      message: null,
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

  it("infers field-only errors from legacy validation messages without field payloads", () => {
    expect(mapApiErrorToFormState(new ApiError({
      status: 400,
      code: "validation_failed",
      message: "displayName and roleCodes are required",
      payload: {},
    }))).toEqual({
      message: null,
      fields: {
        displayName: "Display name is required.",
        roleCodes: "Select at least one role.",
      },
    });
  });

  it("maps academic setup and class section legacy validation messages to inline field errors", () => {
    expect(mapApiErrorToFormState(new ApiError({
      status: 400,
      code: "validation_failed",
      message: "valid school year, startsOn, endsOn, and status are required",
      payload: {},
    }))).toEqual({
      message: null,
      fields: {
        code: "Code is required.",
        startsOn: "Start date is required.",
        endsOn: "End date is required.",
        status: "Status is required.",
      },
    });

    expect(mapApiErrorToFormState(new ApiError({
      status: 400,
      code: "validation_failed",
      message: "valid academicYearId, code, name, gradeLevel, and status are required",
      payload: {},
    }))).toEqual({
      message: null,
      fields: {
        academicYearId: "Academic year is required.",
        code: "Code is required.",
        name: "Name is required.",
        gradeLevel: "Grade level is required.",
        status: "Status is required.",
      },
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
