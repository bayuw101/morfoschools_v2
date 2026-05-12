import { createApiClient, type ApiClientOptions } from "./api-client";

export type AcademicStatus = "draft" | "active" | "closed" | "archived";
export type ClassSectionStatus = "active" | "inactive" | "archived";

export type TermRow = {
  id: string;
  tenantId: string;
  academicYearId: string;
  code: string;
  name: string;
  startsOn: string;
  endsOn: string;
  status: AcademicStatus;
  createdAt: string;
  updatedAt: string;
};

export type AcademicYearRow = {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  startsOn: string;
  endsOn: string;
  status: AcademicStatus;
  createdAt: string;
  updatedAt: string;
  terms: TermRow[];
};

export type AcademicYearMutationInput = {
  code: string;
  name: string;
  startsOn: string;
  endsOn: string;
  status?: AcademicStatus;
};

export type TermMutationInput = {
  academicYearId: string;
  code: string;
  name: string;
  startsOn: string;
  endsOn: string;
  status?: AcademicStatus;
};

export type AcademicYearSummary = {
  id: string;
  code: string;
  name: string;
  startsOn: string;
  endsOn: string;
  status: AcademicStatus;
};

export type TeacherSummary = {
  id: string;
  name: string;
};

export type ClassSectionRow = {
  id: string;
  tenantId: string;
  academicYearId: string;
  code: string;
  name: string;
  gradeLevel: string;
  homeroomTeacherId: string;
  status: ClassSectionStatus;
  createdAt: string;
  updatedAt: string;
  academicYear: AcademicYearSummary;
  homeroomTeacher: TeacherSummary | null;
};

export type ClassSectionMutationInput = {
  academicYearId: string;
  code: string;
  name: string;
  gradeLevel: string;
  homeroomTeacherId?: string;
  status?: ClassSectionStatus;
};

export type AcademicYearUpdateInput = AcademicYearMutationInput;
export type TermUpdateInput = Omit<TermMutationInput, "academicYearId">;
export type ClassSectionUpdateInput = ClassSectionMutationInput;

type AcademicYearsEnvelope = {
  academicYears: AcademicYearRow[];
};

type ClassSectionsEnvelope = {
  classSections: ClassSectionRow[];
};

function academicClient(options: ApiClientOptions = {}) {
  return createApiClient(options);
}

export async function listAcademicYears(options: ApiClientOptions = {}): Promise<AcademicYearRow[]> {
  const data = await academicClient(options).request<AcademicYearsEnvelope>("/api/v1/academic-years", { method: "GET" });
  return data.academicYears;
}

export async function listClassSections(options: ApiClientOptions = {}): Promise<ClassSectionRow[]> {
  const data = await academicClient(options).request<ClassSectionsEnvelope>("/api/v1/class-sections", { method: "GET" });
  return data.classSections;
}

export async function createClassSection(options: ApiClientOptions = {}, input: ClassSectionMutationInput): Promise<ClassSectionRow> {
  const data = await academicClient(options).request<{ classSection: ClassSectionRow }>("/api/v1/class-sections", {
    method: "POST",
    body: input,
  });
  return data.classSection;
}

export async function updateClassSection(options: ApiClientOptions = {}, id: string, input: ClassSectionUpdateInput): Promise<ClassSectionRow> {
  const data = await academicClient(options).request<{ classSection: ClassSectionRow }>(`/api/v1/class-sections/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: input,
  });
  return data.classSection;
}

export async function archiveClassSection(options: ApiClientOptions = {}, id: string): Promise<ClassSectionRow> {
  const data = await academicClient(options).request<{ classSection: ClassSectionRow }>(`/api/v1/class-sections/${encodeURIComponent(id)}/archive`, {
    method: "PATCH",
  });
  return data.classSection;
}

export async function createAcademicYear(options: ApiClientOptions = {}, input: AcademicYearMutationInput): Promise<AcademicYearRow> {
  const data = await academicClient(options).request<{ academicYear: AcademicYearRow }>("/api/v1/academic-years", {
    method: "POST",
    body: input,
  });
  return data.academicYear;
}

export async function updateAcademicYear(options: ApiClientOptions = {}, id: string, input: AcademicYearUpdateInput): Promise<AcademicYearRow> {
  const data = await academicClient(options).request<{ academicYear: AcademicYearRow }>(`/api/v1/academic-years/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: input,
  });
  return data.academicYear;
}

export async function createTerm(options: ApiClientOptions = {}, input: TermMutationInput): Promise<TermRow> {
  const data = await academicClient(options).request<{ term: TermRow }>("/api/v1/terms", {
    method: "POST",
    body: input,
  });
  return data.term;
}

export async function updateTerm(options: ApiClientOptions = {}, id: string, input: TermUpdateInput): Promise<TermRow> {
  const data = await academicClient(options).request<{ term: TermRow }>(`/api/v1/terms/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: input,
  });
  return data.term;
}

export async function duplicateAcademicYear(options: ApiClientOptions = {}, id: string): Promise<AcademicYearRow> {
  const data = await academicClient(options).request<{ academicYear: AcademicYearRow }>(`/api/v1/academic-years/${encodeURIComponent(id)}/duplicate`, {
    method: "POST",
  });
  return data.academicYear;
}

export async function archiveAcademicYear(options: ApiClientOptions = {}, id: string): Promise<{ ok: boolean }> {
  return academicClient(options).request<{ ok: boolean }>(`/api/v1/academic-years/${encodeURIComponent(id)}/archive`, {
    method: "PATCH",
  });
}
