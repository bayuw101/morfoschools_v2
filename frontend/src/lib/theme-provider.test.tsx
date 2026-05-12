import * as React from "react";
import { cleanup, render, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";

import { ThemeProvider, useTheme } from "./theme-provider";

function ThemeProbe() {
  const { preference } = useTheme();
  return React.createElement("span", { "data-testid": "theme-mode" }, preference.mode);
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-palette");
  document.documentElement.removeAttribute("style");
});

describe("ThemeProvider", () => {
  it("keeps the first render deterministic before reading browser-only theme storage", async () => {
    window.localStorage.setItem(
      "morfoschools-theme-v1",
      JSON.stringify({ mode: "light", palette: "tokyo-night" }),
    );

    const fetcher = async () =>
      new Response(JSON.stringify({ data: { theme: { cssVariables: {} } } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    const serverMarkup = renderToString(
      React.createElement(ThemeProvider, { fetcher, children: React.createElement(ThemeProbe) }),
    );
    const clientView = render(
      React.createElement(ThemeProvider, { fetcher, children: React.createElement(ThemeProbe) }),
    );

    expect(serverMarkup).toContain(">light<");

    await waitFor(() => {
      expect(clientView.getByTestId("theme-mode").textContent).toBe("light");
    });
  });

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
      React.createElement(ThemeProvider, {
        fetcher,
        sessionKey: "anonymous",
        children: React.createElement("div", null, "App"),
      }),
    );

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe("light");
      expect(document.documentElement.dataset.palette).toBe("tokyo-night");
    });

    await waitFor(() => {
      expect(document.documentElement.style.getPropertyValue("--morfoschool-color-primary")).toBe("#123456");
    });
    expect(document.documentElement.style.getPropertyValue("background")).toBe("");

    view.rerender(
      React.createElement(ThemeProvider, {
        fetcher,
        sessionKey: "tenant-1:teacher",
        children: React.createElement("div", null, "App"),
      }),
    );

    await waitFor(() => {
      expect(document.documentElement.style.getPropertyValue("--morfoschool-color-primary")).toBe("#654321");
    });
    expect(fetches).toBe(2);
  });
});
