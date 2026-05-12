"use client";

import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DirectoryToolbar, type DirectoryMetric } from "@/components/ui/directory-toolbar";
import { Panel } from "@/components/ui/panel";
import type { UserDirectoryRow, UserMutationInput } from "@/lib/users-api";
import { UserFormDrawer, roleOptions, type TenantOption } from "./user-drawers";
import { UserDesktopTable, UserMobileCards } from "./user-list";
import { NoUserResultsState, NoUsersState, UserListLoadingState } from "./user-states";
import { filterUsers, getUserMetrics, type UserStatusFilter } from "./users-domain";

export type { TenantOption } from "./user-drawers";

export { roleOptions };

const statusFilters: Array<{ value: UserStatusFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "invited", label: "Invited" },
  { value: "archived", label: "Archived" },
];

type UsersPageContentProps = {
  users: UserDirectoryRow[];
  isLoading: boolean;
  error: Error | null;
  isSaving?: boolean;
  deactivatingUserId?: string | null;
  formMode?: "create" | "edit" | null;
  editingUser?: UserDirectoryRow | null;
  pendingDeactivateUser?: UserDirectoryRow | null;
  mutationError?: string | null;
  mutationFieldErrors?: Record<string, string>;
  tenantOptions?: TenantOption[];
  isPlatformContext?: boolean;
  currentTenantName?: string;
  onCreate: () => void;
  onEdit: (user: UserDirectoryRow) => void;
  onDeactivate: (user: UserDirectoryRow) => void;
  onCloseForm?: () => void;
  onCloseDeactivate?: () => void;
  onSubmitUser?: (input: UserMutationInput) => void;
  onConfirmDeactivate?: () => void;
};

export function UsersPageContent({ users, isLoading, error, isSaving = false, deactivatingUserId = null, formMode = null, editingUser = null, pendingDeactivateUser = null, mutationError = null, mutationFieldErrors = {}, tenantOptions = [], isPlatformContext = false, currentTenantName = "Current tenant", onCreate, onEdit, onDeactivate, onCloseForm = () => {}, onCloseDeactivate = () => {}, onSubmitUser = () => {}, onConfirmDeactivate = () => {} }: UsersPageContentProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<UserStatusFilter>("all");
  const metrics = useMemo(() => getUserMetrics(users), [users]);
  const filteredUsers = useMemo(() => filterUsers(users, { query, status }), [users, query, status]);
  const hasFilters = query.trim().length > 0 || status !== "all";
  const resetFilters = () => { setQuery(""); setStatus("all"); };

  return (
    <div className="space-y-4 pb-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge>{isPlatformContext ? "Master admin" : "Tenant admin"}</Badge>
            <span className="text-xs text-[color:var(--muted-foreground)]">{isPlatformContext ? "Choose tenant on create" : currentTenantName}</span>
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">Manage Users</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[color:var(--muted-foreground)]">Kelola membership, status, dan role per tenant. Create dari master admin wajib memilih tenant tujuan.</p>
        </div>
        <div className="flex items-center gap-2"><Button variant="primary" onClick={onCreate}><Plus className="h-4 w-4" />Add user</Button></div>
      </header>

      <Panel className="-mx-4 overflow-hidden rounded-none border-x-0 p-0 sm:mx-0 sm:rounded-[24px] sm:border-x" aria-label="User directory">
        <DirectoryToolbar
          metrics={[
            { label: "total", value: metrics.total, icon: CheckCircle2 },
            { label: "active", value: metrics.active },
            { label: "suspended", value: metrics.suspended },
            { label: "invited", value: metrics.invited },
            { label: "archived", value: metrics.archived },
          ] satisfies DirectoryMetric[]}
          query={query}
          onQueryChange={setQuery}
          searchLabel="Search users"
          searchPlaceholder="Search name, email, or role..."
          filters={statusFilters}
          selectedFilter={status}
          onFilterChange={setStatus}
          hasFilters={hasFilters}
          onReset={resetFilters}
        />
        {error ? <div className="m-4 flex items-start gap-3 rounded-[18px] border border-[color:var(--danger-border,var(--border))] bg-[color:var(--surface-subtle)] p-4 text-sm"><AlertCircle className="mt-0.5 h-5 w-5 text-[color:var(--danger,var(--brand-strong))]" /><div><p className="font-bold">Gagal memuat user</p><p className="text-[color:var(--muted-foreground)]">{error.message}</p></div></div> : null}
        {isLoading ? (
          <UserListLoadingState />
        ) : users.length === 0 ? (
          <NoUsersState onCreate={onCreate} />
        ) : filteredUsers.length === 0 ? (
          <NoUserResultsState onReset={resetFilters} />
        ) : (
          <>
            <UserDesktopTable users={filteredUsers} deactivatingUserId={deactivatingUserId} onEdit={onEdit} onDeactivate={onDeactivate} />
            <UserMobileCards users={filteredUsers} deactivatingUserId={deactivatingUserId} onEdit={onEdit} onDeactivate={onDeactivate} />
          </>
        )}
      </Panel>

      {formMode ? <UserFormDrawer mode={formMode} user={editingUser} isSaving={isSaving} error={mutationError} fieldErrors={mutationFieldErrors} tenantOptions={tenantOptions} isPlatformContext={isPlatformContext} currentTenantName={currentTenantName} onClose={onCloseForm} onSubmit={onSubmitUser} /> : null}
      <ConfirmDialog open={Boolean(pendingDeactivateUser)} onOpenChange={(open) => { if (!open) onCloseDeactivate(); }} title="Deactivate tenant user?" description="This archives the tenant membership only." confirmLabel="Deactivate user" tone="danger" onConfirm={onConfirmDeactivate} details={<span>Audit evidence akan dibuat untuk {pendingDeactivateUser?.displayName ?? "user"}. Tenant isolation tetap dijaga backend.</span>} />
    </div>
  );
}
