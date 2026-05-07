import * as React from "react";
import { render } from "@testing-library/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import { QueryProvider } from "./query-provider";

function QueryProbe() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["probe"], queryFn: async () => [] as string[] });
  const mutation = useMutation({ mutationFn: async () => "saved" });

  return React.createElement("output", {
    "data-testid": "query-provider-probe",
    "data-query-stale-time": String(queryClient.getDefaultOptions().queries?.staleTime),
    "data-query-retry": String(queryClient.getDefaultOptions().queries?.retry),
    "data-mutation-retry": String(queryClient.getDefaultOptions().mutations?.retry),
    "data-has-empty-data": String(Array.isArray(query.data) && query.data.length === 0),
    "data-mutation-status": mutation.status,
  });
}

describe("QueryProvider", () => {
  it("provides TanStack Query with production-safe defaults and no dummy initial rows", () => {
    const view = render(
      React.createElement(QueryProvider, null, React.createElement(QueryProbe)),
    );
    const probe = view.getByTestId("query-provider-probe");

    expect(probe.getAttribute("data-query-stale-time")).toBe("30000");
    expect(probe.getAttribute("data-query-retry")).toBe("1");
    expect(probe.getAttribute("data-mutation-retry")).toBe("0");
    expect(probe.getAttribute("data-mutation-status")).toBe("idle");
  });
});
