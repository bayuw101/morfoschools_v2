"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

type FormDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  contentClassName?: string;
};

export function FormDrawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
  contentClassName,
}: FormDrawerProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  if (!mounted || !open) return null;

  const portalRoot =
    document.querySelector("[data-app-shell-modal-root]") ?? document.body;

  return createPortal(
    <div className="shadow rounded-[30px] border-l-[1px] border-gray-100 pointer-events-none absolute inset-y-0 right-0 z-[80] flex w-full justify-end overflow-hidden sm:w-[min(560px,calc(100%-1rem))]">
      <div
        role="dialog"
        aria-modal="false"
        aria-labelledby="form-drawer-title"
        className={cn(
          "shadow-sm pointer-events-auto relative z-[1] flex h-full w-full max-w-[560px] flex-col border-[color:var(--border-strong)] bg-[color:var(--surface)] md:rounded-l-[30px]",
          className,
        )}
      >
        <div className="shrink-0 border-b border-[color:var(--border)] px-6 py-5 pr-20">
          <h2
            id="form-drawer-title"
            className="font-display text-2xl font-semibold tracking-tight text-[color:var(--foreground)]"
          >
            {title}
          </h2>
          {description ? (
            <p className="mt-2 text-sm leading-6 text-[color:var(--muted-foreground)]">
              {description}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--muted-foreground)] transition-colors hover:border-[color:var(--border-strong)] hover:text-[color:var(--foreground)]"
        >
          <X className="h-4 w-4" />
        </button>

        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto px-6 py-5",
            contentClassName,
          )}
        >
          {children}
        </div>

        {footer ? (
          <div className="shrink-0 border-t border-[color:var(--border)] px-6 py-4">
            <div className="flex items-center justify-end gap-2">{footer}</div>
          </div>
        ) : null}
      </div>
    </div>,
    portalRoot,
  );
}
