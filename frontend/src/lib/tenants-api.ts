import { createApiClient, type ApiClientOptions } from "./api-client";
import type { UserDirectoryRow } from "./users-api";

export type PlatformTenantRow = {
  id: string;
  code: string;
  name: string;
  status: string;
  logoUrl?: string;
  logoObjectKey?: string;
  logoContentType?: string;
  primaryAdminEmail?: string;
  primaryAdminName?: string;
};

export type CreateTenantInput = {
  code: string;
  name: string;
};

export type TenantStatus = "active" | "suspended" | "archived";

export type UpdateTenantInput = {
  code: string;
  name: string;
  status: TenantStatus;
};

export type BootstrapTenantAdminInput = {
  email: string;
  displayName: string;
  password: string;
};

type TenantsEnvelope = {
  tenants: PlatformTenantRow[];
};

function tenantsClient(options: ApiClientOptions = {}) {
  return createApiClient(options);
}

export async function listTenants(options: ApiClientOptions = {}): Promise<PlatformTenantRow[]> {
  const data = await tenantsClient(options).request<TenantsEnvelope>("/api/v1/platform/tenants", {
    method: "GET",
    tenantId: null,
  });
  return data.tenants;
}

export async function createTenant(options: ApiClientOptions = {}, input: CreateTenantInput): Promise<PlatformTenantRow> {
  const data = await tenantsClient(options).request<{ tenant: PlatformTenantRow }>("/api/v1/platform/tenants", {
    method: "POST",
    tenantId: null,
    body: input,
  });
  return data.tenant;
}

export async function updateTenant(options: ApiClientOptions = {}, tenantId: string, input: UpdateTenantInput): Promise<PlatformTenantRow> {
  const data = await tenantsClient(options).request<{ tenant: PlatformTenantRow }>(`/api/v1/platform/tenants/${encodeURIComponent(tenantId)}`, {
    method: "PATCH",
    tenantId: null,
    body: input,
  });
  return data.tenant;
}

export async function bootstrapTenantAdmin(
  options: ApiClientOptions = {},
  tenantId: string,
  input: BootstrapTenantAdminInput,
): Promise<UserDirectoryRow> {
  const data = await tenantsClient(options).request<{ user: UserDirectoryRow }>(
    `/api/v1/platform/tenants/${encodeURIComponent(tenantId)}/bootstrap-admin`,
    {
      method: "POST",
      tenantId: null,
      body: input,
    },
  );
  return data.user;
}

export async function uploadTenantLogo(options: ApiClientOptions = {}, tenantId: string, file: File): Promise<PlatformTenantRow> {
  const formData = new FormData();
  formData.append("logo", file);
  const data = await tenantsClient(options).request<{ tenant: PlatformTenantRow }>(
    `/api/v1/platform/tenants/${encodeURIComponent(tenantId)}/logo`,
    {
      method: "POST",
      tenantId: null,
      body: formData,
    },
  );
  return data.tenant;
}

export async function deleteTenant(options: ApiClientOptions = {}, tenantId: string): Promise<void> {
  await tenantsClient(options).request<{ ok: boolean }>(`/api/v1/platform/tenants/${encodeURIComponent(tenantId)}`, {
    method: "DELETE",
    tenantId: null,
  });
}
