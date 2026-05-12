import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(__dirname, "users-page.tsx"), "utf8");
const drawerSource = readFileSync(join(__dirname, "user-drawers.tsx"), "utf8");
const listSource = readFileSync(join(__dirname, "user-list.tsx"), "utf8");

describe("UsersPageContent source contract", () => {
  it("removes the duplicate active tenant user count above the table", () => {
    expect(source).toContain("User directory");
    expect(source).not.toContain("user dalam tenant aktif");
  });

  it("shows an icon on the display name input field", () => {
    expect(drawerSource).toMatch(/label=\"Display name\"[\s\S]*prefix=\{<UserRound className=\"h-4 w-4\" \/>\}/);
  });

  it("uses the same reusable directory toolbar and action menu pattern as tenants", () => {
    expect(source).toContain("DirectoryToolbar");
    expect(source).toContain("UserDesktopTable");
    expect(source).toContain("UserMobileCards");
    expect(listSource).toContain("ActionMenu");
    expect(source).not.toContain("<Skeleton");
    expect(source).not.toContain("<TextField");
  });

  it("does not keep the old master-admin seeded tenant fallback in the page container", () => {
    const pageSource = readFileSync(join(__dirname, "page.tsx"), "utf8");
    expect(pageSource).not.toContain("11111111-1111-7111-8111-111111111111");
    expect(pageSource).not.toContain("Create is disabled until tenant is selected");
  });
});
