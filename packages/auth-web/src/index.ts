import {
  type AuthService,
  type AuthUser,
  type LinkOAuthAccountInput,
  type LoginInput,
  type OAuthLoginInput,
  type OAuthProvider,
  type SignupInput,
} from "@alesha-nov/auth";
import { createHmac, timingSafeEqual } from "node:crypto";

export interface AuthWebOptions {
  authService: AuthService;
  sessionSecret: string;
  basePath?: string;
  cookieName?: string;
  sessionTtlSeconds?: number;
  secureCookie?: boolean;
}

export interface AuthSession {
  userId: string;
  email: string;
  roles: string[];
  exp: number;
}

export interface AuthRouteHandlers {
  handleRequest(request: Request): Promise<Response>;
}

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
};

function normalizeBasePath(basePath?: string): string {
  if (!basePath) return "/auth";
  const path = basePath.startsWith("/") ? basePath : `/${basePath}`;
  return path.endsWith("/") ? path.slice(0, -1) : path;
}

function b64url(input: string | Buffer): string {
  const text = Buffer.isBuffer(input) ? input.toString("base64") : Buffer.from(input, "utf-8").toString("base64");
  return text.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64urlDecode(input: string): string {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(base64, "base64").toString("utf-8");
}

function sign(payload: string, secret: string): string {
  return b64url(createHmac("sha256", secret).update(payload).digest());
}

function createSessionToken(session: AuthSession, secret: string): string {
  const payload = b64url(JSON.stringify(session));
  const sig = sign(payload, secret);
  return `${payload}.${sig}`;
}

function verifySessionToken(token: string, secret: string): AuthSession | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;

  const expectedSig = sign(payload, secret);
  const sigOk = timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig));
  if (!sigOk) return null;

  const parsed = JSON.parse(b64urlDecode(payload)) as AuthSession;
  if (!parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) return null;
  return parsed;
}

