"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Archive, BookOpenText, CheckCircle2, GraduationCap, Hash, Pencil, Plus, School2, UserRound } from "lucide-react";

import { ActionMenu } from "@/components/ui/action-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DirectoryToolbar, type DirectoryFilterOption, type DirectoryMetric } from "@/components/ui/directory-toolbar";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Panel } from "@/components/ui/panel";
import { SelectField } from "@/components/ui/select-field";
import { Skeleton } from "@/components/ui/skeleton";
import { TextField } from "@/components/ui/text-field";
import { Toast, type ToastItem } from "@/components/ui/toast";
import type { AcademicYearRow, ClassSectionMutationInput, ClassSectionRow, ClassSectionStatus } from "@/lib/academic-api";
import { cn } from "@/lib/cn";

type FilterValue = "all" | ClassSectionStatus;
type DrawerMode = "create" | "edit" | null;

type Props = {
  classSections: ClassSectionRow[];
  academicYears: AcademicYearRow[];
  isLoading: boolean;
  error: unknown;
  isSaving: boolean;
  isArchivingSectionId: string | null;
  drawerMode: DrawerMode;
  selectedSection: ClassSectionRow | null;
  pendingArchiveSection: ClassSectionRow | null;
  mutationError: string | null;
  mutationFieldErrors: Record<string, string>;
  toasts: ToastItem[];
  onDismissToast: (id: string) => void;
  onCreateSection: () => void;
  onEditSection: (section: ClassSectionRow) => void;
  onArchiveSection: (section: ClassSectionRow) => void;
  onCloseDrawer: () => void;
  onCloseArchive: () => void;
  onSubmitSection: (input: ClassSectionMutationInput) => void;
  onConfirmArchive: () => void;
};

const filters: DirectoryFilterOption<FilterValue>[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "archived", label: "Archived" },
];

const statusLabels: Record<ClassSectionStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  archived: "Archived",
};

function statusVariant(status: ClassSectionStatus): "default" | "success" | "warning" | "danger" {
  if (status === "active") return "success";
  if (status === "inactive") return "warning";
  return "danger";
}

function hasErrorMessage(error: unknown): error is Error {
  return typeof error === "object" && error !== null && "message" in error;
}

function getFieldError(errors: Record<string, string>, ...keys: string[]) {
  return keys.map((key) => errors[key]).find(Boolean);
}

export function ClassSectionsPageContent({
  classSections,
  academicYears,
  isLoading,
  error,
  isSaving,
  isArchivingSectionId,
  drawerMode,
  selectedSection,
  pendingArchiveSection,
  mutationError,
  mutationFieldErrors,
  toasts,
  onDismissToast,
  onCreateSection,
  onEditSection,
  onArchiveSection,
  onCloseDrawer,
  onCloseArchive,
  onSubmitSection,
  onConfirmArchive,
}: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterValue>("all");

  const metrics = useMemo<DirectoryMetric[]>(() => [
    { label: "sections", value: classSections.length, icon: School2 },
    { label: "active", value: classSections.filter((section) => section.status === "active").length },
    { label: "grades", value: new Set(classSections.map((section) => section.gradeLevel)).size },
    { label: "homerooms", value: classSections.filter((section) => section.homeroomTeacher).length },
  ], [classSections]);

  const filteredSections = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return classSections.filter((section) => {
      const matchesFilter = filter === "all" || section.status === filter;
      const haystack = [
        section.code,
        section.name,
        section.gradeLevel,
        section.status,
        section.academicYear?.code,
        section.academicYear?.name,
        section.homeroomTeacher?.name,
      ].join(" ").toLowerCase();
      return matchesFilter && (!normalizedQuery || haystack.includes(normalizedQuery));
    });
  }, [classSections, filter, query]);

  const hasFilters = Boolean(query.trim()) || filter !== "all";
  const resetFilters = () => { setQuery(""); setFilter("all"); };

  return (
    <div className="space-y-4 pb-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2"><Badge>Academic admin</Badge><span className="text-xs text-[color:var(--muted-foreground)]">Rombel foundation</span></div>
          <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">Class Sections</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[color:var(--muted-foreground)]">Kelola rombongan belajar per tahun akademik sebagai fondasi enrollment, teaching assignment, course offering, dan jadwal ujian.</p>
        </div>
        <div className="flex items-center gap-2"><Button variant="primary" onClick={onCreateSection} loading={isSaving && drawerMode === "create"}><Plus className="h-4 w-4" />New class section</Button></div>
      </header>

      <Panel className="-mx-4 overflow-hidden rounded-none border-x-0 p-0 sm:mx-0 sm:rounded-[24px] sm:border-x" aria-label="Class sections directory">
        <DirectoryToolbar metrics={metrics} query={query} onQueryChange={setQuery} searchLabel="Search class sections" searchPlaceholder="Search class, grade, teacher, or year..." filters={filters} selectedFilter={filter} onFilterChange={setFilter} hasFilters={hasFilters} onReset={resetFilters} />
        {error ? <ErrorState message={hasErrorMessage(error) ? error.message : undefined} /> : null}
        {isLoading ? <LoadingState /> : classSections.length === 0 ? <EmptyState onCreateSection={onCreateSection} /> : filteredSections.length === 0 ? <NoResultsState onReset={resetFilters} /> : <><DesktopTable sections={filteredSections} isArchivingSectionId={isArchivingSectionId} onEditSection={onEditSection} onArchiveSection={onArchiveSection} /><MobileCards sections={filteredSections} isArchivingSectionId={isArchivingSectionId} onEditSection={onEditSection} onArchiveSection={onArchiveSection} /></>}
      </Panel>

      <ClassSectionDrawer mode={drawerMode} selectedSection={selectedSection} academicYears={academicYears} isSaving={isSaving} mutationError={mutationError} mutationFieldErrors={mutationFieldErrors} onClose={onCloseDrawer} onSubmit={onSubmitSection} />

      <ConfirmDialog open={Boolean(pendingArchiveSection)} onOpenChange={(open) => { if (!open) onCloseArchive(); }} title="Archive class section?" description="Class section akan disembunyikan dari setup aktif, tanpa menghapus histori akademik." confirmLabel={isArchivingSectionId ? "Archiving..." : "Archive section"} cancelLabel="Cancel" tone="warning" onConfirm={onConfirmArchive} details={pendingArchiveSection ? <span><strong>{pendingArchiveSection.name}</strong> ({pendingArchiveSection.code}) untuk {pendingArchiveSection.academicYear?.name ?? "tahun akademik terkait"} akan diarsipkan. Pastikan enrollment aktif sudah dipindahkan bila perlu.</span> : undefined} />

      <div className="fixed right-4 top-4 z-[80] flex w-[min(420px,calc(100vw-2rem))] flex-col gap-3">{toasts.map((toast) => <Toast key={toast.id} toast={toast} onDismiss={onDismissToast} />)}</div>
    </div>
  );
}

