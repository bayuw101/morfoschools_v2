"use client";

import * as React from "react";
import type { FocusEventHandler, ReactNode } from "react";
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react";

import { FieldShell } from "@/components/ui/field-shell";
import { addMonths, buildCalendarDays, getMonthLabel, parseDateKey } from "@/components/ui/date-time-picker-domain";
import { cn } from "@/lib/cn";

const dayLabels = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export interface DatePickerProps {
  label: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  name?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  className?: string;
  popoverAlign?: "start" | "end";
  startAdornment?: ReactNode;
  onFocus?: FocusEventHandler<HTMLButtonElement>;
  onBlur?: FocusEventHandler<HTMLButtonElement>;
}

function dateOnly(value?: string) {
  if (!value) return "";
  return value.includes("T") ? value.slice(0, 10) : value;
}

function formatDisplayDate(value: string) {
  if (!value) return "";
  const parsed = parseDateKey(value);
  if (!parsed) return value;
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(parsed);
}

export function DatePicker({
  label,
  value,
  defaultValue,
  onChange,
  name,
  id,
  required,
  disabled,
  error,
  helperText,
  className,
  popoverAlign = "start",
  startAdornment,
  onFocus,
  onBlur,
}: DatePickerProps) {
  const normalizedDefault = dateOnly(defaultValue);
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = React.useState(normalizedDefault);
  const [open, setOpen] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement | null>(null);

  const currentValue = dateOnly(isControlled ? String(value ?? "") : internalValue);
  const selectedDate = parseDateKey(currentValue) ?? new Date();
  const [visibleMonth, setVisibleMonth] = React.useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  const hasValue = currentValue.length > 0;
  const displayValue = hasValue ? formatDisplayDate(currentValue) : open ? "Pilih tanggal" : "";

  React.useEffect(() => {
    const parsed = parseDateKey(currentValue);
    if (parsed) setVisibleMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
  }, [currentValue]);

  React.useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setFocused(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setFocused(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function update(nextValue: string) {
    const normalized = dateOnly(nextValue);
    if (!isControlled) setInternalValue(normalized);
    onChange?.(normalized);
  }

  const calendarDays = buildCalendarDays(visibleMonth, currentValue);

  return (
    <div ref={rootRef} className={cn("w-full", className)}>
      {name ? <input type="hidden" name={name} value={currentValue} required={required} /> : null}

      <FieldShell
        label={label}
        active={open || focused}
        filled={open || focused || hasValue}
        disabled={disabled}
        error={error}
        helperText={helperText}
        leading={startAdornment ?? <CalendarDays className="h-4 w-4" />}
        suffix={<ChevronDown className={cn("h-4 w-4 transition-transform duration-200", open && "rotate-180")} />}
      >
        <button
          id={id}
          ref={buttonRef}
          type="button"
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => {
            setOpen((previousValue) => {
              const nextOpen = !previousValue;
              setFocused(nextOpen);
              return nextOpen;
            });
          }}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            if (!open) setFocused(false);
            onBlur?.(event);
          }}
          className="h-[58px] w-full bg-transparent px-[1.125rem] pb-2.5 pl-[3.75rem] pr-16 pt-7 text-left text-sm font-semibold text-[color:var(--foreground)] outline-none"
        >
          <span className={cn("block truncate", !hasValue && "text-[color:var(--muted-foreground)]")}>{displayValue}</span>
        </button>

        {open ? (
          <div role="dialog" aria-label={`${label} calendar`} className={cn("absolute top-full z-50 mt-1.5 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-[24px] border border-[color:var(--border-strong)] bg-[color:var(--surface)] p-2.5 shadow-[0_22px_46px_rgba(9,17,28,0.16)]", popoverAlign === "end" ? "right-0" : "left-0")}>
            <div className="rounded-[18px] border border-[color:var(--border)] bg-[color:var(--surface-subtle)] p-2.5">
              <div className="mb-2 flex items-center justify-between gap-2">
                <button type="button" aria-label="Bulan sebelumnya" onClick={() => setVisibleMonth((month) => addMonths(month, -1))} className="flex h-8 w-8 items-center justify-center rounded-[12px] border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--muted-foreground)] transition-colors hover:border-[color:var(--brand)] hover:text-[color:var(--brand-strong)]">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="text-center">
                  <p className="font-display text-sm font-bold text-[color:var(--foreground)]">{getMonthLabel(visibleMonth)}</p>
                  <p className="text-[11px] text-[color:var(--muted-foreground)]">Calendar custom</p>
                </div>
                <button type="button" aria-label="Bulan berikutnya" onClick={() => setVisibleMonth((month) => addMonths(month, 1))} className="flex h-8 w-8 items-center justify-center rounded-[12px] border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--muted-foreground)] transition-colors hover:border-[color:var(--brand)] hover:text-[color:var(--brand-strong)]">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1">
                {dayLabels.map((day) => <div key={day} className="py-0.5 text-center text-[10px] font-bold uppercase tracking-[0.06em] text-[color:var(--muted-foreground)]">{day}</div>)}
                {calendarDays.map((day) => (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => update(day.date)}
                    className={cn(
                      "relative flex h-8 items-center justify-center rounded-[11px] text-xs font-bold transition-all",
                      day.inCurrentMonth ? "text-[color:var(--foreground)]" : "text-[color:var(--muted-foreground)]/45",
                      day.isSelected ? "bg-[color:var(--foreground)] text-[color:var(--surface)] shadow-sm" : "hover:bg-[color:var(--surface)] hover:text-[color:var(--brand-strong)]",
                      day.isToday && !day.isSelected && "ring-1 ring-[color:var(--brand)]",
                    )}
                  >
                    {day.day}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-2.5 flex items-center justify-between gap-2 rounded-[16px] bg-[color:var(--surface-subtle)] px-2.5 py-2 text-[11px] text-[color:var(--muted-foreground)]">
              <span className="truncate">{currentValue ? formatDisplayDate(currentValue) : "Pilih tanggal dari kalender custom."}</span>
              <div className="flex shrink-0 items-center gap-1.5">
                {currentValue ? (
                  <button type="button" aria-label="Clear date" className="flex h-8 w-8 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--muted-foreground)]" onClick={() => update("")}> <X className="h-3.5 w-3.5" /> </button>
                ) : null}
                <button type="button" className="flex h-8 items-center gap-1.5 rounded-xl bg-[color:var(--foreground)] px-3 text-xs font-bold text-[color:var(--surface)]" onClick={() => { setOpen(false); setFocused(false); buttonRef.current?.focus(); }}>
                  <Check className="h-3.5 w-3.5" /> Selesai
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </FieldShell>
    </div>
  );
}
