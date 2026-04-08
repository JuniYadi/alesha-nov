import { describe, expect, test, afterEach, vi } from "bun:test";
import { render, cleanup } from "@testing-library/react";
import { AuthGuard } from "./auth-guard";
import { AuthProvider } from "./context";
import type { ReactNode } from "react";

const mockSession = { userId: "u-1", email: "x", roles: [], exp: Math.floor(Date.now() / 1000) + 3600 };
const mockUser = { id: "u-1", email: "x", name: null, image: null, emailVerifiedAt: null, createdAt: "", roles: [] };

const originalFetch = globalThis.fetch;
let fetchMock: ReturnType<typeof vi.fn>;

function setupAuthFetch(status: "authenticated" | "unauthenticated" = "authenticated") {
  fetchMock = vi.fn((url: string) => {
    if (url.includes("/session")) {
      return Promise.resolve(
        new Response(
          JSON.stringify({ session: status === "authenticated" ? mockSession : {} }),
          { status: status === "authenticated" ? 200 : 401, headers: { "content-type": "application/json" } }
        )
      );
    }
    if (url.includes("/me")) {
      return Promise.resolve(
        new Response(
          JSON.stringify({ user: status === "authenticated" ? mockUser : null }),
          { status: status === "authenticated" ? 200 : 401, headers: { "content-type": "application/json" } }
        )
      );
    }
    return Promise.resolve(new Response("{}", { status: 200 }));
  });
  Object.defineProperty(globalThis, "fetch", { value: fetchMock, writable: true, configurable: true });
}

function LoadingProvider({ children }: { children: ReactNode }) {
  // Never resolving fetch to keep status=loading
  Object.defineProperty(globalThis, "fetch", {
    value: () => new Promise(() => {}),
    writable: true,
    configurable: true,
  });
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}

describe("AuthGuard", () => {
  afterEach(() => {
    cleanup();
    Object.defineProperty(globalThis, "fetch", { value: originalFetch, writable: true, configurable: true });
  });

  test("renders null when loading and no fallback provided", async () => {
    const { container } = render(
      <LoadingProvider>
        <AuthGuard children={<div>secret content</div>} />
      </LoadingProvider>
    );
    expect(container.textContent).toBe("");
  });

  test("renders fallback when loading and fallback is provided", async () => {
    const { container } = render(
      <LoadingProvider>
        <AuthGuard
          children={<div>secret content</div>}
          fallback={<div>loading...</div>}
        />
      </LoadingProvider>
    );
    expect(container.textContent).toBe("loading...");
  });

  test("renders null when unauthenticated", async () => {
    setupAuthFetch("unauthenticated");
    const { container } = render(
      <AuthProvider>
        <AuthGuard children={<div>secret content</div>} />
      </AuthProvider>
    );
    await new Promise((r) => setTimeout(r, 50));
    expect(container.textContent).toBe("");
  });

  test("renders children when authenticated", async () => {
    setupAuthFetch("authenticated");
    const { container } = render(
      <AuthProvider>
        <AuthGuard children={<div>authenticated content</div>} />
      </AuthProvider>
    );
    await new Promise((r) => setTimeout(r, 50));
    expect(container.textContent).toBe("authenticated content");
  });

  test("renders fallback over children when authenticated and fallback provided", async () => {
    // When authenticated, fallback is not used — children are shown
    setupAuthFetch("authenticated");
    const { container } = render(
      <AuthProvider>
        <AuthGuard
          children={<div>authenticated content</div>}
          fallback={<div>loading...</div>}
        />
      </AuthProvider>
    );
    await new Promise((r) => setTimeout(r, 50));
    expect(container.textContent).toBe("authenticated content");
  });
});
