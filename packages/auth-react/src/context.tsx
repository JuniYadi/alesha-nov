"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { AuthContextValue, AuthState, AuthApiConfig, PublicUser, AuthSession } from "./types";

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
  const config: AuthApiConfig = configProp ?? {};
  const [state, setState] = useState<AuthState>({ status: "loading", session: null, user: null });

  const fetchAll = useCallback(async () => {
    try {
      const [sessionData, meData] = await Promise.all([fetchSession(config), fetchMe(config)]);

      if (sessionData) {
        setState({ status: "authenticated", session: sessionData.session, user: meData?.user ?? null });
      } else {
        setState({ status: "unauthenticated", session: null, user: null });
      }
    } catch {
      setState({ status: "unauthenticated", session: null, user: null });
    }
  }, [config]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

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
