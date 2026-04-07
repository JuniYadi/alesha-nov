"use client";

import { useCallback, useEffect, useState } from "react";
import type { AuthApiConfig, LoginInput, SignupInput, PublicUser, OAuthProvider } from "./types";
import { useAuth } from "./context";

function buildUrl(path: string, config: AuthApiConfig): string {
  const basePath = config.basePath ?? "/auth";
  if (config.baseUrl) {
    return `${config.baseUrl.replace(/\/+$/, "")}${basePath}${path}`;
  }
  return `${basePath}${path}`;
}

async function postJson<T>(path: string, body: unknown, config: AuthApiConfig): Promise<T> {
  const res = await fetch(buildUrl(path, config), {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let errMsg = "Request failed";
    try {
      const err = await res.json();
      errMsg = err.error ?? res.statusText;
    } catch {
      errMsg = res.statusText || "Request failed";
    }
    throw new Error(errMsg);
  }

  return res.json() as Promise<T>;
}

export function useSignup(config: AuthApiConfig = {}) {
  const auth = useAuth();
  const [data, setData] = useState<PublicUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const signup = useCallback(
    async (input: SignupInput) => {
      setLoading(true);
      setError(null);
      try {
        const res = await postJson<{ user: PublicUser }>("/signup", input, config);
        setData(res.user);
        await auth.refetch();
        return res.user;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Signup failed";
        setError(msg);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [auth, config],
  );

  return { signup, data, error, loading };
}

export function useLogin(config: AuthApiConfig = {}) {
  const auth = useAuth();
  const [data, setData] = useState<PublicUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const login = useCallback(
    async (input: LoginInput) => {
      setLoading(true);
      setError(null);
      try {
        const res = await postJson<{ user: PublicUser }>("/login", input, config);
        setData(res.user);
        await auth.refetch();
        return res.user;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Login failed";
        setError(msg);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [auth, config],
  );

  return { login, data, error, loading };
}

export function useLogout(config: AuthApiConfig = {}) {
  const auth = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logout = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await postJson<Record<string, unknown>>("/logout", {}, config);
      await auth.refetch();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Logout failed";
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [auth, config]);

  return { logout, loading, error };
}

export function usePasswordResetRequest(config: AuthApiConfig = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const request = useCallback(
    async (email: string) => {
      setLoading(true);
      setError(null);
      setSent(false);
      try {
        await postJson("/password-reset/request", { email }, config);
        setSent(true);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Request failed";
        setError(msg);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [config],
  );

  return { request, loading, error, sent };
}

export function useResetPassword(config: AuthApiConfig = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const reset = useCallback(
    async (token: string, newPassword: string) => {
      setLoading(true);
      setError(null);
      setSuccess(false);
      try {
        await postJson("/password-reset/reset", { token, newPassword }, config);
        setSuccess(true);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Reset failed";
        setError(msg);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [config],
  );

  return { reset, loading, error, success };
}

export function useOAuthLogin(config: AuthApiConfig = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(
    (provider: OAuthProvider) => {
      setLoading(true);
      setError(null);
      try {
        const location = buildUrl(`/oauth/${provider}/authorize`, config);
        window.location.assign(location);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "OAuth login redirect failed";
        setError(msg);
        setLoading(false);
        throw e;
      }
    },
    [config],
  );

  return { login, loading, error };
}

export function useAuthGuard({ redirectTo }: { redirectTo?: string } = {}) {
  const { status } = useAuth();

  useEffect(() => {
    if (status === "unauthenticated" && redirectTo) {
      window.location.href = redirectTo;
    }
  }, [status, redirectTo]);

  return {
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
  };
}
