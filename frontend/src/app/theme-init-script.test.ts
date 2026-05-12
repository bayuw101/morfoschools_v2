import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const layoutSource = readFileSync(join(process.cwd(), "src/app/layout.tsx"), "utf8");

describe("theme init script", () => {
  it("sets a deterministic light theme on the html tag before CSS can paint", () => {
    expect(layoutSource).toContain('<html lang="id" data-theme="light" data-palette="morfosis"');
    expect(layoutSource).toContain('var fallback = { mode: "light", palette: "morfosis" }');
  });
});