function DesktopTable({ sections, isArchivingSectionId, onEditSection, onArchiveSection }: { sections: ClassSectionRow[]; isArchivingSectionId: string | null; onEditSection: (section: ClassSectionRow) => void; onArchiveSection: (section: ClassSectionRow) => void }) {
  return <div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[920px] border-collapse text-left text-sm"><thead><tr className="border-b border-[color:var(--border)] bg-[color:var(--surface-subtle)] text-xs uppercase tracking-[0.14em] text-[color:var(--muted-foreground)]"><th className="px-5 py-3 font-bold">Class section</th><th className="px-5 py-3 font-bold">Academic year</th><th className="px-5 py-3 font-bold">Grade</th><th className="px-5 py-3 font-bold">Homeroom</th><th className="px-5 py-3 font-bold">Status</th><th className="px-5 py-3 text-right font-bold">Actions</th></tr></thead><tbody className="divide-y divide-[color:var(--border)]">{sections.map((section) => <SectionRow key={section.id} section={section} isArchiving={isArchivingSectionId === section.id} onEdit={() => onEditSection(section)} onArchive={() => onArchiveSection(section)} />)}</tbody></table></div>;
}

function SectionRow({ section, isArchiving, onEdit, onArchive }: { section: ClassSectionRow; isArchiving: boolean; onEdit: () => void; onArchive: () => void }) {
  return <tr className="align-middle transition-colors hover:bg-[color:var(--surface-subtle)]/70"><td className="px-5 py-3"><div><p className="font-display text-base font-bold text-[color:var(--foreground)]">{section.name}</p><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--muted-foreground)]">{section.code}</p></div></td><td className="px-5 py-3 text-sm font-medium text-[color:var(--muted-foreground)]"><BookOpenText className="mr-1.5 inline h-4 w-4" />{section.academicYear?.name ?? "—"}</td><td className="px-5 py-3"><span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-1 text-xs font-bold">Grade {section.gradeLevel}</span></td><td className="px-5 py-3 text-sm font-medium text-[color:var(--muted-foreground)]">{section.homeroomTeacher?.name ?? "Belum ditentukan"}</td><td className="px-5 py-3"><Badge variant={statusVariant(section.status)}>{statusLabels[section.status]}</Badge></td><td className="px-5 py-3 text-right"><ActionMenu items={[{ label: "Edit class section", icon: Pencil, disabled: section.status === "archived", onSelect: onEdit }, { label: "Archive section", icon: Archive, tone: "danger", loading: isArchiving, disabled: section.status === "archived", onSelect: onArchive }]} /></td></tr>;
}

