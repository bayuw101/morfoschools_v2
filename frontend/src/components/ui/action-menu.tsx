"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import { createPortal } from "react-dom";
import { MoreVertical } from "lucide-react";

export type ActionMenuItem = {
  label: string;
  onSelect: () => void;
  icon?: ComponentType<{ className?: string }>;
  tone?: "default" | "danger";
  loading?: boolean;
  disabled?: boolean;
};

type MenuPosition = {
  left: number;
  top: number;
};

const menuWidth = 192;
const menuGap = 8;
const menuPadding = 8;
const menuItemHeight = 40;
const menuChromeHeight = 12;

function getMenuPosition(trigger: HTMLButtonElement, itemCount: number, align: "start" | "end"): MenuPosition {
  const rect = trigger.getBoundingClientRect();
  const menuHeight = itemCount * menuItemHeight + menuChromeHeight;
  const preferredLeft = align === "end" ? rect.right - menuWidth : rect.left;
  const left = Math.max(menuPadding, Math.min(preferredLeft, window.innerWidth - menuWidth - menuPadding));
  const belowTop = rect.bottom + menuGap;
  const aboveTop = rect.top - menuGap - menuHeight;
  const hasRoomBelow = belowTop + menuHeight <= window.innerHeight - menuPadding;
  const top = hasRoomBelow ? belowTop : Math.max(menuPadding, aboveTop);
  return { left, top };
}

export function ActionMenu({ label = "Open actions", items, align = "end" }: { label?: string; items: ActionMenuItem[]; align?: "start" | "end" }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const placeMenu = () => {
    if (!buttonRef.current) return;
    setPosition(getMenuPosition(buttonRef.current, items.length, align));
  };

  useEffect(() => {
    if (!open) return;
    placeMenu();
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onReposition = () => placeMenu();
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, align, items.length]);

  const menu = open && position ? (
    <div
      ref={menuRef}
      role="menu"
      className="fixed z-[90] w-48 overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-1.5 shadow-[0_18px_45px_rgba(15,23,42,0.14)]"
      style={{ left: position.left, top: position.top }}
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.label}
            type="button"
            role="menuitem"
            disabled={item.disabled || item.loading}
            onClick={() => {
              if (item.disabled || item.loading) return;
              setOpen(false);
              item.onSelect();
            }}
            className={`flex h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${item.tone === "danger" ? "text-[color:var(--danger,var(--foreground))] hover:bg-[color:var(--danger-soft,var(--surface-subtle))]" : "text-[color:var(--foreground)] hover:bg-[color:var(--surface-subtle)]"}`}
          >
            {Icon ? <Icon className="h-4 w-4" /> : null}
            <span className="min-w-0 flex-1 truncate">{item.loading ? `${item.label}...` : item.label}</span>
          </button>
        );
      })}
    </div>
  ) : null;

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          placeMenu();
          setOpen((value) => !value);
        }}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--muted-foreground)] transition hover:bg-[color:var(--surface-subtle)] hover:text-[color:var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-soft)]"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {typeof document === "undefined" ? null : createPortal(menu, document.body)}
    </div>
  );
}
