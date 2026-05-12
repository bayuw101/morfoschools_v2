"use client";

import { useEffect, useState } from "react";
import { KeyRound, ShieldCheck, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormDrawer } from "@/components/ui/form-drawer";
import { TextField } from "@/components/ui/text-field";
import type { BootstrapTenantAdminInput, PlatformTenantRow } from "@/lib/tenants-api";
import { fieldError } from "./tenant-form-errors";

export type TenantAdminDrawerProps = {
  tenant: PlatformTenantRow;
  isSaving: boolean;
  error?: string | null;
  fieldErrors?: Record<string, string>;
  onClose: () => void;
  onSubmit: (tenantId: string, input: BootstrapTenantAdminInput) => void;
};

export function TenantAdminDrawer({ tenant, isSaving, error, fieldErrors = {}, onClose, onSubmit }: TenantAdminDrawerProps) {
  const [email, setEmail] = useState(tenant.primaryAdminEmail ?? "");
  const [displayName, setDisplayName] = useState(tenant.primaryAdminName ?? "");
  const [password, setPassword] = useState("");
  const disabled = !email.trim() || !displayName.trim() || !password || password.length < 10 || isSaving;
  const hasFieldErrors = Object.keys(fieldErrors).length > 0;

  useEffect(() => {
    setEmail(tenant.primaryAdminEmail ?? "");
    setDisplayName(tenant.primaryAdminName ?? "");
    setPassword("");
  }, [tenant.id, tenant.primaryAdminEmail, tenant.primaryAdminName]);

  return (
    <FormDrawer
      open
      onOpenChange={(open) => { if (!open) onClose(); }}
      title="Setup primary admin"
      description={`Kelola admin utama untuk ${tenant.name}. Hanya Master Admin yang bisa mengganti admin utama tenant.`}
      footer={<><Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>Cancel</Button><Button form="tenant-admin-form" type="submit" variant="primary" loading={isSaving} disabled={disabled}>Save admin</Button></>}
    >
      <form id="tenant-admin-form" className="space-y-3" onSubmit={(event) => { event.preventDefault(); if (!disabled) onSubmit(tenant.id, { email: email.trim(), displayName: displayName.trim(), password }); }}>
        <TextField label="Admin email" type="email" prefix={<UserRound className="h-4 w-4" />} value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" error={fieldError(fieldErrors, "email", "adminEmail")} />
        <TextField label="Display name" prefix={<ShieldCheck className="h-4 w-4" />} value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" error={fieldError(fieldErrors, "displayName", "name", "adminName")} />
        <TextField label="Temporary password / reset password" type="password" prefix={<KeyRound className="h-4 w-4" />} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" error={fieldError(fieldErrors, "password", "temporaryPassword")} />
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-subtle)] p-3 text-xs leading-5 text-[color:var(--muted-foreground)]">
          Minimal 10 karakter. Email yang sama akan diperbarui; email baru akan menjadi primary admin tenant ini. Admin utama lama otomatis tidak lagi menjadi primary admin.
        </div>
        {error && !hasFieldErrors ? <div className="rounded-2xl border border-[color:var(--danger-border,var(--border))] bg-[color:var(--surface-subtle)] p-3 text-sm text-[color:var(--danger,var(--foreground))]">{error}</div> : null}
      </form>
    </FormDrawer>
  );
}
