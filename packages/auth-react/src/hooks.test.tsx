import { describe, expect, test, beforeEach, afterEach, vi } from "bun:test";
import { act, renderHook as renderHookBase, cleanup, waitFor } from "@testing-library/react";
import { type ReactNode } from "react";
import { AuthContext, type AuthContextValue } from "./context";
import {
  useLogin,
  useSignup,
  useLogout,
  usePasswordResetRequest,
  useResetPassword,
  useMagicLinkRequest,
  useMagicLinkVerify,
  useOAuthLogin,
  useOAuthLink,
  useAuthGuard,
} from "./hooks";
import type { OAuthAccountLinkInput, PublicUser } from "./types";

beforeEach(() => {
  vi.clearAllMocks();
});

const mockUser: PublicUser = {
  id: "u-1",
  email: "user@example.com",
  name: "Test User",
  image: null,
  emailVerifiedAt: null,
  createdAt: "2024-01-01T00:00:00.000Z",
  roles: ["admin"],
};

const makeAuthContext = (value?: Partial<AuthContextValue>): AuthContextValue => ({
  status: value?.status ?? "unauthenticated",
  user: value?.user ?? null,
  session: value?.session ?? null,
  refetch: value?.refetch ?? vi.fn().mockResolvedValue(undefined),
});

let authContextValue: AuthContextValue = makeAuthContext();

function setAuthContext(value?: Partial<AuthContextValue>) {
  authContextValue = makeAuthContext(value);
}

function AuthContextProviderWrapper({ children }: { children: ReactNode }) {
  return <AuthContext.Provider value={authContextValue}>{children}</AuthContext.Provider>;
}

function renderHookWithAuth<T>(callback: () => T) {
  return renderHookBase(callback, { wrapper: AuthContextProviderWrapper });
}

