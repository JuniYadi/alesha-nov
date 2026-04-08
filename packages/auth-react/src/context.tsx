"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import {
  DEFAULT_SESSION_REFRESH_BUFFER_SECONDS,
  type AuthContextValue,
  type AuthState,
  type AuthApiConfig,
  type PublicUser,
  type AuthSession,
} from "./types";

export type { AuthContextValue, AuthState, AuthSession, AuthStatus } from "./types";

export const AuthContext = createContext<AuthContextValue | null>(null);

function buildUrl(path: string, config: AuthApiConfig): string {
  const basePath = config.basePath ?? "/auth";
  if (config.baseUrl) {
    return `${config.baseUrl.replace(/\/+$/, "")}${basePath}${path}`;
  }
  return `${basePath}${path}`;
}

async function fetchSession(config: AuthApiConfig): Promise<{ session: AuthSession } | null> {
  const res = await fetch(buildUrl("/session", config), { credentials: "include" });
  if (!res.ok) return null;
  return res.json();
}

async function fetchMe(config: AuthApiConfig): Promise<{ user: PublicUser } | null> {
  const res = await fetch(buildUrl("/me", config), { credentials: "include" });
  if (!res.ok) return null;
  return res.json();
}

export function AuthProvider({ children, config: configProp }: { children: ReactNode; config?: AuthApiConfig }) {
  const config = configProp ?? {};
  const [state, setState] = useState<AuthState>({ status: "loading", session: null, user: null });

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchAllRef = useRef<(() => Promise<void>) | null>(null);

  const clearRefreshTimer = useCallback(() => {
    if (!refreshTimerRef.current) return;
    clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = null;
  }, []);

  const scheduleNextRefresh = useCallback(
    (session: AuthSession | null) => {
      clearRefreshTimer();
      if (!session) return;

      const refreshBufferSeconds = config.sessionRefreshBufferSeconds ?? DEFAULT_SESSION_REFRESH_BUFFER_SECONDS;
      const refreshAtMs = session.exp * 1000 - refreshBufferSeconds * 1000;
      const delayMs = Math.max(0, refreshAtMs - Date.now());

      refreshTimerRef.current = setTimeout(() => {
        void fetchAllRef.current?.();
      }, delayMs);
    },
    [clearRefreshTimer, config.sessionRefreshBufferSeconds],
  );

  const fetchAll = useCallback(async () => {
    try {
      const [sessionData, meData] = await Promise.all([fetchSession(config), fetchMe(config)]);

      if (sessionData?.session) {
        setState({ status: "authenticated", session: sessionData.session, user: meData?.user ?? null });
        scheduleNextRefresh(sessionData.session);
      } else {
        clearRefreshTimer();
        setState({ status: "unauthenticated", session: null, user: null });
      }
    } catch {
      clearRefreshTimer();
      setState({ status: "unauthenticated", session: null, user: null });
    }
  }, [clearRefreshTimer, config, scheduleNextRefresh]);

  useEffect(() => {
    fetchAllRef.current = fetchAll;
  }, [fetchAll]);

  useEffect(() => {
    void fetchAll();
    return () => {
      clearRefreshTimer();
    };
  }, [clearRefreshTimer, fetchAll]);

  const value: AuthContextValue = {
    ...state,
    refetch: fetchAll,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
