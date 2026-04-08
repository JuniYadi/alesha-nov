import { describe, expect, test, beforeEach, afterEach, vi } from "bun:test";
import { act, render, renderHook, cleanup } from "@testing-library/react";
// import { createRoot } from "react-dom/client";
import { AuthProvider, useAuth, AuthContext } from "./context";
import type { AuthSession, PublicUser } from "./types";

const mockSession: AuthSession = {
  userId: "u-1",
  email: "user@example.com",
  roles: ["admin"],
  exp: Math.floor(Date.now() / 1000) + 3600,
};

const mockUser: PublicUser = {
  id: "u-1",
  email: "user@example.com",
  name: "Test User",
  image: null,
  emailVerifiedAt: null,
  createdAt: "2024-01-01T00:00:00.000Z",
  roles: ["admin"],
};

// Track fetch calls for assertion
const fetchCalls: Array<{ url: string; options?: RequestInit }> = [];
let fetchMock: typeof fetch;

function setupFetch() {
  fetchCalls.length = 0;
  fetchMock = vi.fn((url: string, options?: RequestInit) => {
    fetchCalls.push({ url, options });
    return Promise.resolve(new Response("{}", { status: 200, headers: { "content-type": "application/json" } })) as unknown as ReturnType<typeof fetch>;
  });
  Object.defineProperty(globalThis, "fetch", { value: fetchMock, writable: true, configurable: true });
}

function restoreFetch() {
  if (fetchMock) {
    Object.defineProperty(globalThis, "fetch", { value: fetchMock, writable: true, configurable: true });
  }
}

function DummyChild() {
  const auth = useAuth();
  return (
    <div data-testid="auth-status">{auth.status}</div>
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    setupFetch();
  });

  afterEach(() => {
    cleanup();
    restoreFetch();
  });

  test("starts in loading state", async () => {
    fetchMock.mockImplementation(() => new Promise(() => {})); // never resolves

    const { container } = render(
      <AuthProvider>
        <DummyChild />
      </AuthProvider>
    );

    expect(container.textContent).toBe("loading");

    // Clean up by restoring a working fetch for cleanup
    Object.defineProperty(globalThis, "fetch", { value: () => new Promise(() => {}), writable: true, configurable: true });
  });

  test("transitions to authenticated when session fetch succeeds", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes("/session")) {
        return Promise.resolve(
          new Response(JSON.stringify({ session: mockSession }), {
            status: 200,
            headers: { "content-type": "application/json" },
          })
        );
      }
      if (url.includes("/me")) {
        return Promise.resolve(
          new Response(JSON.stringify({ user: mockUser }), {
            status: 200,
            headers: { "content-type": "application/json" },
          })
        );
      }
      return Promise.resolve(new Response("{}", { status: 200 }));
    });

    const { findByTestId } = render(
      <AuthProvider>
        <DummyChild />
      </AuthProvider>
    );

    const status = await findByTestId("auth-status");
    expect(status.textContent).toBe("authenticated");
  });

  test("transitions to unauthenticated when session fetch returns non-ok", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes("/session") || url.includes("/me")) {
        return Promise.resolve(new Response(null, { status: 401 }));
      }
      return Promise.resolve(new Response("{}", { status: 200 }));
    });

    const { findByTestId } = render(
      <AuthProvider>
        <DummyChild />
      </AuthProvider>
    );

    const status = await findByTestId("auth-status");
    expect(status.textContent).toBe("unauthenticated");
  });

  test("transitions to unauthenticated when session fetch throws", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes("/session") || url.includes("/me")) {
        return Promise.reject(new Error("Network error"));
      }
      return Promise.resolve(new Response("{}", { status: 200 }));
    });

    const { findByTestId } = render(
      <AuthProvider>
        <DummyChild />
      </AuthProvider>
    );

    const status = await findByTestId("auth-status");
    expect(status.textContent).toBe("unauthenticated");
  });

  test("refetch function is available in context value", () => {
    let refetchFn: () => Promise<void> = () => Promise.resolve();

    function CaptureRefetcher() {
      const auth = useAuth();
      refetchFn = auth.refetch;
      return null;
    }

    render(
      <AuthProvider>
        <CaptureRefetcher />
      </AuthProvider>
    );

    expect(typeof refetchFn).toBe("function");
  });

  test("builds correct URLs with custom baseUrl and basePath", async () => {
    const requestedUrls: string[] = [];
    fetchMock.mockImplementation((url: string) => {
      requestedUrls.push(url);
      if (url.includes("/session")) {
        return Promise.resolve(
          new Response(JSON.stringify({ session: mockSession }), {
            status: 200,
            headers: { "content-type": "application/json" },
          })
        );
      }
      if (url.includes("/me")) {
        return Promise.resolve(
          new Response(JSON.stringify({ user: mockUser }), {
            status: 200,
            headers: { "content-type": "application/json" },
          })
        );
      }
      return Promise.resolve(new Response("{}", { status: 200 }));
    });

    render(
      <AuthProvider config={{ baseUrl: "https://example.com", basePath: "/api/auth" }}>
        <DummyChild />
      </AuthProvider>
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });

    expect(requestedUrls.some((u) => u.includes("https://example.com/api/auth/session"))).toBe(true);
    expect(requestedUrls.some((u) => u.includes("https://example.com/api/auth/me"))).toBe(true);
  });

  test("schedules immediate refetch when session is already within refresh buffer", async () => {
    const nearExpirySession: AuthSession = {
      ...mockSession,
      exp: Math.floor(Date.now() / 1000) + 1,
    };

    let sessionCalls = 0;
    fetchMock.mockImplementation((url: string) => {
      if (url.includes("/session")) {
        sessionCalls += 1;
        return Promise.resolve(
          new Response(JSON.stringify({ session: nearExpirySession }), {
            status: 200,
            headers: { "content-type": "application/json" },
          })
        );
      }
      if (url.includes("/me")) {
        return Promise.resolve(
          new Response(JSON.stringify({ user: mockUser }), {
            status: 200,
            headers: { "content-type": "application/json" },
          })
        );
      }
      return Promise.resolve(new Response("{}", { status: 200 }));
    });

    render(
      <AuthProvider config={{ sessionRefreshBufferSeconds: 30 }}>
        <DummyChild />
      </AuthProvider>
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(sessionCalls).toBeGreaterThan(1);
  });

  test("useAuth throws when used outside provider", () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      renderHook(() => useAuth());
    }).toThrow("useAuth must be used within an AuthProvider");

    consoleSpy.mockRestore();
  });

  test("AuthContext has correct $$typeof symbol", () => {
    expect(AuthContext.$$typeof).toBe(Symbol.for("react.context"));
  });
});
