"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AcademicSetupPageContent } from "./academic-setup-page";
import { mapApiErrorToFormState, type FormErrorState } from "@/lib/api-client";
import {
  archiveAcademicYear,
  createAcademicYear,
  createTerm,
  duplicateAcademicYear,
  updateAcademicYear,
  updateTerm,
  listAcademicYears,
  type AcademicYearMutationInput,
  type AcademicYearRow,
  type TermMutationInput,
  type TermRow,
} from "@/lib/academic-api";
import type { ToastItem, ToastTone } from "@/components/ui/toast";

const ACADEMIC_YEARS_QUERY_KEY = ["academic-years"] as const;

type DrawerMode = "year" | "year-edit" | "term" | "term-edit" | null;

function mutationFormState(error: unknown): FormErrorState {
  return mapApiErrorToFormState(error);
}

function makeToast(tone: ToastTone, title: string, description?: string): ToastItem {
  return { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, tone, title, description };
}

export default function AcademicSetupPage() {
  const queryClient = useQueryClient();
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [selectedYear, setSelectedYear] = useState<AcademicYearRow | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<TermRow | null>(null);
  const [pendingArchiveYear, setPendingArchiveYear] = useState<AcademicYearRow | null>(null);
  const [mutationError, setMutationError] = useState<FormErrorState | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = (tone: ToastTone, title: string, description?: string) => {
    const toast = makeToast(tone, title, description);
    setToasts((current) => [...current.slice(-3), toast]);
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== toast.id)), 4500);
  };

  const academicYearsQuery = useQuery<AcademicYearRow[]>({
    queryKey: ACADEMIC_YEARS_QUERY_KEY,
    queryFn: () => listAcademicYears(),
  });

  const invalidateAcademicYears = async () => {
    await queryClient.invalidateQueries({ queryKey: ACADEMIC_YEARS_QUERY_KEY });
  };

  const createYearMutation = useMutation({
    mutationFn: (input: AcademicYearMutationInput) => createAcademicYear({}, input),
    onSuccess: async (year) => {
      setDrawerMode(null);
      setMutationError(null);
      pushToast("success", "Tahun akademik tersimpan", `${year.name} siap dipakai.`);
      await invalidateAcademicYears();
    },
    onError: (error) => {
      const formError = mutationFormState(error);
      setMutationError(formError);
      pushToast("error", "Gagal menyimpan tahun akademik", formError.message ?? undefined);
    },
  });

  const updateYearMutation = useMutation({
    mutationFn: ({ yearId, input }: { yearId: string; input: AcademicYearMutationInput }) => updateAcademicYear({}, yearId, input),
    onSuccess: async (year) => {
      setDrawerMode(null);
      setSelectedYear(null);
      setMutationError(null);
      pushToast("success", "Tahun akademik diperbarui", `${year.name} sudah disesuaikan.`);
      await invalidateAcademicYears();
    },
    onError: (error) => {
      const formError = mutationFormState(error);
      setMutationError(formError);
      pushToast("error", "Gagal memperbarui tahun akademik", formError.message ?? undefined);
    },
  });

  const createTermMutation = useMutation({
    mutationFn: (input: TermMutationInput) => createTerm({}, input),
    onSuccess: async (term) => {
      setDrawerMode(null);
      setSelectedYear(null);
      setMutationError(null);
      pushToast("success", "Semester berhasil ditambahkan", `${term.name} sudah masuk kalender akademik.`);
      await invalidateAcademicYears();
    },
    onError: (error) => {
      const formError = mutationFormState(error);
      setMutationError(formError);
      pushToast("error", "Gagal menyimpan semester", formError.message ?? undefined);
    },
  });


  const updateTermMutation = useMutation({
    mutationFn: ({ termId, input }: { termId: string; input: Omit<TermMutationInput, "academicYearId"> }) => updateTerm({}, termId, input),
    onSuccess: async (term) => {
      setDrawerMode(null);
      setSelectedYear(null);
      setSelectedTerm(null);
      setMutationError(null);
      pushToast("success", "Semester berhasil diperbarui", `${term.name} sudah disesuaikan.`);
      await invalidateAcademicYears();
    },
    onError: (error) => {
      const formError = mutationFormState(error);
      setMutationError(formError);
      pushToast("error", "Gagal memperbarui semester", formError.message ?? undefined);
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => duplicateAcademicYear({}, id),
    onSuccess: async (year) => {
      setMutationError(null);
      pushToast("success", "Tahun akademik diduplikasi", `${year.name} dibuat untuk periode berikutnya.`);
      await invalidateAcademicYears();
    },
    onError: (error) => {
      const formError = mutationFormState(error);
      setMutationError(null);
      pushToast("error", "Gagal menduplikasi tahun", formError.message ?? undefined);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => archiveAcademicYear({}, id),
    onSuccess: async () => {
      setPendingArchiveYear(null);
      setMutationError(null);
      pushToast("success", "Tahun akademik diarsipkan", "Semester di bawahnya ikut diarsipkan.");
      await invalidateAcademicYears();
    },
    onError: (error) => {
      const formError = mutationFormState(error);
      setMutationError(null);
      pushToast("error", "Gagal mengarsipkan tahun", formError.message ?? undefined);
    },
  });

  const isSaving = createYearMutation.isPending || updateYearMutation.isPending || createTermMutation.isPending || updateTermMutation.isPending;
  const isDuplicatingYearId = duplicateMutation.isPending ? duplicateMutation.variables ?? null : null;
  const isArchivingYearId = archiveMutation.isPending ? pendingArchiveYear?.id ?? null : null;

  return (
    <AcademicSetupPageContent
      academicYears={academicYearsQuery.data ?? []}
      isLoading={academicYearsQuery.isLoading}
      error={academicYearsQuery.error}
      isSaving={isSaving}
      isArchivingYearId={isArchivingYearId}
      isDuplicatingYearId={isDuplicatingYearId}
      drawerMode={drawerMode}
      selectedYear={selectedYear}
      selectedTerm={selectedTerm}
      pendingArchiveYear={pendingArchiveYear}
      mutationError={mutationError?.message ?? null}
      mutationFieldErrors={mutationError?.fields ?? {}}
      toasts={toasts}
      onDismissToast={(id) => setToasts((current) => current.filter((toast) => toast.id !== id))}
      onCreateYear={() => {
        setMutationError(null);
        setSelectedYear(null);
        setDrawerMode("year");
      }}
      onEditYear={(year) => {
        setMutationError(null);
        setSelectedYear(year);
        setSelectedTerm(null);
        setDrawerMode("year-edit");
      }}
      onCreateTerm={(year) => {
        setMutationError(null);
        setSelectedYear(year);
        setSelectedTerm(null);
        setDrawerMode("term");
      }}
      onEditTerm={(year, term) => {
        setMutationError(null);
        setSelectedYear(year);
        setSelectedTerm(term);
        setDrawerMode("term-edit");
      }}
      onDuplicateYear={(year) => {
        setMutationError(null);
        duplicateMutation.mutate(year.id);
      }}
      onArchiveYear={(year) => {
        setMutationError(null);
        setPendingArchiveYear(year);
      }}
      onCloseDrawer={() => {
        if (isSaving) return;
        setDrawerMode(null);
        setSelectedYear(null);
        setSelectedTerm(null);
        setMutationError(null);
      }}
      onCloseArchive={() => {
        if (archiveMutation.isPending) return;
        setPendingArchiveYear(null);
      }}
      onSubmitYear={(input) => {
        setMutationError(null);
        if (drawerMode === "year-edit" && selectedYear) updateYearMutation.mutate({ yearId: selectedYear.id, input });
        else createYearMutation.mutate(input);
      }}
      onSubmitTerm={(input) => {
        setMutationError(null);
        createTermMutation.mutate(input);
      }}
      onSubmitTermUpdate={(termId, input) => {
        setMutationError(null);
        updateTermMutation.mutate({ termId, input });
      }}
      onConfirmArchive={() => {
        if (pendingArchiveYear) archiveMutation.mutate(pendingArchiveYear.id);
      }}
    />
  );
}
