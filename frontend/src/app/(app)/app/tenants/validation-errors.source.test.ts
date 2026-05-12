import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const tenantFormDrawerSource = readFileSync(join(process.cwd(), "src/app/(app)/app/tenants/tenant-form-drawer.tsx"), "utf8");
const tenantAdminDrawerSource = readFileSync(join(process.cwd(), "src/app/(app)/app/tenants/tenant-admin-drawer.tsx"), "utf8");
const academicSetupSource = readFileSync(join(process.cwd(), "src/app/(app)/app/academic-setup/academic-setup-page.tsx"), "utf8");
const classSectionsSource = readFileSync(join(process.cwd(), "src/app/(app)/app/class-sections/class-sections-page.tsx"), "utf8");

describe("mutation validation error UX contract", () => {
  it("suppresses drawer-level global errors when field errors are available", () => {
    expect(tenantFormDrawerSource).toContain("const hasFieldErrors = Object.keys(fieldErrors).length > 0");
    expect(tenantFormDrawerSource).toContain("error && !hasFieldErrors");
    expect(tenantFormDrawerSource).toContain("error={fieldError(fieldErrors, \"name\"");
    expect(tenantFormDrawerSource).toContain("error={fieldError(fieldErrors, \"code\"");

    expect(tenantAdminDrawerSource).toContain("const hasFieldErrors = Object.keys(fieldErrors).length > 0");
    expect(tenantAdminDrawerSource).toContain("error && !hasFieldErrors");
    expect(tenantAdminDrawerSource).toContain("error={fieldError(fieldErrors, \"email\"");
    expect(tenantAdminDrawerSource).toContain("error={fieldError(fieldErrors, \"displayName\"");
    expect(tenantAdminDrawerSource).toContain("error={fieldError(fieldErrors, \"password\"");

    expect(academicSetupSource).toContain("mutationError && Object.keys(mutationFieldErrors).length === 0");
    expect(academicSetupSource).toContain("error={getFieldError(mutationFieldErrors, \"code\", \"name\")}");
    expect(academicSetupSource).toContain("error={getFieldError(mutationFieldErrors, \"startsOn\", \"starts_on\")}");
    expect(academicSetupSource).toContain("error={getFieldError(mutationFieldErrors, \"endsOn\", \"ends_on\")}");
    expect(academicSetupSource).toContain("error={getFieldError(mutationFieldErrors, \"status\")}");

    expect(classSectionsSource).toContain("mutationError && Object.keys(mutationFieldErrors).length === 0");
    expect(classSectionsSource).toContain("error={getFieldError(mutationFieldErrors, \"academicYearId\", \"academic_year_id\")}");
    expect(classSectionsSource).toContain("error={getFieldError(mutationFieldErrors, \"code\")}");
    expect(classSectionsSource).toContain("error={getFieldError(mutationFieldErrors, \"gradeLevel\", \"grade_level\")}");
    expect(classSectionsSource).toContain("error={getFieldError(mutationFieldErrors, \"name\")}");
  });
});
