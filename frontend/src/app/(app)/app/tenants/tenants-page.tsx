"use client";

import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DirectoryToolbar, type DirectoryMetric } from "@/components/ui/directory-toolbar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Panel } from "@/components/ui/panel";
import { Toast, type ToastItem } from "@/components/ui/toast";
import type { BootstrapTenantAdminInput, CreateTenantInput, PlatformTenantRow, UpdateTenantInput } from "@/lib/tenants-api";
import { filterTenants, getTenantMetrics, type TenantStatusFilter } from "./tenants-domain";
import { TenantAdminDrawer, TenantFormDrawer, TenantLogoDrawer } from "./tenant-drawers";
import { TenantDesktopTable, TenantMobileCards } from "./tenant-list";
import { NoTenantResultsState, NoTenantsState, TenantListLoadingState } from "./tenant-states";


type DrawerMode = "create" | "edit" | "logo" | "admin" | null;

type TenantsPageContentProps = {
  tenants: PlatformTenantRow[];
  isLoading: boolean;
  error: Error | null;
  isSaving?: boolean;
  isSwitchingTenantId?: string | null;
  drawerMode?: DrawerMode;
  selectedTenant?: PlatformTenantRow | null;
  pendingSwitchTenant?: PlatformTenantRow | null;
  pendingDeleteTenant?: PlatformTenantRow | null;
  mutationError?: string | null;
  mutationFieldErrors?: Record<string, string>;
  onCreate: () => void;
  toasts?: ToastItem[];
  onDismissToast?: (id: string) => void;
  onEdit: (tenant: PlatformTenantRow) => void;
  onLogo: (tenant: PlatformTenantRow) => void;
  onAdmin: (tenant: PlatformTenantRow) => void;
  onDelete: (tenant: PlatformTenantRow) => void;
  onSwitch: (tenant: PlatformTenantRow) => void;
  onCloseDrawer?: () => void;
  onCloseSwitch?: () => void;
  onCloseDelete?: () => void;
  onSubmitCreate?: (input: CreateTenantInput) => void;
  onSubmitEdit?: (tenantId: string, input: UpdateTenantInput) => void;
  onSubmitBootstrap?: (tenantId: string, input: BootstrapTenantAdminInput) => void;
  onSubmitLogo?: (tenantId: string, file: File) => void;
  onConfirmSwitch?: () => void;
  onConfirmDelete?: () => void;
};

const statusFilters: Array<{ value: TenantStatusFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "archived", label: "Archived" },
];