function serializeCookie(name: string, value: string, options: { maxAge?: number; secure?: boolean }): string {
  const parts = [`${name}=${value}`, "Path=/", "HttpOnly", "SameSite=Lax"];

  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`);
  }
  if (options.secure) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

function parseCookies(request: Request): Record<string, string> {
  const raw = request.headers.get("cookie");
  if (!raw) return {};

  const out: Record<string, string> = {};
  for (const item of raw.split(";")) {
    const [k, ...rest] = item.trim().split("=");
    if (!k || rest.length === 0) continue;
    out[k] = rest.join("=");
  }
  return out;
}

async function safeJson<T = Record<string, unknown>>(request: Request): Promise<T> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error("Expected application/json body");
  }

  return (await request.json()) as T;
}

function json(status: number, body: unknown, extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...JSON_HEADERS,
      ...(extraHeaders ?? {}),
    },
  });
}

function toPublicUser(user: AuthUser): Omit<AuthUser, "passwordHash"> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...rest } = user;
  return rest;
}

export function createAuthWeb(options: AuthWebOptions): AuthRouteHandlers {
  const basePath = normalizeBasePath(options.basePath);
  const cookieName = options.cookieName ?? "alesha_auth";
  const sessionTtlSeconds = options.sessionTtlSeconds ?? 60 * 60 * 24 * 7;
  const secureCookie = options.secureCookie ?? true;

  if (!options.sessionSecret || options.sessionSecret.length < 16) {
    throw new Error("sessionSecret is required and should be at least 16 chars");
  }

  function newSession(user: Omit<AuthUser, "passwordHash">): AuthSession {
    return {
      userId: user.id,
      email: user.email,
      roles: user.roles,
      exp: Math.floor(Date.now() / 1000) + sessionTtlSeconds,
    };
  }

  function sessionCookieValue(session: AuthSession): string {
    return createSessionToken(session, options.sessionSecret);
  }

  function getSessionFromRequest(request: Request): AuthSession | null {
    const cookies = parseCookies(request);
    const token = cookies[cookieName];
    if (!token) return null;
    return verifySessionToken(token, options.sessionSecret);
  }

  async function authenticateFromSession(request: Request): Promise<AuthSession> {
    const session = getSessionFromRequest(request);
    if (!session) {
      throw new Error("Unauthorized");
    }
    return session;
  }

  async function route(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      if (!url.pathname.startsWith(basePath)) {
        return json(404, { error: "Not found" });
      }

      const method = request.method.toUpperCase();
      const subPath = (url.pathname.slice(basePath.length) || "/").replace(/\/+$/, "") || "/";

      if (method === "POST" && subPath === "/signup") {
        const body = await safeJson<SignupInput>(request);
        const user = await options.authService.signup(body);
        const publicUser = toPublicUser(user);
        const session = newSession(publicUser);

        return json(200, { user: publicUser }, {
          "set-cookie": serializeCookie(cookieName, sessionCookieValue(session), {
            maxAge: sessionTtlSeconds,
            secure: secureCookie,
          }),
        });
      }

      if (method === "POST" && subPath === "/login") {
        const body = await safeJson<LoginInput>(request);
        const user = await options.authService.login(body);
        if (!user) return json(401, { error: "Invalid credentials" });

        const publicUser = toPublicUser(user);
        const session = newSession(publicUser);
        return json(200, { user: publicUser }, {
          "set-cookie": serializeCookie(cookieName, sessionCookieValue(session), {
            maxAge: sessionTtlSeconds,
            secure: secureCookie,
          }),
        });
      }

      if (method === "POST" && subPath === "/logout") {
        return json(200, { ok: true }, {
          "set-cookie": serializeCookie(cookieName, "", {
            maxAge: 0,
            secure: secureCookie,
          }),
        });
      }

      if (method === "GET" && subPath === "/session") {
        const session = getSessionFromRequest(request);
        if (!session) return json(401, { error: "Unauthorized" });
        return json(200, { session });
      }

      if (method === "POST" && subPath === "/magic-link/request") {
        const body = await safeJson<{ email: string; ttlSeconds?: number }>(request);
        const token = await options.authService.issueMagicLinkToken({
          email: body.email,
          ttlSeconds: body.ttlSeconds,
        });

        return json(200, { token });
      }

      if (method === "POST" && subPath === "/magic-link/verify") {
        const body = await safeJson<{ token: string }>(request);
        const user = await options.authService.verifyMagicLinkToken(body.token);
        if (!user) return json(401, { error: "Invalid or expired token" });

        const publicUser = toPublicUser(user);
        const session = newSession(publicUser);

        return json(200, { user: publicUser }, {
          "set-cookie": serializeCookie(cookieName, sessionCookieValue(session), {
            maxAge: sessionTtlSeconds,
            secure: secureCookie,
          }),
        });
      }

      if (method === "POST" && subPath.startsWith("/oauth/") && subPath.endsWith("/login")) {
        const provider = subPath.split("/")[2] as OAuthProvider;
        const body = await safeJson<Omit<OAuthLoginInput, "provider">>(request);

        const user = await options.authService.loginWithOAuth({
          provider,
          providerAccountId: body.providerAccountId,
          email: body.email,
          name: body.name,
          image: body.image,
          emailVerified: body.emailVerified,
          roles: body.roles,
        });

        const publicUser = toPublicUser(user);
        const session = newSession(publicUser);

        return json(200, { user: publicUser }, {
          "set-cookie": serializeCookie(cookieName, sessionCookieValue(session), {
            maxAge: sessionTtlSeconds,
            secure: secureCookie,
          }),
        });
      }

      if (method === "POST" && subPath.startsWith("/oauth/") && subPath.endsWith("/link")) {
        const provider = subPath.split("/")[2] as OAuthProvider;
        const current = await authenticateFromSession(request);
        const body = await safeJson<Omit<LinkOAuthAccountInput, "provider" | "userId">>(request);

        const linked = await options.authService.linkOAuthAccount({
          userId: current.userId,
          provider,
          providerAccountId: body.providerAccountId,
          providerEmail: body.providerEmail,
        });

        return json(200, { account: linked });
      }

      if (method === "GET" && subPath === "/linked-accounts") {
        const current = await authenticateFromSession(request);
        const linked = await options.authService.getLinkedAccounts(current.userId);
        return json(200, { accounts: linked });
      }

      if (method === "PUT" && subPath === "/roles") {
        const current = await authenticateFromSession(request);
        const body = await safeJson<{ userId?: string; roles: string[] }>(request);
        const targetUserId = body.userId ?? current.userId;

        if (targetUserId !== current.userId && !current.roles.includes("support.write") && !current.roles.includes("billing.write")) {
          return json(403, { error: "Forbidden" });
        }

        const roles = await options.authService.setUserRoles(targetUserId, body.roles ?? []);
        return json(200, { userId: targetUserId, roles });
      }

      return json(404, { error: "Not found" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal error";
      const status = message === "Unauthorized" ? 401 : 400;
      return json(status, { error: message });
    }
  }

  return {
    handleRequest: route,
  };
}

export async function getSessionFromRequest(request: Request, sessionSecret: string, cookieName = "alesha_auth"): Promise<AuthSession | null> {
  const cookies = parseCookies(request);
  const token = cookies[cookieName];
  if (!token) return null;
  return verifySessionToken(token, sessionSecret);
}
