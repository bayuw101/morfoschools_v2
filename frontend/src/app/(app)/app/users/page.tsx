"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { UsersPageContent, type TenantOption } from "./users-page";
import { mapApiErrorToFormState, type FormErrorState } from "@/lib/api-client";
import { useAuthSession } from "@/lib/use-auth-session";
import { listTenants } from "@/lib/tenants-api";
import {
  createUser,
  deactivateUser,
  listUsers,
  updateUser,
  type UserDirectoryRow,
  type UserMutationInput,
} from "@/lib/users-api";

const USERS_QUERY_KEY = ["users"] as const;
const TENANTS_QUERY_KEY = ["users", "tenant-options"] as const;

function mutationFormState(error: unknown): FormErrorState {
  return mapApiErrorToFormState(error);
}

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [editingUser, setEditingUser] = useState<UserDirectoryRow | null>(null);
  const [pendingDeactivateUser, setPendingDeactivateUser] = useState<UserDirectoryRow | null>(null);
  const [mutationError, setMutationError] = useState<FormErrorState | null>(null);
  const { session } = useAuthSession();

  const isPlatformContext = Boolean(session?.roles?.includes("master_admin") && !session?.isActingAsTenant);
  const tenantsQuery = useQuery({
    queryKey: TENANTS_QUERY_KEY,
    queryFn: () => listTenants(),
    enabled: isPlatformContext,
  });
  const tenantOptions = useMemo<TenantOption[]>(() => {
    const tenantId = session?.effectiveTenantId || session?.tenantId;
    if (isPlatformContext) {
      return (tenantsQuery.data ?? [])
        .filter((tenant) => tenant.status === "active")
        .map((tenant) => ({ id: tenant.id, name: tenant.name, code: tenant.code }));
    }
    if (tenantId) {
      return [{ id: tenantId, name: session?.tenantName || "Current tenant" }];
    }

    return [];
  }, [isPlatformContext, tenantsQuery.data, session?.effectiveTenantId, session?.tenantId, session?.tenantName]);

  const usersQuery = useQuery<UserDirectoryRow[]>({
    queryKey: USERS_QUERY_KEY,
    queryFn: () => listUsers(),
  });

  const invalidateUsers = async () => {
    await queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
  };

  const createMutation = useMutation({
    mutationFn: (input: Required<Pick<UserMutationInput, "email" | "displayName" | "roleCodes">> & Pick<UserMutationInput, "tenantId">) => createUser({}, input),
    onSuccess: async () => {
      setFormMode(null);
      setMutationError(null);
      await invalidateUsers();
    },
    onError: (error) => setMutationError(mutationFormState(error)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Omit<UserMutationInput, "email"> }) => updateUser({}, id, input),
    onSuccess: async () => {
      setFormMode(null);
      setEditingUser(null);
      setMutationError(null);
      await invalidateUsers();
    },
    onError: (error) => setMutationError(mutationFormState(error)),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => deactivateUser({}, id),
    onSuccess: async () => {
      setPendingDeactivateUser(null);
      setMutationError(null);
      await invalidateUsers();
    },
    onError: (error) => setMutationError(mutationFormState(error)),
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const deactivatingUserId = deactivateMutation.isPending ? pendingDeactivateUser?.id ?? null : null;

  return (
    <UsersPageContent
      users={usersQuery.data ?? []}
      isLoading={usersQuery.isLoading}
      error={usersQuery.error}
      isSaving={isSaving}
      deactivatingUserId={deactivatingUserId}
      formMode={formMode}
      editingUser={editingUser}
      pendingDeactivateUser={pendingDeactivateUser}
      mutationError={mutationError?.message ?? null}
      mutationFieldErrors={mutationError?.fields ?? {}}
      tenantOptions={tenantOptions}
      isPlatformContext={isPlatformContext}
      currentTenantName={session?.tenantName ?? "Current tenant"}
      onCreate={() => {
        setMutationError(null);
        setEditingUser(null);
        setFormMode("create");
      }}
      onEdit={(user) => {
        setMutationError(null);
        setEditingUser(user);
        setFormMode("edit");
      }}
      onDeactivate={(user) => {
        setMutationError(null);
        setPendingDeactivateUser(user);
      }}
      onCloseForm={() => {
        if (isSaving) return;
        setFormMode(null);
        setEditingUser(null);
        setMutationError(null);
      }}
      onCloseDeactivate={() => {
        if (deactivateMutation.isPending) return;
        setPendingDeactivateUser(null);
        setMutationError(null);
      }}
      onSubmitUser={(input) => {
        setMutationError(null);
        if (formMode === "create") {
          createMutation.mutate({ email: input.email ?? "", displayName: input.displayName, roleCodes: input.roleCodes, tenantId: input.tenantId });
          return;
        }
        if (formMode === "edit" && editingUser) {
          updateMutation.mutate({ id: editingUser.id, input: { displayName: input.displayName, roleCodes: input.roleCodes } });
        }
      }}
      onConfirmDeactivate={() => {
        if (pendingDeactivateUser) deactivateMutation.mutate(pendingDeactivateUser.id);
      }}
    />
  );
}
