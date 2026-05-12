"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { TenantsPageContent } from "./tenants-page";
import { switchTenant } from "@/lib/auth";
import { mapApiErrorToFormState, type FormErrorState } from "@/lib/api-client";
import { bootstrapTenantAdmin, createTenant, deleteTenant, listTenants, updateTenant, uploadTenantLogo, type BootstrapTenantAdminInput, type CreateTenantInput, type PlatformTenantRow, type UpdateTenantInput } from "@/lib/tenants-api";
import type { ToastItem, ToastTone } from "@/components/ui/toast";

const TENANTS_QUERY_KEY = ["tenants"] as const;

function mutationFormState(error: unknown): FormErrorState {
  return mapApiErrorToFormState(error);
}

function mutationMessage(error: unknown) {
  return mutationFormState(error).message ?? undefined;
}

function makeToast(tone: ToastTone, title: string, description?: string): ToastItem {
  return { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, tone, title, description };
}

export default function TenantsPage() {
  const queryClient = useQueryClient();
  const [drawerMode, setDrawerMode] = useState<"create" | "edit" | "logo" | "admin" | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<PlatformTenantRow | null>(null);
  const [pendingSwitchTenant, setPendingSwitchTenant] = useState<PlatformTenantRow | null>(null);
  const [pendingDeleteTenant, setPendingDeleteTenant] = useState<PlatformTenantRow | null>(null);
  const [mutationError, setMutationError] = useState<FormErrorState | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = (tone: ToastTone, title: string, description?: string) => {
    const toast = makeToast(tone, title, description);
    setToasts((current) => [...current.slice(-3), toast]);
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== toast.id)), 4500);
  };

  const tenantsQuery = useQuery<PlatformTenantRow[]>({ queryKey: TENANTS_QUERY_KEY, queryFn: () => listTenants() });
  const invalidateTenants = async () => { await queryClient.invalidateQueries({ queryKey: TENANTS_QUERY_KEY }); };

  const createMutation = useMutation({
    mutationFn: (input: CreateTenantInput) => createTenant({}, input),
    onSuccess: async (tenant) => {
      setSelectedTenant(tenant);
      setDrawerMode("admin");
      setMutationError(null);
      pushToast("success", "Tenant berhasil dibuat", `${tenant.name} siap dikonfigurasi.`);
      await invalidateTenants();
    },
    onError: (error) => { const formError = mutationFormState(error); setMutationError(formError); pushToast("error", "Gagal membuat tenant", formError.message ?? undefined); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ tenantId, input }: { tenantId: string; input: UpdateTenantInput }) => updateTenant({}, tenantId, input),
    onSuccess: async (tenant) => {
      setDrawerMode(null);
      setSelectedTenant(null);
      setMutationError(null);
      pushToast("success", "Tenant berhasil diperbarui", `${tenant.name} sudah tersimpan.`);
      await invalidateTenants();
    },
    onError: (error) => { const formError = mutationFormState(error); setMutationError(formError); pushToast("error", "Gagal memperbarui tenant", formError.message ?? undefined); },
  });

  const logoMutation = useMutation({
    mutationFn: ({ tenantId, file }: { tenantId: string; file: File }) => uploadTenantLogo({}, tenantId, file),
    onSuccess: async (tenant) => {
      setDrawerMode(null);
      setSelectedTenant(null);
      setMutationError(null);
      pushToast("success", "Logo sekolah berhasil diupload", `${tenant.name} sekarang memakai logo baru.`);
      await invalidateTenants();
    },
    onError: (error) => { const formError = mutationFormState(error); setMutationError(formError); pushToast("error", "Gagal upload logo", formError.message ?? undefined); },
  });

  const bootstrapMutation = useMutation({
    mutationFn: ({ tenantId, input }: { tenantId: string; input: BootstrapTenantAdminInput }) => bootstrapTenantAdmin({}, tenantId, input),
    onSuccess: async () => {
      setDrawerMode(null);
      setSelectedTenant(null);
      setMutationError(null);
      pushToast("success", "Admin sekolah berhasil disimpan", "Akun admin aktif untuk tenant ini.");
      await invalidateTenants();
    },
    onError: (error) => { const formError = mutationFormState(error); setMutationError(formError); pushToast("error", "Gagal menyimpan admin", formError.message ?? undefined); },
  });

  const switchMutation = useMutation({
    mutationFn: (tenantId: string) => switchTenant(tenantId),
    onSuccess: async () => { setPendingSwitchTenant(null); setMutationError(null); pushToast("success", "Tenant context diganti"); await queryClient.invalidateQueries(); },
    onError: (error) => { const message = mutationMessage(error); setMutationError(null); pushToast("error", "Gagal switch tenant", message); },
  });

  const deleteMutation = useMutation({
    mutationFn: (tenantId: string) => deleteTenant({}, tenantId),
    onSuccess: async () => { setPendingDeleteTenant(null); setMutationError(null); pushToast("success", "Tenant berhasil diarsipkan"); await invalidateTenants(); },
    onError: (error) => { const message = mutationMessage(error); setMutationError(null); pushToast("error", "Gagal menghapus tenant", message); },
  });

  const isSaving = createMutation.isPending || updateMutation.isPending || logoMutation.isPending || bootstrapMutation.isPending || deleteMutation.isPending;
  const isSwitchingTenantId = switchMutation.isPending ? pendingSwitchTenant?.id ?? null : null;

  return (
    <TenantsPageContent
      tenants={tenantsQuery.data ?? []}
      isLoading={tenantsQuery.isLoading}
      error={tenantsQuery.error}
      isSaving={isSaving}
      isSwitchingTenantId={isSwitchingTenantId}
      drawerMode={drawerMode}
      selectedTenant={selectedTenant}
      pendingSwitchTenant={pendingSwitchTenant}
      pendingDeleteTenant={pendingDeleteTenant}
      mutationError={mutationError?.message ?? null}
      mutationFieldErrors={mutationError?.fields ?? {}}
      toasts={toasts}
      onDismissToast={(id) => setToasts((current) => current.filter((toast) => toast.id !== id))}
      onCreate={() => { setMutationError(null); setSelectedTenant(null); setDrawerMode("create"); }}
      onEdit={(tenant) => { setMutationError(null); setSelectedTenant(tenant); setDrawerMode("edit"); }}
      onLogo={(tenant) => { setMutationError(null); setSelectedTenant(tenant); setDrawerMode("logo"); }}
      onAdmin={(tenant) => { setMutationError(null); setSelectedTenant(tenant); setDrawerMode("admin"); }}
      onDelete={(tenant) => { setMutationError(null); setPendingDeleteTenant(tenant); }}
      onSwitch={(tenant) => { setMutationError(null); setPendingSwitchTenant(tenant); }}
      onCloseDrawer={() => { if (isSaving) return; setDrawerMode(null); setSelectedTenant(null); setMutationError(null); }}
      onCloseSwitch={() => { if (switchMutation.isPending) return; setPendingSwitchTenant(null); setMutationError(null); }}
      onCloseDelete={() => { if (deleteMutation.isPending) return; setPendingDeleteTenant(null); setMutationError(null); }}
      onSubmitCreate={(input) => { setMutationError(null); createMutation.mutate(input); }}
      onSubmitEdit={(tenantId, input) => { setMutationError(null); updateMutation.mutate({ tenantId, input }); }}
      onSubmitBootstrap={(tenantId, input) => { setMutationError(null); bootstrapMutation.mutate({ tenantId, input }); }}
      onSubmitLogo={(tenantId, file) => { setMutationError(null); logoMutation.mutate({ tenantId, file }); }}
      onConfirmSwitch={() => { if (pendingSwitchTenant) switchMutation.mutate(pendingSwitchTenant.id); }}
      onConfirmDelete={() => { if (pendingDeleteTenant) deleteMutation.mutate(pendingDeleteTenant.id); }}
    />
  );
}