function MobileCards({ sections, isArchivingSectionId, onEditSection, onArchiveSection }: { sections: ClassSectionRow[]; isArchivingSectionId: string | null; onEditSection: (section: ClassSectionRow) => void; onArchiveSection: (section: ClassSectionRow) => void }) {
  return <div className="divide-y divide-[color:var(--border)] lg:hidden">{sections.map((section) => <div key={section.id} className="space-y-3 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-display text-base font-bold">{section.name}</p><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--muted-foreground)]">{section.code} · Grade {section.gradeLevel}</p></div><ActionMenu items={[{ label: "Edit class section", icon: Pencil, disabled: section.status === "archived", onSelect: () => onEditSection(section) }, { label: "Archive section", icon: Archive, tone: "danger", loading: isArchivingSectionId === section.id, disabled: section.status === "archived", onSelect: () => onArchiveSection(section) }]} /></div><div className="grid gap-2 text-sm text-[color:var(--muted-foreground)]"><span><BookOpenText className="mr-1.5 inline h-4 w-4" />{section.academicYear?.name ?? "—"}</span><span><UserRound className="mr-1.5 inline h-4 w-4" />{section.homeroomTeacher?.name ?? "Belum ditentukan"}</span></div><Badge variant={statusVariant(section.status)}>{statusLabels[section.status]}</Badge></div>)}</div>;
}

