"use client";

import * as React from "react";
import { AUTH_SESSION_CHANGED_EVENT, fetchCurrentSession, getSession, type AuthSession } from "@/lib/auth";

export type AuthSessionState = {
  session: AuthSession | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<AuthSession | null>;
};

export function useAuthSession(): AuthSessionState {
  // Keep the first client render identical to SSR. Reading localStorage in the
  // useState initializer makes authenticated pages hydrate with cached tenant
  // text while the server rendered the anonymous fallback.
  const [session, setSession] = React.useState<AuthSession | null>(null);
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

  React.useEffect(() => {
    function handleSessionChanged(event: Event) {
      const customEvent = event as CustomEvent<AuthSession | null>;
      setSession(customEvent.detail ?? getSession());
      setLoading(false);
    }

    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, handleSessionChanged);
    return () => window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, handleSessionChanged);
  }, []);

  return { session, loading, error, refresh };
}