export function TenantsPageContent({ tenants, isLoading, error, isSaving = false, isSwitchingTenantId = null, drawerMode = null, selectedTenant = null, pendingSwitchTenant = null, pendingDeleteTenant = null, mutationError = null, mutationFieldErrors = {}, toasts = [], onDismissToast = () => { }, onCreate, onEdit, onLogo, onAdmin, onDelete, onSwitch, onCloseDrawer = () => { }, onCloseSwitch = () => { }, onCloseDelete = () => { }, onSubmitCreate = () => { }, onSubmitEdit = () => { }, onSubmitBootstrap = () => { }, onSubmitLogo = () => { }, onConfirmSwitch = () => { }, onConfirmDelete = () => { } }: TenantsPageContentProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<TenantStatusFilter>("all");
  const metrics = useMemo(() => getTenantMetrics(tenants), [tenants]);
  const filteredTenants = useMemo(() => filterTenants(tenants, { query, status }), [tenants, query, status]);
  const hasFilters = query.trim().length > 0 || status !== "all";

  return (
    <div className="space-y-4 pb-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2"><Badge>Master admin</Badge><span className="text-xs text-[color:var(--muted-foreground)]">Platform tenant onboarding</span></div>
          <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">Manage Tenants</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[color:var(--muted-foreground)]">Buat sekolah baru, atur admin utama, lalu switch tenant untuk lanjut setup operasional.</p>
        </div>
        <div className="flex items-center gap-2"><Button variant="primary" onClick={onCreate}><Plus className="h-4 w-4" />Create tenant</Button></div>
      </header>

      <Panel className="-mx-4 overflow-hidden rounded-none border-x-0 p-0 sm:mx-0 sm:rounded-[24px] sm:border-x">
        <DirectoryToolbar
          metrics={[
            { label: "total", value: metrics.total, icon: CheckCircle2 },
            { label: "active", value: metrics.active },
            { label: "suspended", value: metrics.suspended },
            { label: "archived", value: metrics.archived },
          ] satisfies DirectoryMetric[]}
          query={query}
          onQueryChange={setQuery}
          searchLabel="Search tenants"
          searchPlaceholder="Search school or slug..."
          filters={statusFilters}
          selectedFilter={status}
          onFilterChange={setStatus}
          hasFilters={hasFilters}
          onReset={() => { setQuery(""); setStatus("all"); }}
        />
        {error ? <div className="m-4 flex items-start gap-3 rounded-[18px] border border-[color:var(--danger-border,var(--border))] bg-[color:var(--surface-subtle)] p-4 text-sm"><AlertCircle className="mt-0.5 h-5 w-5 text-[color:var(--danger,var(--brand-strong))]" /><div><p className="font-bold">Gagal memuat tenant</p><p className="text-[color:var(--muted-foreground)]">{error.message}</p></div></div> : null}
        {isLoading ? (
          <TenantListLoadingState />
        ) : tenants.length === 0 ? (
          <NoTenantsState />
        ) : filteredTenants.length === 0 ? (
          <NoTenantResultsState onReset={() => { setQuery(""); setStatus("all"); }} />
        ) : (
          <>
            <TenantDesktopTable tenants={filteredTenants} isSwitchingTenantId={isSwitchingTenantId} onEdit={onEdit} onLogo={onLogo} onAdmin={onAdmin} onDelete={onDelete} onSwitch={onSwitch} />
            <TenantMobileCards tenants={filteredTenants} isSwitchingTenantId={isSwitchingTenantId} onEdit={onEdit} onLogo={onLogo} onAdmin={onAdmin} onDelete={onDelete} onSwitch={onSwitch} />
          </>
        )}
      </Panel>

      {drawerMode === "create" ? <TenantFormDrawer mode="create" isSaving={isSaving} error={mutationError} fieldErrors={mutationFieldErrors} onClose={onCloseDrawer} onSubmitCreate={onSubmitCreate} onSubmitEdit={onSubmitEdit} /> : null}
      {drawerMode === "edit" && selectedTenant ? <TenantFormDrawer mode="edit" tenant={selectedTenant} isSaving={isSaving} error={mutationError} fieldErrors={mutationFieldErrors} onClose={onCloseDrawer} onSubmitCreate={onSubmitCreate} onSubmitEdit={onSubmitEdit} /> : null}
      {drawerMode === "logo" && selectedTenant ? <TenantLogoDrawer tenant={selectedTenant} isSaving={isSaving} error={mutationError} onClose={onCloseDrawer} onSubmit={onSubmitLogo} /> : null}
      {drawerMode === "admin" && selectedTenant ? <TenantAdminDrawer tenant={selectedTenant} isSaving={isSaving} error={mutationError} fieldErrors={mutationFieldErrors} onClose={onCloseDrawer} onSubmit={onSubmitBootstrap} /> : null}
      <div className="fixed right-4 top-4 z-[80] flex w-[min(420px,calc(100vw-2rem))] flex-col gap-3">{toasts.map((toast) => <Toast key={toast.id} toast={toast} onDismiss={onDismissToast} />)}</div>
      <ConfirmDialog open={Boolean(pendingSwitchTenant)} onOpenChange={(open) => { if (!open) onCloseSwitch(); }} title="Switch tenant context?" description="Session effective tenant akan berubah untuk setup berikutnya." confirmLabel="Switch tenant" onConfirm={onConfirmSwitch} details={<span>Masuk sebagai tenant {pendingSwitchTenant?.name ?? "terpilih"}. UI akan memakai context tenant ini setelah berhasil.</span>} />
      <ConfirmDialog open={Boolean(pendingDeleteTenant)} onOpenChange={(open) => { if (!open) onCloseDelete(); }} title="Delete tenant?" description="Tenant akan diarsipkan bersama membership aktifnya. Gunakan ini hanya untuk tenant demo/salah input." confirmLabel="Delete tenant" tone="danger" onConfirm={onConfirmDelete} details={<span>Arsipkan tenant {pendingDeleteTenant?.name ?? "terpilih"}. Data audit tetap disimpan untuk jejak perubahan.</span>} />
    </div>
  );
}