function LoadingState() {
  return (
    <div aria-label="Loading class sections">
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[920px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[color:var(--border)] bg-[color:var(--surface-subtle)] text-xs uppercase tracking-[0.14em] text-[color:var(--muted-foreground)]">
              <th className="px-5 py-3 font-bold">Class section</th>
              <th className="px-5 py-3 font-bold">Academic year</th>
              <th className="px-5 py-3 font-bold">Grade</th>
              <th className="px-5 py-3 font-bold">Homeroom</th>
              <th className="px-5 py-3 font-bold">Status</th>
              <th className="px-5 py-3 text-right font-bold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--border)]">
            {Array.from({ length: 5 }).map((_, index) => (
              <tr key={index} className="align-middle">
                <td className="px-5 py-3"><div className="space-y-2"><Skeleton className="h-5 w-36" /><Skeleton className="h-3.5 w-28" /></div></td>
                <td className="px-5 py-3"><Skeleton className="h-4 w-40" /></td>
                <td className="px-5 py-3"><Skeleton className="h-7 w-20 rounded-full" /></td>
                <td className="px-5 py-3"><Skeleton className="h-4 w-36" /></td>
                <td className="px-5 py-3"><Skeleton className="h-6 w-20 rounded-full" /></td>
                <td className="px-5 py-3"><div className="flex justify-end"><Skeleton className="h-9 w-9 rounded-xl" /></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="divide-y divide-[color:var(--border)] lg:hidden">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-3.5 w-44 max-w-full" />
              </div>
              <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
            </div>
            <div className="grid gap-2">
              <Skeleton className="h-4 w-48 max-w-full" />
              <Skeleton className="h-4 w-44 max-w-full" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ onCreateSection }: { onCreateSection: () => void }) {
  return <div className="flex min-h-[320px] flex-col items-center justify-center px-6 py-12 text-center"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--brand-soft)] text-[color:var(--brand-strong)]"><School2 className="h-6 w-6" /></div><h2 className="mt-5 font-display text-xl font-bold">Belum ada class section</h2><p className="mt-2 max-w-md text-sm leading-6 text-[color:var(--muted-foreground)]">Mulai dari rombel pertama agar enrollment dan teaching assignment punya fondasi yang benar.</p><Button className="mt-5" variant="primary" onClick={onCreateSection}><Plus className="h-4 w-4" />Create class section</Button></div>;
}

function NoResultsState({ onReset }: { onReset: () => void }) {
  return <div className="flex min-h-[260px] flex-col items-center justify-center px-6 py-12 text-center"><GraduationCap className="h-10 w-10 text-[color:var(--muted-foreground)]" /><h2 className="mt-4 font-display text-lg font-bold">Tidak ada hasil</h2><p className="mt-2 text-sm text-[color:var(--muted-foreground)]">Coba ubah keyword atau filter status.</p><Button className="mt-5" variant="secondary" onClick={onReset}>Reset filters</Button></div>;
}

function ErrorState({ message }: { message?: string }) {
  return <div className="m-4 flex items-start gap-3 rounded-[20px] border border-[color:var(--danger)]/30 bg-[color:var(--danger-soft)] p-4 text-sm text-[color:var(--danger)]"><AlertCircle className="mt-0.5 h-4 w-4" /><div><p className="font-bold">Gagal memuat class sections</p><p className="mt-1 text-[color:var(--danger)]/80">{message ?? "Cek koneksi backend lalu coba lagi."}</p></div></div>;
}

function ClassSectionDrawer({ mode, selectedSection, academicYears, isSaving, mutationError, mutationFieldErrors, onClose, onSubmit }: { mode: DrawerMode; selectedSection: ClassSectionRow | null; academicYears: AcademicYearRow[]; isSaving: boolean; mutationError: string | null; mutationFieldErrors: Record<string, string>; onClose: () => void; onSubmit: (input: ClassSectionMutationInput) => void }) {
  const [form, setForm] = useState<ClassSectionMutationInput>({ academicYearId: "", code: "", name: "", gradeLevel: "", homeroomTeacherId: "", status: "active" });

  useEffect(() => {
    if (!mode) return;
    setForm({
      academicYearId: selectedSection?.academicYearId ?? academicYears.find((year) => year.status === "active")?.id ?? academicYears[0]?.id ?? "",
      code: selectedSection?.code ?? "",
      name: selectedSection?.name ?? "",
      gradeLevel: selectedSection?.gradeLevel ?? "",
      homeroomTeacherId: selectedSection?.homeroomTeacherId ?? "",
      status: selectedSection?.status === "archived" ? "inactive" : selectedSection?.status ?? "active",
    });
  }, [academicYears, mode, selectedSection]);

  const title = mode === "edit" ? "Edit class section" : "New class section";
  const description = mode === "edit" ? "Sesuaikan identitas rombel tanpa memutus histori akademik." : "Buat rombel tenant-scoped untuk tahun akademik aktif.";
  const academicYearOptions = academicYears.map((year) => ({ value: year.id, label: `${year.name} (${year.code})`, disabled: year.status === "archived" }));

  return <FormDrawer open={Boolean(mode)} onOpenChange={(open) => { if (!open) onClose(); }} title={title} description={description} footer={<><Button variant="secondary" onClick={onClose} disabled={isSaving}>Cancel</Button><Button variant="primary" loading={isSaving} onClick={() => onSubmit({ ...form, homeroomTeacherId: form.homeroomTeacherId?.trim() || undefined })}>{mode === "edit" ? "Save changes" : "Create section"}</Button></>}><div className="space-y-4">{mutationError && Object.keys(mutationFieldErrors).length === 0 ? <div className="rounded-[18px] border border-[color:var(--danger)]/30 bg-[color:var(--danger-soft)] p-3 text-sm font-semibold text-[color:var(--danger)]">{mutationError}</div> : null}<SelectField label="Academic year" value={form.academicYearId} options={academicYearOptions} onChange={(event) => setForm((current) => ({ ...current, academicYearId: event.target.value }))} startAdornment={<BookOpenText className="h-4 w-4" />} error={getFieldError(mutationFieldErrors, "academicYearId", "academic_year_id")} /><div className="grid gap-4 sm:grid-cols-2"><TextField label="Class code" value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} prefix={<Hash className="h-4 w-4" />} error={getFieldError(mutationFieldErrors, "code")} /><TextField label="Grade level" value={form.gradeLevel} onChange={(event) => setForm((current) => ({ ...current, gradeLevel: event.target.value }))} prefix={<GraduationCap className="h-4 w-4" />} error={getFieldError(mutationFieldErrors, "gradeLevel", "grade_level")} /></div><TextField label="Class name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} prefix={<School2 className="h-4 w-4" />} error={getFieldError(mutationFieldErrors, "name")} /><TextField label="Homeroom teacher ID" value={form.homeroomTeacherId ?? ""} onChange={(event) => setForm((current) => ({ ...current, homeroomTeacherId: event.target.value }))} prefix={<UserRound className="h-4 w-4" />} helperText="Opsional sampai teacher directory terhubung." error={getFieldError(mutationFieldErrors, "homeroomTeacherId", "homeroom_teacher_id")} /><SelectField label="Status" value={form.status ?? "active"} options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as ClassSectionStatus }))} startAdornment={<CheckCircle2 className="h-4 w-4" />} error={getFieldError(mutationFieldErrors, "status")} /><div className={cn("rounded-[18px] border border-[color:var(--border)] bg-[color:var(--surface-subtle)] p-4 text-xs leading-5 text-[color:var(--muted-foreground)]", academicYears.length === 0 && "border-[color:var(--warning)]/40 bg-[color:var(--warning-soft)] text-[color:var(--warning)]")}>{academicYears.length === 0 ? "Buat Academic Setup terlebih dahulu sebelum class section bisa disimpan." : "Class section terikat tahun akademik agar enrollment dan course offering tidak bocor lintas periode."}</div></div></FormDrawer>;
}
