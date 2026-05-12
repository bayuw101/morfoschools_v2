import type { UserDirectoryRow } from "@/lib/users-api";

export type UserStatusFilter = "all" | "active" | "suspended" | "invited" | "archived";

export function statusVariant(status: string) {
  if (status === "active") return "success";
  if (status === "suspended" || status === "invited") return "warning";
  return "default";
}

export function getUserMetrics(users: UserDirectoryRow[]) {
  return users.reduce(
    (metrics, user) => {
      metrics.total += 1;
      if (user.tenantStatus === "active") metrics.active += 1;
      if (user.tenantStatus === "suspended") metrics.suspended += 1;
      if (user.tenantStatus === "invited") metrics.invited += 1;
      if (user.tenantStatus === "archived") metrics.archived += 1;
      return metrics;
    },
    { total: 0, active: 0, suspended: 0, invited: 0, archived: 0 },
  );
}

export function filterUsers(users: UserDirectoryRow[], { query, status }: { query: string; status: UserStatusFilter }) {
  const normalizedQuery = query.trim().toLowerCase();
  return users.filter((user) => {
    const matchesStatus = status === "all" || user.tenantStatus === status;
    const matchesQuery = !normalizedQuery || [
      user.displayName,
      user.email,
      user.tenantId,
      ...user.roles,
      ...user.roleNames,
    ].some((value) => value.toLowerCase().includes(normalizedQuery));
    return matchesStatus && matchesQuery;
  });
}

export function userInitials(value: string) {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "US";
}

export function toggleRole(values: string[], roleCode: string) {
  return values.includes(roleCode) ? values.filter((value) => value !== roleCode) : [...values, roleCode];
}
