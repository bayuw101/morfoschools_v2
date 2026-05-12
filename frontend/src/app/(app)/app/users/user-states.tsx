"use client";

import { Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function UserListLoadingState() {
  return (
    <div aria-label="Loading users">
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
            {Array.from({ length: 5 }).map((_, index) => (
              <tr key={index} className="bg-[color:var(--surface)]">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-xl" />
                    <div className="min-w-0 space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3.5 w-56" />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-44" /></td>
                <td className="px-4 py-3"><Skeleton className="h-6 w-20 rounded-full" /></td>
                <td className="px-4 py-3"><div className="flex justify-end pr-1"><Skeleton className="h-9 w-9 rounded-xl" /></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-3 p-3 md:hidden">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="min-w-0 rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface)] p-3 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
            <div className="flex min-w-0 items-start gap-3">
              <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-2 pr-1">
                    <Skeleton className="h-4 w-32 max-w-full" />
                    <Skeleton className="h-3.5 w-44 max-w-full" />
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Skeleton className="h-6 w-20 rounded-full" />
                      <Skeleton className="h-6 w-28 rounded-lg" />
                    </div>
                  </div>
                  <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function NoUsersState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="m-4 flex min-h-48 flex-col items-center justify-center rounded-[22px] border border-dashed border-[color:var(--border)] bg-[color:var(--surface-subtle)] p-6 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--brand-soft)] text-[color:var(--brand-strong)]"><Users className="h-5 w-5" /></div>
      <h3 className="font-display text-lg font-bold">Belum ada user tenant</h3>
      <p className="mt-1 max-w-md text-sm text-[color:var(--muted-foreground)]">Tambahkan admin, guru, atau staff pertama dari data API kosong.</p>
      <Button className="mt-4" variant="primary" onClick={onCreate}>Add user</Button>
    </div>
  );
}

export function NoUserResultsState({ onReset }: { onReset: () => void }) {
  return (
    <div className="m-4 flex min-h-48 flex-col items-center justify-center rounded-[22px] border border-dashed border-[color:var(--border)] bg-[color:var(--surface-subtle)] p-6 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--brand-soft)] text-[color:var(--brand-strong)]"><Users className="h-5 w-5" /></div>
      <h3 className="font-display text-lg font-bold">User tidak ditemukan</h3>
      <p className="mt-1 max-w-md text-sm text-[color:var(--muted-foreground)]">Coba ubah keyword atau status filter.</p>
      <Button className="mt-4" variant="secondary" onClick={onReset}>Reset filters</Button>
    </div>
  );
}