function setupFetch() {
  const fetchMock = vi.fn(async (url: string, options?: RequestInit) => {
    if (options?.method === "POST") {
      if (url.includes("/login")) {
        return new Response(JSON.stringify({ user: mockUser }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (url.includes("/signup")) {
        return new Response(JSON.stringify({ user: { ...mockUser, id: "u-2", email: "new@example.com" } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (url.includes("/logout")) {
        return new Response("{}", {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (url.includes("/password-reset/request")) {
        return new Response(JSON.stringify({ token: "reset-token" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (url.includes("/password-reset/reset")) {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (url.includes("/magic-link/request")) {
        return new Response(JSON.stringify({ token: "magic-token" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (url.includes("/magic-link/verify")) {
        return new Response(JSON.stringify({ user: mockUser }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (url.includes("/oauth/google/link") || url.includes("/oauth/github/link")) {
        const requestBody = options?.body
          ? (JSON.parse(options.body as string) as Partial<OAuthAccountLinkInput>)
          : ({} as Partial<OAuthAccountLinkInput>);
        return new Response(
          JSON.stringify({
            account: {
              id: "acct-1",
              userId: "u-1",
              provider: url.includes("/oauth/google/") ? "google" : "github",
              providerAccountId: requestBody.providerAccountId ?? "provider-acc",
              providerEmail: requestBody.providerEmail ?? null,
              createdAt: "2024-01-01T00:00:00.000Z",
              updatedAt: "2024-01-01T00:00:00.000Z",
            },
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      }
    }
    return new Response(JSON.stringify({}), { status: 404 });
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

const originalFetch = globalThis.fetch;

afterEach(() => {
  Object.defineProperty(globalThis, "fetch", { value: originalFetch, writable: true, configurable: true });
  vi.restoreAllMocks();
});

describe("useLogin", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  const refetchMock = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    fetchMock = setupFetch();
    setAuthContext({
      status: "unauthenticated",
      user: null,
      session: null,
      refetch: refetchMock,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test("initial state has loading=false, error=null, data=null", () => {
    const { result } = renderHookWithAuth(() => useLogin());
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.data).toBe(null);
  });

  test("successful login sets data and calls refetch", async () => {
    const { result } = renderHookWithAuth(() => useLogin());

    await act(async () => {
      await result.current.login({ email: "user@example.com", password: "password123" });
    });

    expect(result.current.data).toEqual(mockUser);
    expect(result.current.error).toBe(null);
    expect(result.current.loading).toBe(false);
    expect(refetchMock).toHaveBeenCalled();
  });

  test("failed login sets error", async () => {
    fetchMock.mockImplementation(async (url: string, options?: RequestInit) => {
      if (options?.method === "POST" && url.includes("/login")) {
        return new Response(JSON.stringify({ error: "Invalid credentials" }), {
          status: 401,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(JSON.stringify({}), { status: 401 });
    });

    const { result } = renderHookWithAuth(() => useLogin());

    await act(async () => {
      try {
        await result.current.login({ email: "bad@example.com", password: "wrong" });
      } catch {
        // ignore
      }
    });

    expect(result.current.error).toBe("Invalid credentials");
    expect(result.current.data).toBe(null);
    expect(result.current.loading).toBe(false);
    expect(refetchMock).not.toHaveBeenCalled();
  });

  test("failed login with non-json error uses statusText fallback", async () => {
    fetchMock.mockImplementation(async (url: string, options?: RequestInit) => {
      if (options?.method === "POST" && url.includes("/login")) {
        return new Response("internal error", {
          status: 500,
          statusText: "Server Error",
          headers: { "content-type": "text/plain" },
        });
      }
      return new Response("", { status: 404 });
    });

    const { result } = renderHookWithAuth(() => useLogin());

    await act(async () => {
      try {
        await result.current.login({ email: "user@example.com", password: "bad-pass" });
      } catch {
        // ignore
      }
    });

    expect(result.current.error).toBe("Server Error");
    expect(result.current.loading).toBe(false);
  });
});

describe("useSignup", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  const refetchMock = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    fetchMock = setupFetch();
    setAuthContext({
      status: "unauthenticated",
      user: null,
      session: null,
      refetch: refetchMock,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test("initial state", () => {
    const { result } = renderHookWithAuth(() => useSignup());
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.data).toBe(null);
  });

  test("successful signup sets data and calls refetch", async () => {
    const { result } = renderHookWithAuth(() => useSignup());

    await act(async () => {
      await result.current.signup({ email: "new@example.com", password: "password123" });
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.email).toBe("new@example.com");
    expect(result.current.error).toBe(null);
    expect(result.current.loading).toBe(false);
    expect(refetchMock).toHaveBeenCalled();
  });

  test("failed signup sets error", async () => {
    fetchMock.mockImplementation(async (url: string, options?: RequestInit) => {
      if (options?.method === "POST" && url.includes("/signup")) {
        return new Response(JSON.stringify({ error: "Email already in use" }), {
          status: 409,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(null, { status: 401 });
    });

    const { result } = renderHookWithAuth(() => useSignup());

    await act(async () => {
      try {
        await result.current.signup({ email: "existing@example.com", password: "password123" });
      } catch {
        // ignore
      }
    });

    expect(result.current.error).toBe("Email already in use");
    expect(result.current.data).toBe(null);
    expect(refetchMock).not.toHaveBeenCalled();
  });
});

describe("useLogout", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  const refetchMock = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    fetchMock = setupFetch();
    setAuthContext({
      status: "authenticated",
      user: mockUser,
      session: { userId: "u-1", email: "user@example.com", roles: ["admin"], exp: 9999999999 },
      refetch: refetchMock,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test("initial state", () => {
    const { result } = renderHookWithAuth(() => useLogout());
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  test("successful logout calls refetch", async () => {
    const { result } = renderHookWithAuth(() => useLogout());

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.error).toBe(null);
    expect(result.current.loading).toBe(false);
    expect(refetchMock).toHaveBeenCalled();
  });

  test("failed logout sets error", async () => {
    fetchMock.mockImplementation(async (url: string, options?: RequestInit) => {
      if (options?.method === "POST" && url.includes("/logout")) {
        return new Response(JSON.stringify({ error: "Logout failed" }), {
          status: 500,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(null, { status: 401 });
    });

    const { result } = renderHookWithAuth(() => useLogout());

    await act(async () => {
      try {
        await result.current.logout();
      } catch {
        // ignore
      }
    });

    expect(result.current.error).toBe("Logout failed");
    expect(refetchMock).not.toHaveBeenCalled();
  });
});

describe("usePasswordResetRequest", () => {
  beforeEach(() => {
    setupFetch();
    setAuthContext({
      status: "unauthenticated",
      user: null,
      session: null,
      refetch: vi.fn().mockResolvedValue(undefined),
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test("successful request sets sent=true", async () => {
    const { result } = renderHookWithAuth(() => usePasswordResetRequest());

    await act(async () => {
      await result.current.request("user@example.com");
    });

    expect(result.current.sent).toBe(true);
    expect(result.current.error).toBe(null);
    expect(result.current.loading).toBe(false);
  });

  test("failed request sets error", async () => {
    globalThis.fetch = vi.fn(async (url: string, options?: RequestInit) => {
      if (options?.method === "POST" && url.includes("/password-reset/request")) {
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 400,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(null, { status: 404 });
    }) as unknown as typeof fetch;

    const { result } = renderHookWithAuth(() => usePasswordResetRequest());

    await act(async () => {
      try {
        await result.current.request("missing@example.com");
      } catch {
        // ignore
      }
    });

    expect(result.current.sent).toBe(false);
    expect(result.current.error).toBe("User not found");
  });
});

describe("useResetPassword", () => {
  beforeEach(() => {
    setupFetch();
    setAuthContext({
      status: "unauthenticated",
      user: null,
      session: null,
      refetch: vi.fn().mockResolvedValue(undefined),
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test("successful reset sets success=true", async () => {
    const { result } = renderHookWithAuth(() => useResetPassword());

    await act(async () => {
      await result.current.reset("valid-reset-token", "new-pass-123");
    });

    expect(result.current.success).toBe(true);
    expect(result.current.error).toBe(null);
    expect(result.current.loading).toBe(false);
  });

  test("failed reset sets error", async () => {
    globalThis.fetch = vi.fn(async (url: string, options?: RequestInit) => {
      if (options?.method === "POST" && url.includes("/password-reset/reset")) {
        return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
          status: 401,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(null, { status: 404 });
    }) as unknown as typeof fetch;

    const { result } = renderHookWithAuth(() => useResetPassword());

    await act(async () => {
      try {
        await result.current.reset("bad-token", "new-pass-123");
      } catch {
        // ignore
      }
    });

    expect(result.current.success).toBe(false);
    expect(result.current.error).toBe("Invalid or expired token");
  });
});

describe("useMagicLinkRequest", () => {
  beforeEach(() => {
    setupFetch();
    setAuthContext({
      status: "unauthenticated",
      user: null,
      session: null,
      refetch: vi.fn().mockResolvedValue(undefined),
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test("successful request sets sent=true and posts payload", async () => {
    const fetchSpy = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    const { result } = renderHookWithAuth(() => useMagicLinkRequest({ basePath: "/auth" }));

    await act(async () => {
      await result.current.request({ email: "user@example.com", ttlSeconds: 120 });
    });

    expect(fetchSpy).toHaveBeenCalled();
    expect(result.current.sent).toBe(true);
    expect(result.current.error).toBe(null);
    expect(result.current.loading).toBe(false);
  });

  test("failed request sets error", async () => {
    globalThis.fetch = vi.fn(async (url: string, options?: RequestInit) => {
      if (options?.method === "POST" && url.includes("/magic-link/request")) {
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 404,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(JSON.stringify({}), { status: 404 });
    }) as unknown as typeof fetch;

    const { result } = renderHookWithAuth(() => useMagicLinkRequest());

    await act(async () => {
      try {
        await result.current.request({ email: "missing@example.com" });
      } catch {
        // ignore
      }
    });

    expect(result.current.sent).toBe(false);
    expect(result.current.error).toBe("User not found");
  });
});

describe("useMagicLinkVerify", () => {
  const refetchMock = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    setupFetch();
    setAuthContext({
      status: "unauthenticated",
      user: null,
      session: null,
      refetch: refetchMock,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test("successful verify sets data and calls refetch", async () => {
    const { result } = renderHookWithAuth(() => useMagicLinkVerify());

    await act(async () => {
      await result.current.verify({ token: "magic-token" });
    });

    expect(result.current.data).toEqual(mockUser);
    expect(result.current.error).toBe(null);
    expect(result.current.loading).toBe(false);
    expect(refetchMock).toHaveBeenCalled();
  });

  test("failed verify sets error", async () => {
    globalThis.fetch = vi.fn(async (url: string, options?: RequestInit) => {
      if (options?.method === "POST" && url.includes("/magic-link/verify")) {
        return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
          status: 401,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(JSON.stringify({}), { status: 404 });
    }) as unknown as typeof fetch;

    const { result } = renderHookWithAuth(() => useMagicLinkVerify());

    await act(async () => {
      try {
        await result.current.verify({ token: "bad-token" });
      } catch {
        // ignore
      }
    });

    expect(result.current.data).toBe(null);
    expect(result.current.error).toBe("Invalid or expired token");
    expect(refetchMock).not.toHaveBeenCalled();
  });
});

describe("useOAuthLogin", () => {
  beforeEach(() => {
    setupFetch();
    setAuthContext({
      status: "unauthenticated",
      user: null,
      session: null,
      refetch: vi.fn().mockResolvedValue(undefined),
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test("redirects browser to oauth authorize endpoint", () => {
    const assignSpy = vi.spyOn(window.location, "assign").mockImplementation(() => undefined);

    const { result } = renderHookWithAuth(() => useOAuthLogin({ basePath: "/auth" }));

    act(() => {
      result.current.login("google");
    });

    expect(assignSpy).toHaveBeenCalledWith("/auth/oauth/google/authorize");
    expect(result.current.error).toBe(null);
    expect(result.current.loading).toBe(true);

    assignSpy.mockRestore();
  });

  test("handles assign errors and resets loading", () => {
    const assignSpy = vi.spyOn(window.location, "assign").mockImplementation(() => {
      throw new Error("redirect failed");
    });

    const { result } = renderHookWithAuth(() => useOAuthLogin({ basePath: "/auth" }));

    act(() => {
      try {
        result.current.login("github");
      } catch {
        // expected
      }
    });

    expect(result.current.loading).toBe(false);

    assignSpy.mockRestore();
  });

});

describe("useOAuthLink", () => {
  beforeEach(() => {
    setupFetch();
    setAuthContext({
      status: "authenticated",
      user: mockUser,
      session: { userId: "u-1", email: "user@example.com", roles: ["admin"], exp: 9999999999 },
      refetch: vi.fn().mockResolvedValue(undefined),
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test("successful link posts payload and sets data", async () => {
    const fetchSpy = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    const { result } = renderHookWithAuth(() => useOAuthLink({ basePath: "/auth" }));

    await act(async () => {
      await result.current.link("google", { providerAccountId: "google-123", providerEmail: "user@gmail.com" });
    });

    expect(fetchSpy).toHaveBeenCalledWith("/auth/oauth/google/link", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ providerAccountId: "google-123", providerEmail: "user@gmail.com" }),
      credentials: "include",
      headers: { "content-type": "application/json" },
    }));
    expect(result.current.data).toMatchObject({
      id: "acct-1",
      provider: "google",
      providerAccountId: "google-123",
      providerEmail: "user@gmail.com",
    });
    expect(result.current.error).toBe(null);
    expect(result.current.loading).toBe(false);
  });

  test("throws when not authenticated without calling backend", async () => {
    const fetchSpy = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    setAuthContext({
      status: "unauthenticated",
      user: null,
      session: null,
      refetch: vi.fn().mockResolvedValue(undefined),
    });

    const { result } = renderHookWithAuth(() => useOAuthLink());

    await act(async () => {
      try {
        await result.current.link("github", { providerAccountId: "github-123" });
      } catch {
        // expected
      }
    });

    expect(result.current.error).toBe("Authentication required to link OAuth accounts");
    expect(result.current.loading).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("failed API request sets error", async () => {
    globalThis.fetch = vi.fn(async (url: string, options?: RequestInit) => {
      if (options?.method === "POST" && (url.includes("/oauth/google/link") || url.includes("/oauth/github/link"))) {
        return new Response(JSON.stringify({ error: "Provider account already linked" }), {
          status: 409,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(JSON.stringify({}), { status: 404 });
    }) as unknown as typeof fetch;

    const { result } = renderHookWithAuth(() => useOAuthLink());

    await act(async () => {
      try {
        await result.current.link("google", { providerAccountId: "google-123" });
      } catch {
        // expected
      }
    });

    expect(result.current.error).toBe("Provider account already linked");
    expect(result.current.data).toBe(null);
    expect(result.current.loading).toBe(false);
  });
});

describe("useAuthGuard", () => {
  beforeEach(() => {
    setupFetch();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test("uses navigation adapter push for unauthenticated redirects", async () => {
    const push = vi.fn();
    setAuthContext({
      status: "unauthenticated",
      user: null,
      session: null,
      refetch: vi.fn().mockResolvedValue(undefined),
    });

    renderHookWithAuth(() => useAuthGuard({ redirectTo: "/login", navigationAdapter: { push } }));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/login");
    });
  });

  test("uses navigation adapter replace when requested", async () => {
    const replace = vi.fn();
    setAuthContext({
      status: "unauthenticated",
      user: null,
      session: null,
      refetch: vi.fn().mockResolvedValue(undefined),
    });

    renderHookWithAuth(() => useAuthGuard({ redirectTo: "/login", navigationAdapter: { replace }, replace: true }));

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/login");
    });
  });

  test("falls back to window.location.assign when no adapter provided", async () => {
    setAuthContext({
      status: "unauthenticated",
      user: null,
      session: null,
      refetch: vi.fn().mockResolvedValue(undefined),
    });

    const assignSpy = vi.spyOn(window.location, "assign").mockImplementation(() => undefined);

    renderHookWithAuth(() => useAuthGuard({ redirectTo: "/login" }));

    await waitFor(() => {
      expect(assignSpy).toHaveBeenCalledWith("/login");
    });

    assignSpy.mockRestore();
  });

  test("uses adapter replace as fallback when push is missing", async () => {
    const replace = vi.fn();
    setAuthContext({
      status: "unauthenticated",
      user: null,
      session: null,
      refetch: vi.fn().mockResolvedValue(undefined),
    });

    renderHookWithAuth(() => useAuthGuard({ redirectTo: "/login", navigationAdapter: { replace } }));

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/login");
    });
  });

  test("prefers adapter push when replace flag is true but replace fn is missing", async () => {
    const push = vi.fn();
    setAuthContext({
      status: "unauthenticated",
      user: null,
      session: null,
      refetch: vi.fn().mockResolvedValue(undefined),
    });

    renderHookWithAuth(() => useAuthGuard({ redirectTo: "/login", navigationAdapter: { push }, replace: true }));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/login");
    });
  });

  test("uses custom baseUrl for oauth redirect", () => {
    const assignSpy = vi.spyOn(window.location, "assign").mockImplementation(() => undefined);
    setAuthContext({
      status: "unauthenticated",
      user: null,
      session: null,
      refetch: vi.fn().mockResolvedValue(undefined),
    });

    const { result } = renderHookWithAuth(() => useOAuthLogin({ baseUrl: "https://api.example.com/", basePath: "/auth" }));

    act(() => {
      result.current.login("github");
    });

    expect(assignSpy).toHaveBeenCalledWith("https://api.example.com/auth/oauth/github/authorize");
    assignSpy.mockRestore();
  });

  test("returns loading/authenticated flags from context status", () => {
    setAuthContext({
      status: "authenticated",
      user: mockUser,
      session: { userId: "u-1", email: "user@example.com", roles: ["admin"], exp: 9999999999 },
      refetch: vi.fn().mockResolvedValue(undefined),
    });

    const { result } = renderHookWithAuth(() => useAuthGuard({ redirectTo: "/login" }));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isAuthenticated).toBe(true);
  });
});
