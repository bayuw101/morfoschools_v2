import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Loader2,
  MoreHorizontal,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] disabled:pointer-events-none disabled:opacity-55",
  {
    variants: {
      variant: {
        primary:
          "bg-[color:var(--brand)] px-3 pl-2 pl-2 py-2.5 text-white shadow-[0_16px_30px_rgba(38,76,131,0.18)] hover:bg-[color:var(--brand-strong)]",
        secondary:
          "border border-[color:var(--border-strong)] bg-[color:var(--surface)] px-3 pl-2 pl-2 py-2.5 text-[color:var(--foreground)] hover:bg-[color:var(--surface-subtle)]",
        danger:
          "bg-[color:var(--danger)] px-3 pl-2 pl-2 py-2.5 text-white shadow-[0_16px_30px_rgba(120,42,42,0.16)] hover:opacity-92",
        ghost:
          "px-2.5 py-2 text-[color:var(--muted-foreground)] hover:bg-[color:var(--surface-subtle)] hover:text-[color:var(--foreground)]",
      },
      size: {
        default: "h-11",
        sm: "h-9 rounded-lg px-2.5 pl-2 text-xs",
        lg: "h-12 rounded-2xl px-4 pl-2 text-sm",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

const defaultIcons: Record<NonNullable<ButtonProps["variant"]>, LucideIcon> = {
  primary: CheckCircle2,
  secondary: Circle,
  danger: AlertTriangle,
  ghost: MoreHorizontal,
};

const iconBoxVariants = {
  primary: "bg-white/16 text-white ring-white/20",
  secondary:
    "bg-[color:var(--brand-soft)] text-[color:var(--brand-strong)] ring-[color:var(--border)]",
  danger: "bg-white/16 text-white ring-white/20",
  ghost:
    "bg-[color:var(--surface)] text-[color:var(--muted-foreground)] ring-[color:var(--border)]",
} as const;

function ButtonIconBox({
  children,
  variant = "primary",
  size = "default",
}: {
  children: React.ReactNode;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
}) {
  return (
    <span
      className={cn(
        "morfoschools-icon-button inline-flex shrink-0 items-center justify-center rounded-lg ring-1 transition-colors",
        size === "lg"
          ? "h-8 w-8 rounded-xl"
          : size === "sm"
            ? "h-6 w-6 rounded-md"
            : "h-7 w-7",
        iconBoxVariants[variant ?? "primary"],
      )}
      aria-hidden="true"
    >
      {children}
    </span>
  );
}

function hasCustomIcon(children: React.ReactNode) {
  return React.Children.toArray(children).some((child) =>
    React.isValidElement(child),
  );
}

function renderChildrenWithIconBoxes(
  children: React.ReactNode,
  variant: ButtonProps["variant"],
  size: ButtonProps["size"],
) {
  return React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) return child;
    return (
      <ButtonIconBox variant={variant} size={size}>
        {child}
      </ButtonIconBox>
    );
  });
}

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  icon?: LucideIcon;
  hideDefaultIcon?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      disabled,
      loading = false,
      variant = "primary",
      size = "default",
      icon: Icon,
      hideDefaultIcon = false,
      ...props
    },
    ref,
  ) => {
    const FallbackIcon = Icon ?? defaultIcons[variant ?? "primary"];
    const shouldShowFallbackIcon =
      !loading && !hideDefaultIcon && !hasCustomIcon(children);

    return (
      <button
        aria-busy={loading || undefined}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        ref={ref}
        {...props}
      >
        {loading ? (
          <ButtonIconBox variant={variant} size={size}>
            <Loader2 className="animate-spin" />
          </ButtonIconBox>
        ) : null}
        {shouldShowFallbackIcon ? (
          <ButtonIconBox variant={variant} size={size}>
            <FallbackIcon />
          </ButtonIconBox>
        ) : null}
        <span className="inline-flex min-w-0 items-center justify-center gap-2">
          {renderChildrenWithIconBoxes(children, variant, size)}
        </span>
      </button>
    );
  },
);

Button.displayName = "Button";

export { Button, buttonVariants };
