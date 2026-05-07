import * as React from "react";
import { render, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ThemeProvider } from "./theme-provider";

describe("ThemeProvider", () => {
  it("applies local preference and sanitized tenant theme variables, then refreshes on session changes", async () => {
    window.localStorage.setItem(
      "morfoschools-theme-v1",
      JSON.stringify({ mode: "light", palette: "tokyo-night" }),
    );

    let fetches = 0;
    const fetcher = async () => {
      fetches += 1;
      return new Response(
        JSON.stringify({
          data: {
            theme: {
              tenantId: "tenant-1",
              preset: "morfoschools-default",
              primaryColor: "#123456",
              accentColor: "#f5a524",
              logoUrl: "",
              version: fetches,
              cacheKey: `tenant_theme:tenant-1:v${fetches}`,
              cssVariables: {
                "--morfoschool-color-primary": fetches === 1 ? "#123456" : "#654321",
                background: "red",
              },
            },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };

    const view = render(
      React.createElement(
        ThemeProvider,
        { fetcher, sessionKey: "anonymous" },
        React.createElement("div", null, "App"),
      ),
    );

    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.dataset.palette).toBe("tokyo-night");

    await waitFor(() => {
      expect(document.documentElement.style.getPropertyValue("--morfoschool-color-primary")).toBe("#123456");
    });
    expect(document.documentElement.style.getPropertyValue("background")).toBe("");

    view.rerender(
      React.createElement(
        ThemeProvider,
        { fetcher, sessionKey: "tenant-1:teacher" },
        React.createElement("div", null, "App"),
      ),
    );

    await waitFor(() => {
      expect(document.documentElement.style.getPropertyValue("--morfoschool-color-primary")).toBe("#654321");
    });
    expect(fetches).toBe(2);
  });
});
