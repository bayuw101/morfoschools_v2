"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { AlertCircle, Archive, BookOpenText, CalendarDays, CheckCircle2, Clock3, Copy, Layers3, Pencil, Plus, Tag } from "lucide-react";

import { ActionMenu } from "@/components/ui/action-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { DirectoryToolbar, type DirectoryFilterOption, type DirectoryMetric } from "@/components/ui/directory-toolbar";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Panel } from "@/components/ui/panel";
import { SelectField } from "@/components/ui/select-field";
import { Skeleton } from "@/components/ui/skeleton";
import { TextField } from "@/components/ui/text-field";
import { Toast, type ToastItem } from "@/components/ui/toast";
import type { AcademicStatus, AcademicYearMutationInput, AcademicYearRow, TermMutationInput, TermRow } from "@/lib/academic-api";
import { cn } from "@/lib/cn";

type FilterValue = "all" | AcademicStatus;
type DrawerMode = "year" | "year-edit" | "term" | "term-edit" | null;

type AcademicSetupPageContentProps = {
  academicYears: AcademicYearRow[];
  isLoading: boolean;
  error: unknown;
  isSaving: boolean;
  isArchivingYearId: string | null;
  isDuplicatingYearId: string | null;
  drawerMode: DrawerMode;
  selectedYear: AcademicYearRow | null;
  selectedTerm: TermRow | null;
  pendingArchiveYear: AcademicYearRow | null;
  mutationError: string | null;
  mutationFieldErrors: Record<string, string>;
  toasts: ToastItem[];
  onDismissToast: (id: string) => void;
  onCreateYear: () => void;
  onEditYear: (year: AcademicYearRow) => void;
  onCreateTerm: (year: AcademicYearRow) => void;
  onEditTerm: (year: AcademicYearRow, term: TermRow) => void;
  onDuplicateYear: (year: AcademicYearRow) => void;
  onArchiveYear: (year: AcademicYearRow) => void;
  onCloseDrawer: () => void;
  onCloseArchive: () => void;
  onSubmitYear: (input: AcademicYearMutationInput) => void;
  onSubmitTerm: (input: TermMutationInput) => void;
  onSubmitTermUpdate: (termId: string, input: Omit<TermMutationInput, "academicYearId">) => void;
  onConfirmArchive: () => void;
};

type YearFormState = AcademicYearMutationInput;
type TermFormState = Omit<TermMutationInput, "academicYearId">;

const statusLabels: Record<AcademicStatus, string> = {
  draft: "Draft",
  active: "Active",
  closed: "Closed",
  archived: "Archived",
};

const filters: DirectoryFilterOption<FilterValue>[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "closed", label: "Closed" },
  { value: "archived", label: "Archived" },
];

function dateOnly(value: string) {
  if (!value) return "";
  return value.includes("T") ? value.slice(0, 10) : value;
}

