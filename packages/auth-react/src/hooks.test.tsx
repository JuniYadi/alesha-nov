import { describe, expect, test, beforeEach, afterEach, vi, type Mock } from "bun:test";
import { act, renderHook, cleanup } from "@testing-library/react";
import { useLogin, useSignup, useLogout, usePasswordResetRequest, useResetPassword } from "./hooks";
import { useAuth } from "./context";
import type { PublicUser, AuthContextValue } from "./types";

// Mock the context
vi.mock("./context", () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const mockUser: PublicUser = {
  id: "u-1",
  email: "user@example.com",
  name: "Test User",
  image: null,
  emailVerifiedAt: null,
  createdAt: "2024-01-01T00:00:00.000Z",
  roles: ["admin"],
};

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
    }
    return new Response(JSON.stringify({}), { status: 404 });
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe("useLogin", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  const refetchMock = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    fetchMock = setupFetch();
    (useAuth as Mock<() => AuthContextValue>).mockReturnValue({
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
    const { result } = renderHook(() => useLogin());
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.data).toBe(null);
  });

  test("successful login sets data and calls refetch", async () => {
    const { result } = renderHook(() => useLogin());

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

    const { result } = renderHook(() => useLogin());

    await act(async () => {
      try {
        await result.current.login({ email: "bad@example.com", password: "wrong" });
      } catch { /* ignore */ }
    });

    expect(result.current.error).toBe("Invalid credentials");
    expect(result.current.data).toBe(null);
    expect(result.current.loading).toBe(false);
    expect(refetchMock).not.toHaveBeenCalled();
  });
});

describe("useSignup", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  const refetchMock = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    fetchMock = setupFetch();
    (useAuth as Mock<() => AuthContextValue>).mockReturnValue({
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
    const { result } = renderHook(() => useSignup());
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.data).toBe(null);
  });

  test("successful signup sets data and calls refetch", async () => {
    const { result } = renderHook(() => useSignup());

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

    const { result } = renderHook(() => useSignup());

    await act(async () => {
      try {
        await result.current.signup({ email: "existing@example.com", password: "password123" });
      } catch { /* ignore */ }
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
    (useAuth as Mock<() => AuthContextValue>).mockReturnValue({
      status: "authenticated",
      user: mockUser,
      session: { id: "s-1", userId: "u-1", expiresAt: "" },
      refetch: refetchMock,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test("initial state", () => {
    const { result } = renderHook(() => useLogout());
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  test("successful logout calls refetch", async () => {
    const { result } = renderHook(() => useLogout());

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

    const { result } = renderHook(() => useLogout());

    await act(async () => {
      try {
        await result.current.logout();
      } catch { /* ignore */ }
    });

    expect(result.current.error).toBe("Logout failed");
    expect(refetchMock).not.toHaveBeenCalled();
  });
});

describe("usePasswordResetRequest", () => {
  beforeEach(() => {
    setupFetch();
    (useAuth as Mock<() => AuthContextValue>).mockReturnValue({
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
    const { result } = renderHook(() => usePasswordResetRequest());

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

    const { result } = renderHook(() => usePasswordResetRequest());

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
    (useAuth as Mock<() => AuthContextValue>).mockReturnValue({
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
    const { result } = renderHook(() => useResetPassword());

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

    const { result } = renderHook(() => useResetPassword());

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
