import { GraduationCap, LayoutDashboard } from "lucide-react";
import { appRoutes } from "@/config/routes";

export const primaryNavigation = [
  { label: "Dashboard", href: appRoutes.appHome, icon: LayoutDashboard },
  { label: "Gallery", href: appRoutes.gallery, icon: GraduationCap },
] as const;
