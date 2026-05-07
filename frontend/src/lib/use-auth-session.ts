"use client";

import * as React from "react";
import { fetchCurrentSession, getSession, type AuthSession } from "@/lib/auth";

export type AuthSessionState = {
  session: AuthSession | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<AuthSession | null>;
};

export function useAuthSession(): AuthSessionState {
  const [session, setSession] = React.useState<AuthSession | null>(() => getSession());
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setError(null);
    const value = await fetchCurrentSession();
    setSession(value);
    return value;
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    refresh()
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "session_load_failed");
          setSession(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  return { session, loading, error, refresh };
}