function formatDate(value: string) {
  const normalized = dateOnly(value);
  if (!normalized) return "—";
  const parsed = new Date(`${normalized}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "—";
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(parsed);
}

function statusVariant(status: AcademicStatus): "default" | "success" | "warning" | "danger" {
  if (status === "active") return "success";
  if (status === "closed") return "warning";
  if (status === "archived") return "danger";
  return "default";
}

function getFieldError(errors: Record<string, string>, ...keys: string[]) {
  return keys.map((key) => errors[key]).find(Boolean);
}

function hasErrorMessage(error: unknown): error is Error {
  return typeof error === "object" && error !== null && "message" in error;
}

export function AcademicSetupPageContent({
  academicYears,
  isLoading,
  error,
  isSaving,
  isArchivingYearId,
  isDuplicatingYearId,
  drawerMode,
  selectedYear,
  selectedTerm,
  pendingArchiveYear,
  mutationError,
  mutationFieldErrors,
  toasts,
  onDismissToast,
  onCreateYear,
  onEditYear,
  onCreateTerm,
  onEditTerm,
  onDuplicateYear,
  onArchiveYear,
  onCloseDrawer,
  onCloseArchive,
  onSubmitYear,
  onSubmitTerm,
  onSubmitTermUpdate,
  onConfirmArchive,
}: AcademicSetupPageContentProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterValue>("all");

  const totalSemesters = academicYears.reduce((sum, year) => sum + year.terms.length, 0);
  const metrics = useMemo<DirectoryMetric[]>(() => [
    { label: "years", value: academicYears.length, icon: CheckCircle2 },
    { label: "active", value: academicYears.filter((year) => year.status === "active").length },
    { label: "draft", value: academicYears.filter((year) => year.status === "draft").length },
    { label: "semester", value: totalSemesters },
  ], [academicYears, totalSemesters]);

  const filteredYears = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return academicYears.filter((year) => {
      const matchesFilter = filter === "all" || year.status === filter;
      const haystack = [year.code, year.name, year.status, ...year.terms.flatMap((term) => [term.code, term.name, term.status])].join(" ").toLowerCase();
      return matchesFilter && (!normalizedQuery || haystack.includes(normalizedQuery));
    });
  }, [academicYears, filter, query]);

  const hasFilters = Boolean(query.trim()) || filter !== "all";
  const resetFilters = () => { setQuery(""); setFilter("all"); };

  return (
    <div className="space-y-4 pb-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2"><Badge>Academic admin</Badge><span className="text-xs text-[color:var(--muted-foreground)]">School calendar foundation</span></div>
          <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">Academic Setup</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[color:var(--muted-foreground)]">Kelola tahun akademik dan semester sebagai fondasi kelas, course offering, enrollment, dan jadwal ujian.</p>
        </div>
        <div className="flex items-center gap-2"><Button variant="primary" onClick={onCreateYear} loading={isSaving && drawerMode === "year"}><Plus className="h-4 w-4" />New academic year</Button></div>
      </header>

      <Panel className="-mx-4 overflow-hidden rounded-none border-x-0 p-0 sm:mx-0 sm:rounded-[24px] sm:border-x" aria-label="Academic calendar directory">
        <DirectoryToolbar
          metrics={metrics}
          query={query}
          onQueryChange={setQuery}
          searchLabel="Search academic years"
          searchPlaceholder="Search year, semester, or status..."
          filters={filters}
          selectedFilter={filter}
          onFilterChange={setFilter}
          hasFilters={hasFilters}
          onReset={resetFilters}
        />
        {error ? <AcademicErrorState message={hasErrorMessage(error) ? error.message : undefined} /> : null}
        {isLoading ? (
          <AcademicListLoadingState />
        ) : academicYears.length === 0 ? (
          <NoAcademicYearsState onCreateYear={onCreateYear} />
        ) : filteredYears.length === 0 ? (
          <NoAcademicResultsState onReset={resetFilters} />
        ) : (
          <>
            <AcademicDesktopTable years={filteredYears} isArchivingYearId={isArchivingYearId} isDuplicatingYearId={isDuplicatingYearId} onEditYear={onEditYear} onCreateTerm={onCreateTerm} onEditTerm={onEditTerm} onDuplicateYear={onDuplicateYear} onArchiveYear={onArchiveYear} />
            <AcademicMobileCards years={filteredYears} isArchivingYearId={isArchivingYearId} isDuplicatingYearId={isDuplicatingYearId} onEditYear={onEditYear} onCreateTerm={onCreateTerm} onEditTerm={onEditTerm} onDuplicateYear={onDuplicateYear} onArchiveYear={onArchiveYear} />
          </>
        )}
      </Panel>

      <AcademicDrawer
        mode={drawerMode}
        selectedYear={selectedYear}
        selectedTerm={selectedTerm}
        isSaving={isSaving}
        mutationError={mutationError}
        mutationFieldErrors={mutationFieldErrors}
        onClose={onCloseDrawer}
        onSubmitYear={onSubmitYear}
        onSubmitTerm={onSubmitTerm}
        onSubmitTermUpdate={onSubmitTermUpdate}
      />

      <ConfirmDialog
        open={Boolean(pendingArchiveYear)}
        onOpenChange={(open) => { if (!open) onCloseArchive(); }}
        title="Archive academic year?"
        description="Tahun akademik dan semua semester di bawahnya akan disembunyikan dari setup aktif."
        confirmLabel={isArchivingYearId ? "Archiving..." : "Archive year"}
        cancelLabel="Cancel"
        tone="warning"
        onConfirm={onConfirmArchive}
        details={pendingArchiveYear ? <span><strong>{pendingArchiveYear.name}</strong> ({pendingArchiveYear.code}) memiliki {pendingArchiveYear.terms.length} semester. Pastikan tidak ada proses akademik aktif yang masih mengandalkan periode ini.</span> : undefined}
      />

      <div className="fixed right-4 top-4 z-[80] flex w-[min(420px,calc(100vw-2rem))] flex-col gap-3">{toasts.map((toast) => <Toast key={toast.id} toast={toast} onDismiss={onDismissToast} />)}</div>
    </div>
  );
}

function AcademicDesktopTable({ years, isArchivingYearId, isDuplicatingYearId, onEditYear, onCreateTerm, onEditTerm, onDuplicateYear, onArchiveYear }: { years: AcademicYearRow[]; isArchivingYearId: string | null; isDuplicatingYearId: string | null; onEditYear: (year: AcademicYearRow) => void; onCreateTerm: (year: AcademicYearRow) => void; onEditTerm: (year: AcademicYearRow, term: TermRow) => void; onDuplicateYear: (year: AcademicYearRow) => void; onArchiveYear: (year: AcademicYearRow) => void }) {
  return (
    <div className="hidden overflow-x-auto lg:block">
      <table className="w-full min-w-[900px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-[color:var(--border)] bg-[color:var(--surface-subtle)] text-xs uppercase tracking-[0.14em] text-[color:var(--muted-foreground)]">
            <th className="px-5 py-3 font-bold">Academic year</th>
            <th className="px-5 py-3 font-bold">Period</th>
            <th className="px-5 py-3 font-bold">Semester</th>
            <th className="px-5 py-3 font-bold">Status</th>
            <th className="px-5 py-3 text-right font-bold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[color:var(--border)]">
          {years.map((year) => <AcademicYearRowItem key={year.id} year={year} isArchiving={isArchivingYearId === year.id} isDuplicating={isDuplicatingYearId === year.id} onEditYear={() => onEditYear(year)} onCreateTerm={() => onCreateTerm(year)} onEditTerm={(term) => onEditTerm(year, term)} onDuplicate={() => onDuplicateYear(year)} onArchive={() => onArchiveYear(year)} />)}
        </tbody>
      </table>
    </div>
  );
}

function AcademicYearRowItem({ year, isArchiving, isDuplicating, onEditYear, onCreateTerm, onEditTerm, onDuplicate, onArchive }: { year: AcademicYearRow; isArchiving: boolean; isDuplicating: boolean; onEditYear: () => void; onCreateTerm: () => void; onEditTerm: (term: TermRow) => void; onDuplicate: () => void; onArchive: () => void }) {
  const activeSemesterCount = year.terms.filter((term) => term.status === "active").length;
  return (
    <>
      <tr className="align-middle transition-colors hover:bg-[color:var(--surface-subtle)]/70">
        <td className="px-5 py-3">
          <div className="min-w-0">
            <p className="font-display text-base font-bold text-[color:var(--foreground)]">{year.name || year.code}</p>
          </div>
        </td>
        <td className="px-5 py-3 text-sm font-medium text-[color:var(--muted-foreground)]"><CalendarDays className="mr-1.5 inline h-4 w-4" />{formatDate(year.startsOn)} — {formatDate(year.endsOn)}</td>
        <td className="px-5 py-3"><span className="font-bold text-[color:var(--foreground)]">{year.terms.length}</span><span className="ml-1 text-[color:var(--muted-foreground)]">semester · {activeSemesterCount} active</span></td>
        <td className="px-5 py-3"><Badge variant={statusVariant(year.status)}>{statusLabels[year.status]}</Badge></td>
        <td className="px-5 py-3 text-right">
          <div className="flex justify-end gap-2"><Button variant="secondary" size="sm" onClick={onCreateTerm}><Plus className="h-4 w-4" />Add semester</Button><ActionMenu items={[{ label: "Edit academic year", icon: Pencil, disabled: year.status === "archived", onSelect: onEditYear }, { label: "Duplicate to next year", icon: Copy, loading: isDuplicating, disabled: year.status === "archived" || isDuplicating, onSelect: onDuplicate }, { label: "Archive year", icon: Archive, tone: "danger", loading: isArchiving, disabled: year.status === "archived", onSelect: onArchive }]} /></div>
        </td>
      </tr>
      {year.terms.length > 0 ? year.terms.map((term) => <TermDesktopRow key={term.id} term={term} onEdit={() => onEditTerm(term)} />) : <tr><td colSpan={5} className="bg-[color:var(--background)] px-5 py-3 text-sm text-[color:var(--muted-foreground)]">Belum ada semester untuk tahun akademik ini.</td></tr>}
    </>
  );
}

function TermDesktopRow({ term, onEdit }: { term: TermRow; onEdit: () => void }) {
  return (
    <tr className="bg-[color:var(--background)]/70">
      <td className="px-5 py-3 pl-10"><div className="flex min-w-0 items-center gap-2"><Clock3 className="h-4 w-4 shrink-0 text-[color:var(--muted-foreground)]" /><span className="truncate font-semibold text-[color:var(--foreground)]">{term.name || term.code}</span></div></td>
      <td className="px-5 py-3 text-xs font-medium text-[color:var(--muted-foreground)]">{formatDate(term.startsOn)} — {formatDate(term.endsOn)}</td>
      <td className="px-5 py-3 text-xs font-semibold text-[color:var(--muted-foreground)]">Updated {formatDate(term.updatedAt)}</td>
      <td className="px-5 py-3"><Badge variant={statusVariant(term.status)}>{statusLabels[term.status]}</Badge></td>
      <td className="px-5 py-3 text-right"><Button variant="ghost" size="sm" onClick={onEdit}><Pencil className="h-4 w-4" />Edit</Button></td>
    </tr>
  );
}

function AcademicMobileCards({ years, isArchivingYearId, isDuplicatingYearId, onEditYear, onCreateTerm, onEditTerm, onDuplicateYear, onArchiveYear }: { years: AcademicYearRow[]; isArchivingYearId: string | null; isDuplicatingYearId: string | null; onEditYear: (year: AcademicYearRow) => void; onCreateTerm: (year: AcademicYearRow) => void; onEditTerm: (year: AcademicYearRow, term: TermRow) => void; onDuplicateYear: (year: AcademicYearRow) => void; onArchiveYear: (year: AcademicYearRow) => void }) {
  return <div className="divide-y divide-[color:var(--border)] lg:hidden">{years.map((year) => <AcademicMobileCard key={year.id} year={year} isArchiving={isArchivingYearId === year.id} isDuplicating={isDuplicatingYearId === year.id} onEditYear={() => onEditYear(year)} onCreateTerm={() => onCreateTerm(year)} onEditTerm={(term) => onEditTerm(year, term)} onDuplicate={() => onDuplicateYear(year)} onArchive={() => onArchiveYear(year)} />)}</div>;
}

function AcademicMobileCard({ year, isArchiving, isDuplicating, onEditYear, onCreateTerm, onEditTerm, onDuplicate, onArchive }: { year: AcademicYearRow; isArchiving: boolean; isDuplicating: boolean; onEditYear: () => void; onCreateTerm: () => void; onEditTerm: (term: TermRow) => void; onDuplicate: () => void; onArchive: () => void }) {
  return (
    <article className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge variant={statusVariant(year.status)}>{statusLabels[year.status]}</Badge></div><h2 className="mt-2 truncate font-display text-lg font-bold">{year.name || year.code}</h2><p className="mt-1 text-sm font-medium text-[color:var(--muted-foreground)]">{formatDate(year.startsOn)} — {formatDate(year.endsOn)}</p></div>
        <ActionMenu items={[{ label: "Edit academic year", icon: Pencil, disabled: year.status === "archived", onSelect: onEditYear }, { label: "Duplicate to next year", icon: Copy, loading: isDuplicating, disabled: year.status === "archived" || isDuplicating, onSelect: onDuplicate }, { label: "Archive year", icon: Archive, tone: "danger", loading: isArchiving, disabled: year.status === "archived", onSelect: onArchive }]} />
      </div>
      <div className="mt-3 flex items-center justify-between rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-subtle)] px-3 py-2 text-sm"><span><strong>{year.terms.length}</strong> semester</span><Button variant="secondary" size="sm" onClick={onCreateTerm}><Plus className="h-4 w-4" />Add semester</Button></div>
      {year.terms.length ? <div className="mt-3 space-y-2">{year.terms.map((term) => <div key={term.id} className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2"><div className="flex items-center justify-between gap-2"><span className="truncate text-sm font-bold">{term.name || term.code}</span><div className="flex items-center gap-2"><Badge variant={statusVariant(term.status)}>{statusLabels[term.status]}</Badge><Button variant="ghost" size="sm" onClick={() => onEditTerm(term)}><Pencil className="h-4 w-4" />Edit</Button></div></div><p className="mt-1 text-xs font-medium text-[color:var(--muted-foreground)]">{formatDate(term.startsOn)} — {formatDate(term.endsOn)}</p></div>)}</div> : <p className="mt-3 text-sm text-[color:var(--muted-foreground)]">Belum ada semester untuk tahun akademik ini.</p>}
    </article>
  );
}

function AcademicDrawer({ mode, selectedYear, selectedTerm, isSaving, mutationError, mutationFieldErrors, onClose, onSubmitYear, onSubmitTerm, onSubmitTermUpdate }: { mode: DrawerMode; selectedYear: AcademicYearRow | null; selectedTerm: TermRow | null; isSaving: boolean; mutationError: string | null; mutationFieldErrors: Record<string, string>; onClose: () => void; onSubmitYear: (input: AcademicYearMutationInput) => void; onSubmitTerm: (input: TermMutationInput) => void; onSubmitTermUpdate: (termId: string, input: Omit<TermMutationInput, "academicYearId">) => void }) {
  const isYearEditMode = mode === "year-edit";
  const isTermMode = mode === "term" || mode === "term-edit";
  const isTermEditMode = mode === "term-edit";
  const [yearForm, setYearForm] = useState<YearFormState>({ code: "", name: "", startsOn: "", endsOn: "", status: "draft" });
  const [termForm, setTermForm] = useState<TermFormState>({ code: "", name: "", startsOn: "", endsOn: "", status: "draft" });

  const selectedYearId = selectedYear?.id ?? "";

  useEffect(() => {
    if (mode === "year") setYearForm({ code: "", name: "", startsOn: "", endsOn: "", status: "draft" });
    if (mode === "year-edit" && selectedYear) setYearForm({ code: selectedYear.code, name: selectedYear.name, startsOn: dateOnly(selectedYear.startsOn), endsOn: dateOnly(selectedYear.endsOn), status: selectedYear.status });
    if (mode === "term") setTermForm({ code: "", name: "", startsOn: "", endsOn: "", status: "draft" });
    if (mode === "term-edit" && selectedTerm) setTermForm({ code: selectedTerm.code, name: selectedTerm.name, startsOn: dateOnly(selectedTerm.startsOn), endsOn: dateOnly(selectedTerm.endsOn), status: selectedTerm.status });
  }, [mode, selectedYearId, selectedYear?.startsOn, selectedYear?.endsOn, selectedTerm]);

  return (
    <FormDrawer
      open={Boolean(mode)}
      onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}
      title={isTermEditMode ? "Edit semester" : isTermMode ? "Add semester" : isYearEditMode ? "Edit academic year" : "New academic year"}
      description={isTermMode && selectedYear ? `${isTermEditMode ? "Edit" : "Tambah"} semester di dalam ${selectedYear.name}. Tanggal bisa disesuaikan kalender sekolah.` : isYearEditMode ? "Edit satu tahun akademik tanpa field duplikat kode/nama." : "Create one school year. Semester Ganjil and Genap will be prepared automatically with editable dates."}
      footer={<><Button variant="secondary" onClick={onClose} disabled={isSaving}>Cancel</Button><Button loading={isSaving} onClick={() => { if (isTermEditMode && selectedTerm) onSubmitTermUpdate(selectedTerm.id, termForm); else if (isTermMode && selectedYear) onSubmitTerm({ academicYearId: selectedYear.id, ...termForm }); else onSubmitYear({ ...yearForm, name: yearForm.code }); }}>Save</Button></>}
    >
      <div className="space-y-4">
        {mutationError && Object.keys(mutationFieldErrors).length === 0 ? <div className="rounded-2xl border border-[color:var(--danger)]/25 bg-[color:var(--danger-soft)] px-4 py-3 text-sm font-semibold text-[color:var(--danger)]">{mutationError}</div> : null}
        {isTermMode && selectedYear ? <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-subtle)] px-4 py-3 text-sm text-[color:var(--muted-foreground)]"><strong className="text-[color:var(--foreground)]">{selectedYear.code}</strong> · {formatDate(selectedYear.startsOn)} — {formatDate(selectedYear.endsOn)}</div> : null}
        {isTermMode ? (
          <>
            <TextField prefix={<BookOpenText className="h-4 w-4" />} label="Semester" value={termForm.code} onChange={(event) => setTermForm((form) => ({ ...form, code: event.target.value, name: event.target.value }))} error={getFieldError(mutationFieldErrors, "code", "name")} helperText="Contoh: Semester Ganjil. Kode dan nama semester otomatis memakai nilai yang sama." />
          </>
        ) : (
          <TextField prefix={<CalendarDays className="h-4 w-4" />} label="School year" value={yearForm.code} onChange={(event) => setYearForm((form) => ({ ...form, code: event.target.value, name: event.target.value }))} error={getFieldError(mutationFieldErrors, "code", "name")} helperText="Contoh: 2027-2028. Nama tahun akademik otomatis mengikuti nilai ini." />
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <DatePicker label="Start date" value={isTermMode ? termForm.startsOn : yearForm.startsOn} onChange={(value) => isTermMode ? setTermForm((form) => ({ ...form, startsOn: value })) : setYearForm((form) => ({ ...form, startsOn: value }))} error={getFieldError(mutationFieldErrors, "startsOn", "starts_on")} />
          <DatePicker popoverAlign="end" label="End date" value={isTermMode ? termForm.endsOn : yearForm.endsOn} onChange={(value) => isTermMode ? setTermForm((form) => ({ ...form, endsOn: value })) : setYearForm((form) => ({ ...form, endsOn: value }))} error={getFieldError(mutationFieldErrors, "endsOn", "ends_on")} />
        </div>
        <SelectField startAdornment={<Tag className="h-4 w-4" />} label="Status" value={(isTermMode ? termForm.status : yearForm.status) ?? "draft"} onChange={(event) => isTermMode ? setTermForm((form) => ({ ...form, status: event.target.value as AcademicStatus })) : setYearForm((form) => ({ ...form, status: event.target.value as AcademicStatus }))} options={[{ value: "draft", label: "Draft" }, { value: "active", label: "Active" }, { value: "closed", label: "Closed" }]} error={getFieldError(mutationFieldErrors, "status")} />
      </div>
    </FormDrawer>
  );
}

function AcademicListLoadingState() {
  return (
    <div aria-label="Loading academic setup">
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[900px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[color:var(--border)] bg-[color:var(--surface-subtle)] text-xs uppercase tracking-[0.14em] text-[color:var(--muted-foreground)]">
              <th className="px-5 py-3 font-bold">Academic year</th>
              <th className="px-5 py-3 font-bold">Period</th>
              <th className="px-5 py-3 font-bold">Semester</th>
              <th className="px-5 py-3 font-bold">Status</th>
              <th className="px-5 py-3 text-right font-bold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--border)]">
            {Array.from({ length: 3 }).map((_, index) => (
              <Fragment key={index}>
                <tr className="align-middle">
                  <td className="px-5 py-3"><Skeleton className="h-5 w-36" /></td>
                  <td className="px-5 py-3"><Skeleton className="h-4 w-48" /></td>
                  <td className="px-5 py-3"><Skeleton className="h-4 w-32" /></td>
                  <td className="px-5 py-3"><Skeleton className="h-6 w-20 rounded-full" /></td>
                  <td className="px-5 py-3"><div className="flex justify-end gap-2"><Skeleton className="h-9 w-32 rounded-xl" /><Skeleton className="h-9 w-9 rounded-xl" /></div></td>
                </tr>
                <tr className="bg-[color:var(--background)]/70">
                  <td className="px-5 py-3 pl-10"><Skeleton className="h-4 w-40" /></td>
                  <td className="px-5 py-3"><Skeleton className="h-3.5 w-44" /></td>
                  <td className="px-5 py-3"><Skeleton className="h-3.5 w-28" /></td>
                  <td className="px-5 py-3"><Skeleton className="h-6 w-20 rounded-full" /></td>
                  <td className="px-5 py-3"><div className="flex justify-end"><Skeleton className="h-8 w-20 rounded-xl" /></div></td>
                </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <div className="divide-y divide-[color:var(--border)] lg:hidden">
        {Array.from({ length: 3 }).map((_, index) => (
          <article key={index} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-4 w-48 max-w-full" />
              </div>
              <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
            </div>
            <div className="mt-3 flex items-center justify-between rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-subtle)] px-3 py-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-28 rounded-xl" />
            </div>
            <div className="mt-3 space-y-2">
              <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2">
                <div className="flex items-center justify-between gap-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-6 w-20 rounded-full" /></div>
                <Skeleton className="mt-2 h-3.5 w-44 max-w-full" />
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function AcademicErrorState({ message }: { message?: string }) {
  return <div className="m-4 flex items-start gap-3 rounded-[18px] border border-[color:var(--danger-border,var(--border))] bg-[color:var(--surface-subtle)] p-4 text-sm"><AlertCircle className="mt-0.5 h-5 w-5 text-[color:var(--danger,var(--brand-strong))]" /><div><p className="font-bold">Gagal memuat academic setup</p><p className="text-[color:var(--muted-foreground)]">{message ?? "Cek koneksi atau izin academic:read."}</p></div></div>;
}

function NoAcademicYearsState({ onCreateYear }: { onCreateYear: () => void }) {
  return <div className="flex min-h-[320px] flex-col items-center justify-center p-8 text-center"><div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-subtle)]"><Layers3 className="h-6 w-6 text-[color:var(--brand-strong)]" /></div><h2 className="mt-4 font-display text-2xl font-bold text-[color:var(--foreground)]">Belum ada tahun akademik</h2><p className="mt-2 max-w-md text-sm leading-6 text-[color:var(--muted-foreground)]">Mulai dari tahun akademik aktif agar modul kelas, course offering, dan ujian punya periode yang jelas. Semester Ganjil/Genap akan dibuat otomatis.</p><Button className="mt-5" onClick={onCreateYear}><Plus className="h-4 w-4" />Create first academic year</Button></div>;
}

function NoAcademicResultsState({ onReset }: { onReset: () => void }) {
  return <div className="flex min-h-[280px] flex-col items-center justify-center p-8 text-center"><h2 className="font-display text-xl font-bold text-[color:var(--foreground)]">No academic periods found</h2><p className="mt-2 text-sm text-[color:var(--muted-foreground)]">Reset search/filter untuk melihat semua tahun akademik.</p><Button className="mt-5" variant="secondary" onClick={onReset}>Reset filters</Button></div>;
}
