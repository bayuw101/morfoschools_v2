"use client";

import { useEffect, useState } from "react";
import { Building2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormDrawer } from "@/components/ui/form-drawer";
import { TextField } from "@/components/ui/text-field";
import type { CreateTenantInput, PlatformTenantRow, TenantStatus, UpdateTenantInput } from "@/lib/tenants-api";
import { tenantSlug } from "./tenants-domain";
import { TenantStatusSelector, toTenantStatus } from "./tenant-status-selector";
import { fieldError } from "./tenant-form-errors";

export type TenantFormDrawerProps = {
  mode: "create" | "edit";
  tenant?: PlatformTenantRow | null;
  isSaving: boolean;
  error?: string | null;
  fieldErrors?: Record<string, string>;
  onClose: () => void;
  onSubmitCreate: (input: CreateTenantInput) => void;
  onSubmitEdit: (tenantId: string, input: UpdateTenantInput) => void;
};

export function TenantFormDrawer({ mode, tenant, isSaving, error, fieldErrors = {}, onClose, onSubmitCreate, onSubmitEdit }: TenantFormDrawerProps) {
  const [name, setName] = useState(tenant?.name ?? "");
  const [code, setCode] = useState(tenant?.code ?? "");
  const [status, setStatus] = useState<TenantStatus>(toTenantStatus(tenant?.status));
  const disabled = !name.trim() || !code.trim() || isSaving;
  const isEdit = mode === "edit";
  const hasFieldErrors = Object.keys(fieldErrors).length > 0;

  useEffect(() => {
    setName(tenant?.name ?? "");
    setCode(tenant?.code ?? "");
    setStatus(toTenantStatus(tenant?.status));
  }, [tenant?.id, tenant?.name, tenant?.code, tenant?.status]);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!isEdit) setCode(tenantSlug(value));
  };

  return (
    <FormDrawer
      open
      onOpenChange={(open) => { if (!open) onClose(); }}
      title={isEdit ? "Edit tenant" : "Create tenant"}
      description={isEdit ? "Perbarui nama sekolah dan kode tenant." : "Buat sekolah/tenant baru. Kode tenant otomatis mengikuti nama seperti slug."}
      footer={<><Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>Cancel</Button><Button form="tenant-form" type="submit" variant="primary" loading={isSaving} disabled={disabled}>{isEdit ? "Save changes" : "Create tenant"}</Button></>}
    >
      <form id="tenant-form" className="space-y-3" onSubmit={(event) => { event.preventDefault(); if (disabled) return; const baseInput = { name: name.trim(), code: tenantSlug(code) }; if (isEdit && tenant) onSubmitEdit(tenant.id, { ...baseInput, status }); else onSubmitCreate(baseInput); }}>
        <TextField label="School name" prefix={<Building2 className="h-4 w-4" />} value={name} onChange={(event) => handleNameChange(event.target.value)} autoComplete="organization" error={fieldError(fieldErrors, "name", "schoolName")} />
        <TextField label="Tenant code" prefix={<Sparkles className="h-4 w-4" />} value={code} onChange={(event) => setCode(tenantSlug(event.target.value))} autoComplete="off" error={fieldError(fieldErrors, "code", "tenantCode", "slug")} />
        {isEdit ? <TenantStatusSelector value={status} onChange={setStatus} /> : null}
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-subtle)] p-3 text-xs leading-5 text-[color:var(--muted-foreground)]">
          Kode tenant otomatis menjadi slug lowercase dari nama sekolah. Contoh: “SMA Nusantara Baru” → “sma-nusantara-baru”.
        </div>
        {error && !hasFieldErrors ? <div className="rounded-2xl border border-[color:var(--danger-border,var(--border))] bg-[color:var(--surface-subtle)] p-3 text-sm text-[color:var(--danger,var(--foreground))]">{error}</div> : null}
      </form>
    </FormDrawer>
  );
}
