import {
  type AuthService,
  type AuthUser,
  type LinkOAuthAccountInput,
  type LoginInput,
  type OAuthLoginInput,
  type OAuthProvider,
  type SignupInput,
} from "@alesha-nov/auth";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export interface OAuthCallbackProfile {
  providerAccountId: string;
  email: string;
  name?: string;
  image?: string;
  emailVerified?: boolean;
  roles?: string[];
}

export interface AuthWebOptions {
  authService: AuthService;
  sessionSecret: string;
  basePath?: string;
  cookieName?: string;
  sessionTtlSeconds?: number;
  secureCookie?: boolean;
  /* Optional: resolve a user by ID for GET /me. */
  getUser?: (userId: string) => Promise<AuthUser | null>;
  /* Optional: build provider authorize URL for GET /oauth/:provider/authorize. */
  getOAuthAuthorizeUrl?: (input: {
    provider: OAuthProvider;
    state: string;
    redirectUri: string;
    request: Request;
  }) => string | Promise<string>;
  /* Optional: exchange callback params into OAuth identity profile. */
  completeOAuthCallback?: (input: {
    provider: OAuthProvider;
    code: string;
    state: string;
    redirectUri: string;
    request: Request;
  }) => OAuthCallbackProfile | Promise<OAuthCallbackProfile>;
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

function appendSetCookie(headers: Record<string, string> | undefined, cookie: string): Record<string, string> {
  if (!headers) return { "set-cookie": cookie };
  const existing = headers["set-cookie"];
  if (!existing) return { ...headers, "set-cookie": cookie };
  return { ...headers, "set-cookie": `${existing}, ${cookie}` };
}

function resolveOAuthRedirectUri(request: Request, provider: OAuthProvider, basePath: string): string {
  const incoming = new URL(request.url);
  return `${incoming.origin}${basePath}/oauth/${provider}/callback`;
}

function oauthStateCookieName(provider: OAuthProvider): string {
  return `alesha_oauth_state_${provider}`;
}

function decodeOAuthState(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function generateOAuthState(): string {
  return b64url(randomBytes(24));
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

      if (method === "GET" && subPath === "/me") {
        const session = getSessionFromRequest(request);
        if (!session) return json(401, { error: "Unauthorized" });

        if (!options.getUser) return json(501, { error: "getUser is not configured" });

        const user = await options.getUser(session.userId);
        if (!user) return json(401, { error: "User not found" });

        const publicUser = toPublicUser(user);
        return json(200, { user: publicUser });
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

      if (method === "POST" && subPath === "/password-reset/request") {
        const body = await safeJson<{ email: string; ttlSeconds?: number }>(request);
        const token = await options.authService.issuePasswordResetToken({
          email: body.email,
          ttlSeconds: body.ttlSeconds,
        });

        return json(200, { token });
      }

      if (method === "POST" && subPath === "/password-reset/reset") {
        const body = await safeJson<{ token: string; newPassword: string }>(request);
        const ok = await options.authService.resetPassword({
          token: body.token,
          newPassword: body.newPassword,
        });

        if (!ok) return json(401, { error: "Invalid or expired token" });
        return json(200, { ok: true });
      }

      if (method === "GET" && subPath.startsWith("/oauth/") && subPath.endsWith("/authorize")) {
        const provider = subPath.split("/")[2] as OAuthProvider;

        if (!options.getOAuthAuthorizeUrl) {
          return json(501, { error: "OAuth authorize flow is not configured" });
        }

        const state = generateOAuthState();
        const redirectUri = resolveOAuthRedirectUri(request, provider, basePath);
        const location = await options.getOAuthAuthorizeUrl({
          provider,
          state,
          redirectUri,
          request,
        });

        const stateCookie = serializeCookie(oauthStateCookieName(provider), encodeURIComponent(state), {
          maxAge: 60 * 10,
          secure: secureCookie,
        });

        return new Response(null, {
          status: 302,
          headers: {
            location,
            "set-cookie": stateCookie,
          },
        });
      }

      if (method === "GET" && subPath.startsWith("/oauth/") && subPath.endsWith("/callback")) {
        const provider = subPath.split("/")[2] as OAuthProvider;

        if (!options.completeOAuthCallback) {
          return json(501, { error: "OAuth callback flow is not configured" });
        }

        const callbackUrl = new URL(request.url);
        const code = callbackUrl.searchParams.get("code")?.trim();
        const receivedState = callbackUrl.searchParams.get("state")?.trim();
        if (!code || !receivedState) {
          return json(400, { error: "Missing OAuth callback code or state" });
        }

        const cookies = parseCookies(request);
        const expectedStateRaw = cookies[oauthStateCookieName(provider)];
        const expectedState = expectedStateRaw ? decodeOAuthState(expectedStateRaw) : null;
        if (!expectedState || expectedState !== receivedState) {
          return json(400, { error: "Invalid OAuth state" });
        }

        const redirectUri = resolveOAuthRedirectUri(request, provider, basePath);
        const oauthProfile = await options.completeOAuthCallback({
          provider,
          code,
          state: receivedState,
          redirectUri,
          request,
        });

        const user = await options.authService.loginWithOAuth({
          provider,
          providerAccountId: oauthProfile.providerAccountId,
          email: oauthProfile.email,
          name: oauthProfile.name,
          image: oauthProfile.image,
          emailVerified: oauthProfile.emailVerified,
          roles: oauthProfile.roles,
        });

        const publicUser = toPublicUser(user);
        const session = newSession(publicUser);
        const clearStateCookie = serializeCookie(oauthStateCookieName(provider), "", {
          maxAge: 0,
          secure: secureCookie,
        });

        return json(
          200,
          { user: publicUser },
          appendSetCookie(
            {
              "set-cookie": serializeCookie(cookieName, sessionCookieValue(session), {
                maxAge: sessionTtlSeconds,
                secure: secureCookie,
              }),
            },
            clearStateCookie,
          ),
        );
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
