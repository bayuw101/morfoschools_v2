import { GraduationCap, LayoutDashboard } from "lucide-react";
import { appRoutes } from "@/config/routes";
import type { AuthSession } from "@/lib/auth";

type Role = AuthSession["role"];

export const primaryNavigation = [
  {
    label: "Dashboard",
    href: appRoutes.appHome,
    icon: LayoutDashboard,
    requiredRoles: [
      "master_admin",
      "school_admin",
      "academic_admin",
      "teacher",
      "student",
      "parent",
      "finance",
      "proctor",
      "content_reviewer",
    ] satisfies Role[],
  },
  {
    label: "Gallery",
    href: appRoutes.gallery,
    icon: GraduationCap,
    requiredRoles: ["master_admin", "school_admin", "academic_admin", "teacher", "content_reviewer"] satisfies Role[],
  },
] as const;

export type NavigationItem = (typeof primaryNavigation)[number];

export function canSeeNavigationItem(session: AuthSession | null, item: NavigationItem): boolean {
  if (!session) return false;
  const roles = session.roles?.length ? session.roles : [session.role];
  return item.requiredRoles.some((role) => roles.includes(role));
}

export function visiblePrimaryNavigation(session: AuthSession | null): NavigationItem[] {
  return primaryNavigation.filter((item) => canSeeNavigationItem(session, item));
}
