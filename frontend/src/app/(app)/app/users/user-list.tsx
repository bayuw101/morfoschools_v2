"use client";

import { Pencil, UserMinus } from "lucide-react";

import { ActionMenu, type ActionMenuItem } from "@/components/ui/action-menu";
import { Badge } from "@/components/ui/badge";
import type { UserDirectoryRow } from "@/lib/users-api";
import { statusVariant, userInitials } from "./users-domain";

function userActionItems({ user, isDeactivating, onEdit, onDeactivate }: { user: UserDirectoryRow; isDeactivating: boolean; onEdit: (user: UserDirectoryRow) => void; onDeactivate: (user: UserDirectoryRow) => void }): ActionMenuItem[] {
  return [
    { label: "Edit user", icon: Pencil, onSelect: () => onEdit(user) },
    { label: "Deactivate", icon: UserMinus, tone: "danger", loading: isDeactivating, onSelect: () => onDeactivate(user) },
  ];
}

function UserAvatar({ user }: { user: UserDirectoryRow }) {
  return <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--brand-soft)] font-display text-xs font-bold text-[color:var(--brand-strong)]">{userInitials(user.displayName)}</div>;
}

function roleLabel(user: UserDirectoryRow) {
  return user.roleNames.join(", ") || user.roles.join(", ") || "No roles";
}

export type UserListProps = {
  users: UserDirectoryRow[];
  deactivatingUserId: string | null;
  onEdit: (user: UserDirectoryRow) => void;
  onDeactivate: (user: UserDirectoryRow) => void;
};

export function UserDesktopTable({ users, deactivatingUserId, onEdit, onDeactivate }: UserListProps) {
  return (
    <div className="hidden overflow-visible md:block">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[color:var(--border)] bg-[color:var(--surface-subtle)] text-left text-[11px] font-bold uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
            <th className="px-4 py-3">User</th>
            <th className="px-4 py-3">Roles</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[color:var(--border)]">
          {users.map((user) => (
            <tr key={user.membershipId} className="group bg-[color:var(--surface)] transition-colors hover:bg-[color:var(--surface-subtle)]">
              <td className="px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <UserAvatar user={user} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[color:var(--foreground)]">{user.displayName}</p>
                    <p className="mt-0.5 truncate text-sm text-[color:var(--muted-foreground)]">{user.email}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3"><span className="line-clamp-1 text-[color:var(--muted-foreground)]">{roleLabel(user)}</span></td>
              <td className="px-4 py-3"><Badge variant={statusVariant(user.tenantStatus)}>{user.tenantStatus}</Badge></td>
              <td className="px-4 py-3"><div className="flex justify-end pr-1"><ActionMenu align="end" label={`Open actions for ${user.displayName}`} items={userActionItems({ user, isDeactivating: deactivatingUserId === user.id, onEdit, onDeactivate })} /></div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function UserMobileCards({ users, deactivatingUserId, onEdit, onDeactivate }: UserListProps) {
  return (
    <div className="grid gap-3 p-3 md:hidden">
      {users.map((user) => (
        <div key={user.membershipId} className="min-w-0 rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface)] p-3 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <div className="flex min-w-0 items-start gap-3">
            <UserAvatar user={user} />
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-start justify-between gap-2">
                <div className="min-w-0 flex-1 pr-1">
                  <p className="truncate font-semibold text-[color:var(--foreground)]">{user.displayName}</p>
                  <p className="mt-0.5 truncate text-sm text-[color:var(--muted-foreground)]">{user.email}</p>
                  <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2">
                    <Badge variant={statusVariant(user.tenantStatus)}>{user.tenantStatus}</Badge>
                    <span className="max-w-full truncate rounded-lg border border-[color:var(--border)] bg-[color:var(--background)] px-2 py-0.5 text-xs text-[color:var(--muted-foreground)]">{roleLabel(user)}</span>
                  </div>
                </div>
                <div className="shrink-0">
                  <ActionMenu align="end" label={`Open actions for ${user.displayName}`} items={userActionItems({ user, isDeactivating: deactivatingUserId === user.id, onEdit, onDeactivate })} />
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
