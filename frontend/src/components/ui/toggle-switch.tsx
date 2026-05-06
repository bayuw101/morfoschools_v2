"use client";

import * as React from "react";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/cn";

type ToggleSwitchProps = {
  label?: string;
  description?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
};

export function ToggleSwitch({
  label,
  description,
  checked,
  defaultChecked = false,
  disabled = false,
  onCheckedChange,
  className,
}: ToggleSwitchProps) {
  const [internalChecked, setInternalChecked] = React.useState(defaultChecked);
  const isControlled = checked !== undefined;
  const isChecked = isControlled ? checked : internalChecked;

  function updateChecked(nextChecked: boolean) {
    if (disabled) return;
    if (!isControlled) setInternalChecked(nextChecked);
    onCheckedChange?.(nextChecked);
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isChecked}
      disabled={disabled}
      onClick={() => updateChecked(!isChecked)}
      className={cn(
        "group inline-flex min-h-12 items-center gap-3 rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-subtle)] p-1.5 pr-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-200 hover:border-[color:var(--border-strong)] hover:bg-[color:var(--surface)] disabled:cursor-not-allowed disabled:opacity-60",
        isChecked && "border-[color:var(--brand)] bg-[color:var(--brand-soft)]",
        className,
      )}
    >
      <span
        className={cn(
          "relative h-8 w-[58px] shrink-0 rounded-full border border-[color:var(--border)] bg-[color:color-mix(in_srgb,var(--shell)_84%,white_8%)] p-[2.5px] shadow-inner transition-colors duration-200",
          isChecked &&
            "border-[color:var(--brand)] bg-[color:var(--brand)] shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_12px_28px_color-mix(in_srgb,var(--brand)_22%,transparent)]",
        )}
      >
        <span
          className={cn(
            "flex h-6 w-6 translate-x-0 items-center justify-center rounded-full bg-white text-[color:var(--muted-foreground)] shadow-[0_8px_18px_rgba(0,0,0,0.2)] transition-transform duration-200 ease-out",
            isChecked && "translate-x-[26px] text-[color:var(--brand)]",
          )}
        >
          {isChecked ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Minus className="h-3.5 w-3.5" />
          )}
        </span>
      </span>
      {label || description ? (
        <span className="min-w-0 flex-1">
          {label ? (
            <span className="block text-sm font-bold text-[color:var(--foreground)]">
              {label}
            </span>
          ) : null}
          {description ? (
            <span className="mt-0.5 block text-xs leading-5 text-[color:var(--muted-foreground)]">
              {description}
            </span>
          ) : null}
        </span>
      ) : null}
    </button>
  );
}
