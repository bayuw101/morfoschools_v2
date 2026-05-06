import { describe, expect, it } from "vitest";
import { primaryNavigation } from "./navigation";

describe("primaryNavigation", () => {
  it("uses unique hrefs so React list keys stay stable", () => {
    const hrefs = primaryNavigation.map((item) => item.href);

    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});
