"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mapApiErrorToFormState, type FormErrorState } from "@/lib/api-client";
import {
  archiveClassSection,
  createClassSection,
  listAcademicYears,
  listClassSections,
  updateClassSection,
  type AcademicYearRow,
  type ClassSectionMutationInput,
  type ClassSectionRow,
} from "@/lib/academic-api";
import { ClassSectionsPageContent } from "./class-sections-page";
import type { ToastItem, ToastTone } from "@/components/ui/toast";

const CLASS_SECTIONS_QUERY_KEY = ["class-sections"] as const;
const ACADEMIC_YEARS_QUERY_KEY = ["academic-years", "class-sections"] as const;

type DrawerMode = "create" | "edit" | null;

function mutationFormState(error: unknown): FormErrorState {
  return mapApiErrorToFormState(error);
}

function makeToast(tone: ToastTone, title: string, description?: string): ToastItem {
  return { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, tone, title, description };
}

export default function ClassSectionsPage() {
  const queryClient = useQueryClient();
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [selectedSection, setSelectedSection] = useState<ClassSectionRow | null>(null);
  const [pendingArchiveSection, setPendingArchiveSection] = useState<ClassSectionRow | null>(null);
  const [mutationError, setMutationError] = useState<FormErrorState | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = (tone: ToastTone, title: string, description?: string) => {
    const toast = makeToast(tone, title, description);
    setToasts((current) => [...current.slice(-3), toast]);
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== toast.id)), 4500);
  };

  const classSectionsQuery = useQuery<ClassSectionRow[]>({ queryKey: CLASS_SECTIONS_QUERY_KEY, queryFn: () => listClassSections() });
  const academicYearsQuery = useQuery<AcademicYearRow[]>({ queryKey: ACADEMIC_YEARS_QUERY_KEY, queryFn: () => listAcademicYears() });

  const invalidateClassSections = async () => {
    await queryClient.invalidateQueries({ queryKey: CLASS_SECTIONS_QUERY_KEY });
  };

  const createMutation = useMutation({
    mutationFn: (input: ClassSectionMutationInput) => createClassSection({}, input),
    onSuccess: async (section) => {
      setDrawerMode(null);
      setMutationError(null);
      pushToast("success", "Class section tersimpan", `${section.name} siap dipakai.`);
      await invalidateClassSections();
    },
    onError: (error) => {
      const formError = mutationFormState(error);
      setMutationError(formError);
      pushToast("error", "Gagal menyimpan class section", formError.message ?? undefined);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ClassSectionMutationInput }) => updateClassSection({}, id, input),
    onSuccess: async (section) => {
      setDrawerMode(null);
      setSelectedSection(null);
      setMutationError(null);
      pushToast("success", "Class section diperbarui", `${section.name} sudah disesuaikan.`);
      await invalidateClassSections();
    },
    onError: (error) => {
      const formError = mutationFormState(error);
      setMutationError(formError);
      pushToast("error", "Gagal memperbarui class section", formError.message ?? undefined);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => archiveClassSection({}, id),
    onSuccess: async (section) => {
      setPendingArchiveSection(null);
      pushToast("success", "Class section diarsipkan", `${section.name} disembunyikan dari daftar aktif.`);
      await invalidateClassSections();
    },
    onError: (error) => {
      const formError = mutationFormState(error);
      pushToast("error", "Gagal mengarsipkan class section", formError.message ?? undefined);
    },
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isArchivingSectionId = archiveMutation.isPending ? pendingArchiveSection?.id ?? null : null;

  return (
    <ClassSectionsPageContent
      classSections={classSectionsQuery.data ?? []}
      academicYears={academicYearsQuery.data ?? []}
      isLoading={classSectionsQuery.isLoading || academicYearsQuery.isLoading}
      error={classSectionsQuery.error ?? academicYearsQuery.error}
      isSaving={isSaving}
      isArchivingSectionId={isArchivingSectionId}
      drawerMode={drawerMode}
      selectedSection={selectedSection}
      pendingArchiveSection={pendingArchiveSection}
      mutationError={mutationError?.message ?? null}
      mutationFieldErrors={mutationError?.fields ?? {}}
      toasts={toasts}
      onDismissToast={(id) => setToasts((current) => current.filter((toast) => toast.id !== id))}
      onCreateSection={() => { setMutationError(null); setSelectedSection(null); setDrawerMode("create"); }}
      onEditSection={(section) => { setMutationError(null); setSelectedSection(section); setDrawerMode("edit"); }}
      onArchiveSection={(section) => { setMutationError(null); setPendingArchiveSection(section); }}
      onCloseDrawer={() => { if (isSaving) return; setDrawerMode(null); setSelectedSection(null); setMutationError(null); }}
      onCloseArchive={() => { if (archiveMutation.isPending) return; setPendingArchiveSection(null); }}
      onSubmitSection={(input) => {
        setMutationError(null);
        if (drawerMode === "edit" && selectedSection) updateMutation.mutate({ id: selectedSection.id, input });
        else createMutation.mutate(input);
      }}
      onConfirmArchive={() => { if (pendingArchiveSection) archiveMutation.mutate(pendingArchiveSection.id); }}
    />
  );
}
