import { createApiClient, type ApiClientOptions } from "./api-client";

export type UserDirectoryRow = {
  id: string;
  email: string;
  displayName: string;
  status: string;
  membershipId: string;
  tenantId: string;
  tenantStatus: string;
  roles: string[];
  roleNames: string[];
  createdAt: string;
  updatedAt: string;
};

export type UserMutationInput = {
  email?: string;
  displayName: string;
  roleCodes: string[];
  tenantId?: string;
};

type UsersEnvelope = {
  users: UserDirectoryRow[];
};

function usersClient(options: ApiClientOptions = {}) {
  return createApiClient(options);
}

export async function listUsers(options: ApiClientOptions = {}): Promise<UserDirectoryRow[]> {
  const data = await usersClient(options).request<UsersEnvelope>("/api/v1/users", { method: "GET" });
  return data.users;
}

export async function createUser(options: ApiClientOptions = {}, input: Required<Pick<UserMutationInput, "email" | "displayName" | "roleCodes">> & Pick<UserMutationInput, "tenantId">): Promise<UserDirectoryRow> {
  const { tenantId, ...body } = input;
  const data = await usersClient(options).request<{ user: UserDirectoryRow }>("/api/v1/users", {
    method: "POST",
    tenantId,
    body,
  });
  return data.user;
}

export async function updateUser(options: ApiClientOptions = {}, id: string, input: Omit<UserMutationInput, "email">): Promise<UserDirectoryRow> {
  const data = await usersClient(options).request<{ user: UserDirectoryRow }>(`/api/v1/users/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: input,
  });
  return data.user;
}

export async function deactivateUser(options: ApiClientOptions = {}, id: string): Promise<{ ok: boolean }> {
  return usersClient(options).request<{ ok: boolean }>(`/api/v1/users/${encodeURIComponent(id)}/deactivate`, {
    method: "PATCH",
  });
}
