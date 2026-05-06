import type { LucideIcon } from "lucide-react";
import { Panel } from "@/components/ui/panel";

type MetricCardProps = {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
};

export function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
}: MetricCardProps) {
  return (
    <Panel className="h-full overflow-hidden p-0">
      <div className="flex h-full min-h-[150px] items-stretch bg-[color:var(--brand-soft)]">
        <div className="flex w-[clamp(74px,28%,112px)] shrink-0 items-center justify-center border-l border-[color:var(--border)] text-[color:var(--brand-strong)] shadow-[inset_1px_0_0_rgba(255,255,255,0.04)]">
          <Icon className="h-7 w-7" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-5 p-5 bg-[color:var(--surface)] rounded-l-2xl shadow">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
            {label}
          </p>
          <div className="space-y-1.5">
            <p className="font-display text-[2rem] font-semibold leading-none tracking-tight text-[color:var(--foreground)]">
              {value}
            </p>
            <p className="text-sm leading-6 text-[color:var(--muted-foreground)]">
              {detail}
            </p>
          </div>
        </div>
      </div>
    </Panel>
  );
}
