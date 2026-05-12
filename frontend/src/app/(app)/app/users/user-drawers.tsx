"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, Mail, ShieldCheck, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormDrawer } from "@/components/ui/form-drawer";
import { TextField } from "@/components/ui/text-field";
import type { UserDirectoryRow, UserMutationInput } from "@/lib/users-api";
import { toggleRole } from "./users-domain";

export type RoleOption = { code: string; label: string };
export type TenantOption = { id: string; name: string; code?: string };

export const roleOptions: RoleOption[] = [
  { code: "school_admin", label: "School Admin" },
  { code: "academic_admin", label: "Academic Admin" },
  { code: "teacher", label: "Teacher" },
  { code: "student", label: "Student" },
  { code: "parent", label: "Parent" },
  { code: "finance", label: "Finance" },
  { code: "proctor", label: "Proctor" },
  { code: "content_reviewer", label: "Content Reviewer" },
];

function fieldError(errors: Record<string, string> | undefined, ...names: string[]) {
  return names.map((name) => errors?.[name]).find(Boolean);
}

export function UserFormDrawer({
  mode,
  user,
  isSaving,
  error,
  fieldErrors = {},
  tenantOptions,
  isPlatformContext,
  currentTenantName,
  onClose,
  onSubmit,
}: {
  mode: "create" | "edit";
  user?: UserDirectoryRow | null;
  isSaving: boolean;
  error?: string | null;
  fieldErrors?: Record<string, string>;
  tenantOptions: TenantOption[];
  isPlatformContext: boolean;
  currentTenantName?: string;
  onClose: () => void;
  onSubmit: (input: UserMutationInput) => void;
}) {
  const [email, setEmail] = useState(user?.email ?? "");
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [roleCodes, setRoleCodes] = useState<string[]>(user?.roles ?? []);
  const [selectedTenantId, setSelectedTenantId] = useState(user?.tenantId ?? "");
  const needsTenantSelection = mode === "create" && isPlatformContext;
  const createDisabled = needsTenantSelection && !selectedTenantId;
  const hasFieldErrors = Object.keys(fieldErrors).length > 0;

  useEffect(() => {
    setEmail(user?.email ?? "");
    setDisplayName(user?.displayName ?? "");
    setRoleCodes(user?.roles ?? []);
    setSelectedTenantId(user?.tenantId ?? "");
  }, [user, mode]);

  const selectedTenant = useMemo(
    () => tenantOptions.find((tenant) => tenant.id === selectedTenantId),
    [selectedTenantId, tenantOptions],
  );

  return (
    <FormDrawer
      open
      onOpenChange={(open) => { if (!open) onClose(); }}
      title={mode === "create" ? "Add user" : user?.displayName ?? "Edit user"}
      description={needsTenantSelection ? "Select destination tenant before creating membership." : `Tenant: ${currentTenantName || user?.tenantId || "current"}`}
      footer={(
        <>
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button form="user-form" type="submit" variant="primary" loading={isSaving} disabled={createDisabled || isSaving}>
            {mode === "create" ? `Create user${selectedTenant ? ` in ${selectedTenant.name}` : ""}` : "Save changes"}
          </Button>
        </>
      )}
    >
      <form id="user-form" className="space-y-3" onSubmit={(event) => {
        event.preventDefault();
        if (createDisabled) return;
        onSubmit({ email: mode === "create" ? email : undefined, displayName, roleCodes, tenantId: needsTenantSelection ? selectedTenantId : undefined });
      }}>
        {needsTenantSelection ? (
          <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">Select destination tenant</p>
                <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">Create is disabled until tenant is selected.</p>
              </div>
              <Building2 className="h-4 w-4 text-[color:var(--muted-foreground)]" />
            </div>
            <div className="grid gap-2">
              {fieldError(fieldErrors, "tenantId", "tenant") ? <p className="rounded-xl border border-[color:var(--danger-border,var(--border))] bg-[color:var(--surface-subtle)] px-3 py-2 text-xs font-semibold text-[color:var(--danger,var(--foreground))]">{fieldError(fieldErrors, "tenantId", "tenant")}</p> : null}
              {tenantOptions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[color:var(--border)] bg-[color:var(--surface-subtle)] p-3 text-xs text-[color:var(--muted-foreground)]">
                  Tenant list belum tersedia. Pilih tenant context dulu dari master admin switcher.
                </div>
              ) : tenantOptions.map((tenant) => {
                const selected = tenant.id === selectedTenantId;
                return (
                  <button key={tenant.id} type="button" onClick={() => setSelectedTenantId(tenant.id)} className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition ${selected ? "border-[color:var(--brand)] bg-[color:var(--brand-soft)] text-[color:var(--brand-strong)]" : "border-[color:var(--border)] bg-[color:var(--background)] text-[color:var(--foreground)] hover:bg-[color:var(--surface-subtle)]"}`}>
                    <span className="min-w-0">
                      <span className="block truncate font-bold">{tenant.name}</span>
                      <span className="block truncate text-xs opacity-70">{tenant.code ?? tenant.id}</span>
                    </span>
                    {selected ? <ShieldCheck className="h-4 w-4" /> : null}
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        {mode === "create" ? <TextField label="Email" type="email" prefix={<Mail className="h-4 w-4" />} value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" error={fieldError(fieldErrors, "email")} /> : null}

        <TextField label="Display name" prefix={<UserRound className="h-4 w-4" />} value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" error={fieldError(fieldErrors, "displayName", "name")} />

        <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">Role assignment</p>
            <Badge>{roleCodes.length} selected</Badge>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {fieldError(fieldErrors, "roleCodes", "roles") ? <p className="w-full rounded-xl border border-[color:var(--danger-border,var(--border))] bg-[color:var(--surface-subtle)] px-3 py-2 text-xs font-semibold text-[color:var(--danger,var(--foreground))]">{fieldError(fieldErrors, "roleCodes", "roles")}</p> : null}
            {roleOptions.map((role) => {
              const selected = roleCodes.includes(role.code);
              return <button key={role.code} type="button" onClick={() => setRoleCodes((current) => toggleRole(current, role.code))} className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${selected ? "border-[color:var(--brand)] bg-[color:var(--brand-soft)] text-[color:var(--brand-strong)]" : "border-[color:var(--border)] bg-[color:var(--background)] text-[color:var(--muted-foreground)] hover:bg-[color:var(--surface-subtle)]"}`}>{role.label}</button>;
            })}
          </div>
        </section>

        {error && !hasFieldErrors ? <div className="rounded-2xl border border-[color:var(--danger-border,var(--border))] bg-[color:var(--surface-subtle)] p-3 text-sm text-[color:var(--danger,var(--foreground))]">{error}</div> : null}
      </form>
    </FormDrawer>
  );
}
