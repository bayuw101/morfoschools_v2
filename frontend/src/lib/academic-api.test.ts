import { describe, expect, it, vi } from "vitest";

import {
  archiveAcademicYear,
  createAcademicYear,
  updateAcademicYear,
  createTerm,
  duplicateAcademicYear,
  listAcademicYears,
  updateTerm,
  archiveClassSection,
  createClassSection,
  listClassSections,
  updateClassSection,
  type AcademicYearRow,
  type ClassSectionRow,
} from "./academic-api";

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("academic API module", () => {
  it("lists academic years with nested terms through the API envelope without dummy rows", async () => {
    const academicYears: AcademicYearRow[] = [
      {
        id: "ay1",
        tenantId: "tenant-1",
        code: "2026-2027",
        name: "TA 2026/2027",
        startsOn: "2026-07-01",
        endsOn: "2027-06-30",
        status: "active",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-02T00:00:00Z",
        terms: [
          {
            id: "term1",
            tenantId: "tenant-1",
            academicYearId: "ay1",
            code: "ganjil",
            name: "Semester Ganjil",
            startsOn: "2026-07-01",
            endsOn: "2026-12-20",
            status: "active",
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-02T00:00:00Z",
          },
        ],
      },
    ];
    const fetcher = vi.fn(async () => jsonResponse({ data: { academicYears } }));

    await expect(listAcademicYears({ baseUrl: "http://api.test", fetcher })).resolves.toEqual(academicYears);
    expect(fetcher).toHaveBeenCalledWith(
      "http://api.test/api/v1/academic-years",
      expect.objectContaining({ method: "GET", credentials: "include" }),
    );
  });

  it("keeps empty academic setup directories empty instead of injecting placeholders", async () => {
    const fetcher = vi.fn(async () => jsonResponse({ data: { academicYears: [] } }));

    await expect(listAcademicYears({ baseUrl: "http://api.test", fetcher })).resolves.toEqual([]);
  });

  it("lists class sections through the API envelope without dummy rows", async () => {
    const classSections: ClassSectionRow[] = [
      {
        id: "class-1",
        tenantId: "tenant-1",
        academicYearId: "ay1",
        code: "X-A",
        name: "Kelas X-A",
        gradeLevel: "10",
        homeroomTeacherId: "teacher-1",
        status: "active",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-02T00:00:00Z",
        academicYear: {
          id: "ay1",
          code: "2026-2027",
          name: "TA 2026/2027",
          startsOn: "2026-07-01",
          endsOn: "2027-06-30",
          status: "active",
        },
        homeroomTeacher: { id: "teacher-1", name: "Bu Lestari" },
      },
    ];
    const fetcher = vi.fn(async () => jsonResponse({ data: { classSections } }));

    await expect(listClassSections({ baseUrl: "http://api.test", fetcher })).resolves.toEqual(classSections);
    expect(fetcher).toHaveBeenCalledWith(
      "http://api.test/api/v1/class-sections",
      expect.objectContaining({ method: "GET", credentials: "include" }),
    );
  });

  it("keeps empty class section directories empty instead of injecting placeholders", async () => {
    const fetcher = vi.fn(async () => jsonResponse({ data: { classSections: [] } }));

    await expect(listClassSections({ baseUrl: "http://api.test", fetcher })).resolves.toEqual([]);
  });

  it("uses backend routes and tenant/csrf headers for class section create, edit, and archive actions", async () => {
    const fetcher = vi.fn(async (_input: string, _init?: RequestInit) => jsonResponse({ data: { classSection: { id: "class-1" }, ok: true } }));
    const options = {
      baseUrl: "http://api.test",
      fetcher,
      getSession: () => ({ tenantId: "tenant-1", csrfToken: "csrf-1" }),
    };

    await createClassSection(options, {
      academicYearId: "ay1",
      code: "X-A",
      name: "Kelas X-A",
      gradeLevel: "10",
      homeroomTeacherId: "teacher-1",
      status: "active",
    });
    await updateClassSection(options, "class-1", {
      academicYearId: "ay1",
      code: "X-B",
      name: "Kelas X-B",
      gradeLevel: "10",
      status: "inactive",
    });
    await archiveClassSection(options, "class-1");

    expect(fetcher.mock.calls.map(([input]) => input)).toEqual([
      "http://api.test/api/v1/class-sections",
      "http://api.test/api/v1/class-sections/class-1",
      "http://api.test/api/v1/class-sections/class-1/archive",
    ]);
    expect(fetcher.mock.calls.map(([, init]) => init?.method)).toEqual(["POST", "PATCH", "PATCH"]);
    for (const [, init] of fetcher.mock.calls) {
      const headers = init?.headers as Headers;
      expect(headers.get("X-Tenant-ID")).toBe("tenant-1");
      expect(headers.get("X-CSRF-Token")).toBe("csrf-1");
    }
  });

  it("uses backend routes and tenant/csrf headers for create, edit, duplicate, and archive actions", async () => {
    const fetcher = vi.fn(async (_input: string, _init?: RequestInit) => jsonResponse({ data: { ok: true } }));
    const options = {
      baseUrl: "http://api.test",
      fetcher,
      getSession: () => ({ tenantId: "tenant-1", csrfToken: "csrf-1" }),
    };

    await createAcademicYear(options, {
      code: "2027-2028",
      name: "TA 2027/2028",
      startsOn: "2027-07-01",
      endsOn: "2028-06-30",
      status: "active",
    });
    await updateAcademicYear(options, "ay1", {
      code: "2027-2028",
      name: "2027-2028",
      startsOn: "2027-07-01",
      endsOn: "2028-06-30",
      status: "active",
    });
    await createTerm(options, {
      academicYearId: "ay1",
      code: "genap",
      name: "Semester Genap",
      startsOn: "2027-01-05",
      endsOn: "2027-06-30",
      status: "active",
    });
    await updateTerm(options, "term1", {
      code: "genap",
      name: "Semester Genap",
      startsOn: "2027-01-05",
      endsOn: "2027-06-30",
      status: "active",
    });
    await duplicateAcademicYear(options, "ay1");
    await archiveAcademicYear(options, "ay1");

    expect(fetcher.mock.calls.map(([input]) => input)).toEqual([
      "http://api.test/api/v1/academic-years",
      "http://api.test/api/v1/academic-years/ay1",
      "http://api.test/api/v1/terms",
      "http://api.test/api/v1/terms/term1",
      "http://api.test/api/v1/academic-years/ay1/duplicate",
      "http://api.test/api/v1/academic-years/ay1/archive",
    ]);
    expect(fetcher.mock.calls.map(([, init]) => init?.method)).toEqual(["POST", "PATCH", "POST", "PATCH", "POST", "PATCH"]);
    for (const [, init] of fetcher.mock.calls) {
      const headers = init?.headers as Headers;
      expect(headers.get("X-Tenant-ID")).toBe("tenant-1");
      expect(headers.get("X-CSRF-Token")).toBe("csrf-1");
    }
  });
});
