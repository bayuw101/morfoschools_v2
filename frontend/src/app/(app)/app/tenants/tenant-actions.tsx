"use client";

import { ArrowRightLeft, ImagePlus, Pencil, ShieldCheck, Trash2 } from "lucide-react";

import { ActionMenu, type ActionMenuItem } from "@/components/ui/action-menu";
import type { PlatformTenantRow } from "@/lib/tenants-api";

export function tenantActionItems({ tenant, isSwitching, onEdit, onLogo, onAdmin, onDelete, onSwitch }: { tenant: PlatformTenantRow; isSwitching: boolean; onEdit: (tenant: PlatformTenantRow) => void; onLogo: (tenant: PlatformTenantRow) => void; onAdmin: (tenant: PlatformTenantRow) => void; onDelete: (tenant: PlatformTenantRow) => void; onSwitch: (tenant: PlatformTenantRow) => void }): ActionMenuItem[] {
  const active = tenant.status === "active";
  return [
    { label: "Edit tenant", icon: Pencil, onSelect: () => onEdit(tenant) },
    { label: "Upload logo", icon: ImagePlus, onSelect: () => onLogo(tenant) },
    { label: active ? "Setup admin" : "Admin disabled", icon: ShieldCheck, disabled: !active, onSelect: () => onAdmin(tenant) },
    { label: active ? "Switch" : "Switch disabled", icon: ArrowRightLeft, disabled: !active, loading: isSwitching, onSelect: () => onSwitch(tenant) },
    { label: "Delete", icon: Trash2, tone: "danger", onSelect: () => onDelete(tenant) },
  ];
}

export function TenantActions({ tenant, isSwitching, onEdit, onLogo, onAdmin, onDelete, onSwitch }: { tenant: PlatformTenantRow; isSwitching: boolean; onEdit: (tenant: PlatformTenantRow) => void; onLogo: (tenant: PlatformTenantRow) => void; onAdmin: (tenant: PlatformTenantRow) => void; onDelete: (tenant: PlatformTenantRow) => void; onSwitch: (tenant: PlatformTenantRow) => void }) {
  return (
    <div className="flex justify-end">
      <ActionMenu
        align="end"
        label={`Open actions for ${tenant.name}`}
        items={tenantActionItems({ tenant, isSwitching, onEdit, onLogo, onAdmin, onDelete, onSwitch })}
      />
    </div>
  );
}
