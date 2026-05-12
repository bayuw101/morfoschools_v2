"use client";

import { ActionMenu } from "@/components/ui/action-menu";
import { Badge } from "@/components/ui/badge";
import type { PlatformTenantRow } from "@/lib/tenants-api";
import { TenantActions, tenantActionItems } from "./tenant-actions";
import { TenantAvatar } from "./tenant-avatar";

function statusVariant(status: string) {
  if (status === "active") return "success";
  if (status === "suspended") return "warning";
  return "default";
}

export type TenantListProps = {
  tenants: PlatformTenantRow[];
  isSwitchingTenantId: string | null;
  onEdit: (tenant: PlatformTenantRow) => void;
  onLogo: (tenant: PlatformTenantRow) => void;
  onAdmin: (tenant: PlatformTenantRow) => void;
  onDelete: (tenant: PlatformTenantRow) => void;
  onSwitch: (tenant: PlatformTenantRow) => void;
};

export function TenantDesktopTable({ tenants, isSwitchingTenantId, onEdit, onLogo, onAdmin, onDelete, onSwitch }: TenantListProps) {
  return (
    <div className="hidden overflow-visible md:block">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[color:var(--border)] bg-[color:var(--surface-subtle)] text-left text-[11px] font-bold uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
            <th className="px-4 py-3">School tenant</th>
            <th className="px-4 py-3">Code</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[color:var(--border)]">
          {tenants.map((tenant) => (
            <tr key={tenant.id} className="group bg-[color:var(--surface)] transition-colors hover:bg-[color:var(--surface-subtle)]">
              <td className="px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <TenantAvatar tenant={tenant} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[color:var(--foreground)]">{tenant.name}</p>
                    <p className="mt-0.5 truncate font-mono text-[11px] text-[color:var(--muted-foreground)]">{tenant.id}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3"><span className="rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-2.5 py-1 font-mono text-xs text-[color:var(--muted-foreground)]">{tenant.code}</span></td>
              <td className="px-4 py-3"><Badge variant={statusVariant(tenant.status)}>{tenant.status}</Badge></td>
              <td className="px-4 py-3"><TenantActions tenant={tenant} isSwitching={isSwitchingTenantId === tenant.id} onEdit={onEdit} onLogo={onLogo} onAdmin={onAdmin} onDelete={onDelete} onSwitch={onSwitch} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TenantMobileCards({ tenants, isSwitchingTenantId, onEdit, onLogo, onAdmin, onDelete, onSwitch }: TenantListProps) {
  return (
    <div className="grid gap-3 p-3 md:hidden">
      {tenants.map((tenant) => {
        const isSwitching = isSwitchingTenantId === tenant.id;
        return (
          <div key={tenant.id} className="relative min-w-0 overflow-visible rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface)] p-3 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
            <div className="flex min-w-0 items-start gap-2">
              <TenantAvatar tenant={tenant} />
              <div className="min-w-0 flex-1">
                <p className="truncate pr-1 font-semibold text-[color:var(--foreground)]">{tenant.name}</p>
                <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
                  <span className="max-w-full truncate rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-2 py-0.5 font-mono text-xs text-[color:var(--muted-foreground)]">{tenant.code}</span>
                  <Badge variant={statusVariant(tenant.status)}>{tenant.status}</Badge>
                </div>
              </div>
              <div className="shrink-0">
                <ActionMenu align="end" label={`Open actions for ${tenant.name}`} items={tenantActionItems({ tenant, isSwitching, onEdit, onLogo, onAdmin, onDelete, onSwitch })} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
