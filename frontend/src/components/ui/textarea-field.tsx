"use client";

import * as React from "react";
import type { ReactNode, TextareaHTMLAttributes } from "react";
import { FieldShell } from "@/components/ui/field-shell";
import { cn } from "@/lib/cn";

export interface TextareaFieldProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "prefix"> {
  label: string;
  valid?: boolean;
  error?: string;
  helperText?: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
}

export const TextareaField = React.forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
  (
    {
      className,
      label,
      valid,
      error,
      helperText,
      prefix,
      suffix,
      disabled,
      value,
      defaultValue,
      onChange,
      onFocus,
      onBlur,
      ...props
    },
    ref,
  ) => {
    const [focused, setFocused] = React.useState(false);
    const initialFilled =
      value !== undefined
        ? String(value).length > 0
        : defaultValue !== undefined
          ? String(defaultValue).length > 0
          : false;
    const [hasValue, setHasValue] = React.useState(initialFilled);

    React.useEffect(() => {
      if (value !== undefined) {
        setHasValue(String(value).length > 0);
      }
    }, [value]);

    return (
      <FieldShell
        label={label}
        active={focused}
        filled={focused || hasValue}
        multiline
        disabled={disabled}
        valid={valid}
        error={error}
        helperText={helperText}
        leading={prefix}
        suffix={suffix}
      >
        <textarea
          ref={ref}
          disabled={disabled}
          className={cn(
            "min-h-[118px] w-full resize-none bg-transparent px-[1.125rem] pb-4 pt-6.5 text-sm font-semibold leading-6 text-[color:var(--foreground)] outline-none placeholder:text-transparent",
            prefix && "pl-[3.75rem]",
            (suffix || valid) && "pr-16",
            className,
          )}
          placeholder=" "
          value={value}
          defaultValue={defaultValue}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          onChange={(event) => {
            setHasValue(event.target.value.length > 0);
            onChange?.(event);
          }}
          {...props}
        />
      </FieldShell>
    );
  },
);

TextareaField.displayName = "TextareaField";
