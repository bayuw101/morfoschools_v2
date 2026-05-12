"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { visiblePrimaryNavigation } from "@/config/navigation";
import { cn } from "@/lib/cn";
import { useAuthSession } from "@/lib/use-auth-session";

export function MobileNav() {
  const pathname = usePathname();
  const { session, loading } = useAuthSession();
  const [pendingRoute, setPendingRoute] = React.useState<string | null>(null);

  React.useEffect(() => setPendingRoute(null), [pathname]);

  const visibleNavigation = loading ? [] : visiblePrimaryNavigation(session).slice(0, 5);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between bg-[color:var(--shell)] px-2 py-2 shadow-[0_-18px_40px_rgba(5,10,20,0.22)] backdrop-blur-xl md:hidden">
      {visibleNavigation.map((item) => {
        const Icon = item.icon;
        const isActive = item.href === "/app" ? pathname === item.href : pathname.startsWith(item.href);
        const isPending = pendingRoute === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => !isActive && setPendingRoute(item.href)}
            className={cn(
              "group relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[11px] px-2 py-2.5 text-[11px] font-semibold transition-colors duration-200",
              isActive
                ? "bg-white/10 text-[#f5f7fb] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                : "text-[#9caeca] hover:bg-white/6 hover:text-[#f0f4fb]",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin text-[#f5f7fb]" />
            ) : (
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors duration-200",
                  isActive
                    ? "text-[#f5f7fb] stroke-[2.25]"
                    : "text-[#9caeca] stroke-[2.15] group-hover:text-[#f0f4fb]",
                )}
              />
            )}
            <span className="max-w-full truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
