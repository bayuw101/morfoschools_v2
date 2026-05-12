"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ImagePlus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormDrawer } from "@/components/ui/form-drawer";
import type { PlatformTenantRow } from "@/lib/tenants-api";

export type TenantLogoDrawerProps = {
  tenant: PlatformTenantRow;
  isSaving: boolean;
  error?: string | null;
  fieldErrors?: Record<string, string>;
  onClose: () => void;
  onSubmit: (tenantId: string, file: File) => void;
};

export function TenantLogoDrawer({ tenant, isSaving, error, onClose, onSubmit }: TenantLogoDrawerProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const disabled = !file || isSaving;

  useEffect(() => {
    setFile(null);
    setPreviewUrl(null);
    setLocalError(null);
  }, [tenant.id]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const selectFile = (nextFile?: File) => {
    setLocalError(null);
    if (!nextFile) {
      setFile(null);
      return;
    }
    if (!["image/png", "image/jpeg", "image/webp"].includes(nextFile.type)) {
      setFile(null);
      setLocalError("Logo harus PNG, JPG, atau WEBP. SVG/GIF tidak diterima.");
      return;
    }
    if (nextFile.size > 2 * 1024 * 1024) {
      setFile(null);
      setLocalError("Ukuran logo maksimal 2 MB.");
      return;
    }
    setFile(nextFile);
  };

  const selectedFileSize = file ? (file.size >= 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : `${(file.size / 1024).toFixed(1)} KB`) : "";

  return (
    <FormDrawer
      open
      onOpenChange={(open) => { if (!open) onClose(); }}
      title="Upload school logo"
      description={`Upload logo resmi untuk ${tenant.name}. File baru akan menggantikan logo aktif.`}
      footer={<><Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>Cancel</Button><Button form="tenant-logo-form" type="submit" variant="primary" loading={isSaving} disabled={disabled}>Save logo</Button></>}
    >
      <form id="tenant-logo-form" className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (!disabled && file) onSubmit(tenant.id, file); }}>
        <div className="flex items-center gap-3 rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-subtle)] p-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)]">
            {tenant.logoUrl ? <img src={tenant.logoUrl} alt={`${tenant.name} logo`} className="h-full w-full object-cover" /> : <ImagePlus className="h-5 w-5 text-[color:var(--muted-foreground)]" />}
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-bold text-[color:var(--foreground)]">{tenant.name}</p>
            <p className="mt-1 text-xs leading-5 text-[color:var(--muted-foreground)]">Current logo preview. Recommended square PNG/JPG/WEBP, max 2 MB.</p>
          </div>
        </div>
        <label className="block cursor-pointer rounded-[22px] border border-dashed border-[color:var(--border-strong)] bg-[color:var(--surface)] p-5 text-center transition hover:bg-[color:var(--surface-subtle)]">
          <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => selectFile(event.target.files?.[0])} />
          <ImagePlus className="mx-auto h-6 w-6 text-[color:var(--brand-strong)]" />
          <span className="mt-2 block font-display text-sm font-bold text-[color:var(--foreground)]">Choose PNG, JPG, or WEBP logo</span>
          <span className="mt-1 block text-xs text-[color:var(--muted-foreground)]">SVG, GIF, and files above 2 MB will be rejected.</span>
        </label>
        {file ? (
          <div className="rounded-[22px] border border-[color:var(--brand-border,var(--border))] bg-[color:var(--brand-soft)] p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/60 bg-white/70">
                {previewUrl ? <img src={previewUrl} alt="Selected logo preview" className="h-full w-full object-cover" /> : <ImagePlus className="h-5 w-5 text-[color:var(--brand-strong)]" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[color:var(--brand-strong)]">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <p className="font-display text-sm font-bold">Logo siap diupload</p>
                </div>
                <p className="mt-1 truncate text-sm font-semibold text-[color:var(--foreground)]">{file.name}</p>
                <p className="mt-0.5 text-xs text-[color:var(--muted-foreground)]">{selectedFileSize} · klik Save logo untuk menyimpan</p>
              </div>
              <button type="button" onClick={() => { setFile(null); setLocalError(null); }} className="rounded-full p-2 text-[color:var(--muted-foreground)] transition hover:bg-white/70 hover:text-[color:var(--foreground)]" aria-label="Remove selected logo">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}
        {localError || error ? <div className="rounded-2xl border border-[color:var(--danger-border,var(--border))] bg-[color:var(--surface-subtle)] p-3 text-sm text-[color:var(--danger,var(--foreground))]">{localError ?? error}</div> : null}
      </form>
    </FormDrawer>
  );
}
