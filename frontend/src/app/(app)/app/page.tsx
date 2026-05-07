"use client";

import { MetricCard } from "@/components/ui/metric-card";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, BookOpen, Clock, CheckCircle, ArrowRight, ShieldCheck } from "lucide-react";
import {
  calculateDashboardMetrics,
  getDashboardExperience,
  orderOperationalAlerts,
  type DashboardActivity,
  type DashboardAlert,
  type DashboardRole,
} from "./dashboard-domain";
import { useAuthSession } from "@/lib/use-auth-session";

const dashboardActivities: DashboardActivity[] = [
  { id: "students-active", type: "student", count: 1240, active: true, minutesSpent: 0, passed: false },
  { id: "courses-active", type: "course", count: 24, active: true, minutesSpent: 0, passed: false },
  { id: "learn-a", type: "learning-session", count: 1, active: true, minutesSpent: 5400, passed: false },
  { id: "learn-b", type: "learning-session", count: 1, active: true, minutesSpent: 3960, passed: false },
  { id: "exam-pass-a", type: "exam-result", count: 1, active: true, minutesSpent: 0, passed: true },
  { id: "exam-pass-b", type: "exam-result", count: 1, active: true, minutesSpent: 0, passed: true },
  { id: "exam-pass-c", type: "exam-result", count: 1, active: true, minutesSpent: 0, passed: true },
];

const operationalAlerts: DashboardAlert[] = [
  { id: "course-upload", severity: "info", createdAt: "2026-05-03T08:00:00Z", title: "Materi Baru diunggah: Matematika Dasar" },
  { id: "exam-queue", severity: "warning", createdAt: "2026-05-03T09:00:00Z", title: "Exam inbox queue mendekati threshold" },
  { id: "backup", severity: "success", createdAt: "2026-05-03T07:00:00Z", title: "Backup tenant selesai" },
];

export default function DashboardPage() {
  const { session, loading } = useAuthSession();
  const metrics = calculateDashboardMetrics(dashboardActivities);
  const alerts = orderOperationalAlerts(operationalAlerts);
  const role = (session?.role ?? "student") as DashboardRole;
  const experience = getDashboardExperience(role);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="h-32 animate-pulse rounded-[30px] bg-[color:var(--surface-subtle)]" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-36 animate-pulse rounded-[24px] bg-[color:var(--surface-subtle)]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Panel className="overflow-hidden p-0">
        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_320px] lg:p-8">
          <div>
            <Badge className="mb-4">{experience.eyebrow}</Badge>
            <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">{experience.headline}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--muted-foreground)]">{experience.description}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              {experience.quickActions.map((action) => (
                <Button key={action.id} variant={action.id === "tenant-console" ? "primary" : "secondary"} size="sm">
                  {action.label}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ))}
            </div>
          </div>
          <div className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--surface-subtle)] p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--brand-soft)] text-[color:var(--brand-strong)]">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-[color:var(--foreground)]">{experience.focusTitle}</p>
                <p className="text-xs text-[color:var(--muted-foreground)]">Role: {role}</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-[color:var(--muted-foreground)]">{experience.focusDescription}</p>
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard label={experience.primaryMetricLabel} value={experience.primaryMetricValue} detail={session?.tenantName ?? "Current tenant"} icon={Users} />
        <MetricCard label={experience.secondaryMetricLabel} value={experience.secondaryMetricValue} detail="Role scoped" icon={BookOpen} />
        <MetricCard label="Jam Belajar" value={String(metrics.learningHours)} detail="Minggu ini" icon={Clock} />
        <MetricCard label="Kelulusan" value={`${metrics.passRate}%`} detail="Target tercapai" icon={CheckCircle} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel className="p-6 lg:col-span-2">
          <h3 className="mb-4 font-display text-lg font-bold">Aktivitas Terbaru</h3>
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div key={alert.id} className="flex items-center gap-4 border-b border-[color:var(--border)] py-3 last:border-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--brand-soft)]">
                  <BookOpen className="h-5 w-5 text-[color:var(--brand-strong)]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{alert.title}</p>
                  <p className="text-xs text-[color:var(--muted-foreground)]">{alert.severity}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-6">
          <h3 className="mb-4 font-display text-lg font-bold">Statistik Singkat</h3>
          <div className="flex h-48 items-center justify-center rounded-[22px] border border-dashed border-[color:var(--border)] bg-[color:var(--surface-subtle)]">
            <p className="text-center text-sm text-[color:var(--muted-foreground)]">Dashboard ini sekarang role-aware, bukan statis untuk semua user.</p>
          </div>
        </Panel>
      </div>
    </div>
  );
}
