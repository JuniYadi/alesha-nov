import {
  type AuthService,
  type AuthUser,
  type LinkOAuthAccountInput,
  type LoginInput,
  type OAuthLoginInput,
  type OAuthProvider,
  type SignupInput,
  newId,
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

export interface RateLimiter {
  consume(key: string): Promise<{ success: boolean; limit: number; remaining: number; reset: number }>;
}

export interface RateLimitOptions {
  windowSeconds: number;
  maxRequests: number;
}

export interface AuthWebOptions {
  authService: AuthService;
  sessionSecret: string;
  basePath?: string;
  cookieName?: string;
  sessionTtlSeconds?: number;
  secureCookie?: boolean;
  /* Optional: rate limiting configuration or custom limiter. */
  rateLimit?: RateLimitOptions | RateLimiter;
  /* Optional: identify client for rate limiting (e.g., return IP). */
  getRateLimitKey?: (request: Request) => string | Promise<string>;
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
  /* Optional: CORS configuration. When omitted, CORS headers are not added. */
  cors?: CorsOptions;
}

export interface CorsOptions {
  /** Comma-separated or array of allowed origin(s). Use '*' for any origin (no credentials). */
  allowedOrigins: string | string[];
  /** Comma-separated or array of allowed HTTP methods. Defaults to GET,POST,PUT,DELETE,OPTIONS. */
  allowedMethods?: string | string[];
  /** Comma-separated or array of allowed request headers. */
  allowedHeaders?: string | string[];
  /** Whether to allow credentials (cookies/authorization). Cannot be true when origin is '*'. */
  allowCredentials?: boolean;
  /** Max-age for preflight cache in seconds. Defaults to 86400 (24 hours). */
  maxAge?: number;
}

export interface AuthSession {
  userId: string;
  sessionId: string;
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

// In-memory revocation list: hashed sessionId → revocation timestamp
const revokedSessions = new Map<string, number>();

function hashToken(token: string): string {
  return Buffer.from(token, "utf-8").toString("hex");
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

  // Check revocation list
  const tokenHash = hashToken(token);
  const revokedAt = revokedSessions.get(tokenHash);
  if (revokedAt !== undefined) return null;

  return parsed;
}

export function revokeSession(token: string): void {
  revokedSessions.set(hashToken(token), Date.now());
}

export function revokeAllUserTokens(_userId: string, allTokens: string[]): void {
  for (const tok of allTokens) {
    revokedSessions.set(hashToken(tok), Date.now());
  }
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

function json(status: number, body: unknown, extraHeaders?: Record<string, string>, responseCorsHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...JSON_HEADERS,
      ...(responseCorsHeaders ?? {}),
      ...(extraHeaders ?? {}),
    },
  });
}

function normalizeStringList(value: string | string[] | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  return value.split(",").map((s) => s.trim());
}

function buildCorsHeaders(request: Request, options: NonNullable<AuthWebOptions["cors"]>): Record<string, string> | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;

  const allowedOrigins = normalizeStringList(options.allowedOrigins);
  const isWildcard = allowedOrigins.includes("*");

  if (!isWildcard && !allowedOrigins.includes(origin)) {
    return null; // origin not allowed
  }

  const headers: Record<string, string> = {};

  if (isWildcard) {
    headers["access-control-allow-origin"] = "*";
  } else {
    headers["access-control-allow-origin"] = origin;
  }

  if (options.allowCredentials && !isWildcard) {
    headers["access-control-allow-credentials"] = "true";
  }

  if (options.allowedMethods?.length) {
    const methods = normalizeStringList(options.allowedMethods);
    headers["access-control-allow-methods"] = methods.join(", ");
  }

  if (options.allowedHeaders?.length) {
    const reqHeaders = request.headers.get("access-control-request-headers");
    if (reqHeaders) {
      headers["access-control-allow-headers"] = reqHeaders;
    }
  }

  if (options.maxAge !== undefined) {
    headers["access-control-max-age"] = String(options.maxAge);
  } else {
    headers["access-control-max-age"] = "86400";
  }

  return headers;
}

function buildSimpleCorsHeaders(options: NonNullable<AuthWebOptions["cors"]>, origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {};
  const allowedOrigins = normalizeStringList(options.allowedOrigins);
  const isWildcard = allowedOrigins.includes("*");

  if (isWildcard) {
    headers["access-control-allow-origin"] = "*";
  } else if (origin && allowedOrigins.includes(origin)) {
    headers["access-control-allow-origin"] = origin;
  }

  if (options.allowCredentials && !isWildcard) {
    headers["access-control-allow-credentials"] = "true";
  }

  return headers;
}

function toPublicUser(user: AuthUser): Omit<AuthUser, "passwordHash"> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...rest } = user;
  return rest;
}

class MemoryRateLimiter implements RateLimiter {
  private bucket: Map<string, { count: number; reset: number }> = new Map();

  constructor(private options: RateLimitOptions) {}

  async consume(key: string) {
    const now = Math.floor(Date.now() / 1000);
    const item = this.bucket.get(key);

    if (!item || item.reset <= now) {
      const reset = now + this.options.windowSeconds;
      this.bucket.set(key, { count: 1, reset });
      return { success: true, limit: this.options.maxRequests, remaining: this.options.maxRequests - 1, reset };
    }

    item.count++;
    const success = item.count <= this.options.maxRequests;
    const remaining = Math.max(0, this.options.maxRequests - item.count);
    return { success, limit: this.options.maxRequests, remaining, reset: item.reset };
  }
}

export function createAuthWeb(options: AuthWebOptions): AuthRouteHandlers {
  const basePath = normalizeBasePath(options.basePath);
  const cookieName = options.cookieName ?? "alesha_auth";
  const sessionTtlSeconds = options.sessionTtlSeconds ?? 60 * 60 * 24 * 7;
  const secureCookie = options.secureCookie ?? true;

  if (!options.sessionSecret || options.sessionSecret.length < 16) {
    throw new Error("sessionSecret is required and should be at least 16 chars");
  }

  const limiter: RateLimiter | null = options.rateLimit
    ? "consume" in options.rateLimit
      ? options.rateLimit
      : new MemoryRateLimiter(options.rateLimit)
    : null;

  async function checkRateLimit(request: Request) {
    if (!limiter) return null;
    const key = options.getRateLimitKey ? await options.getRateLimitKey(request) : "global";
    const result = await limiter.consume(key);
    if (!result.success) {
      return json(
        429,
        { error: "Too many requests" },
        {
          "x-ratelimit-limit": String(result.limit),
          "x-ratelimit-remaining": String(result.remaining),
          "x-ratelimit-reset": String(result.reset),
          "retry-after": String(Math.max(0, result.reset - Math.floor(Date.now() / 1000))),
        }
      );
    }
    return null;
  }

  function newSession(user: Omit<AuthUser, "passwordHash">): AuthSession {
    return {
      userId: user.id,
      sessionId: newId(),
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

  type ExtendedAuthService = AuthService & {
    issuePasswordResetToken?: (input: { email: string; ttlSeconds?: number }) => Promise<string>;
    resetPassword?: (input: { token: string; newPassword: string }) => Promise<boolean>;
    issueEmailVerificationToken?: (input: { email: string; ttlSeconds?: number }) => Promise<string>;
    verifyEmailVerificationToken?: (token: string) => Promise<AuthUser | null>;
  };

  const extendedAuthService = options.authService as ExtendedAuthService;

  async function route(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith(basePath)) {
      return json(404, { error: "Not found" });
    }

    const method = request.method.toUpperCase();
    const subPath = (url.pathname.slice(basePath.length) || "/").replace(/\/+$/, "") || "/";

    // CORS preflight (must be before try so CORS errors don't leak into catch scope)
    if (options.cors && method === "OPTIONS") {
      const preflightCorsHeaders = buildCorsHeaders(request, options.cors);
      if (preflightCorsHeaders) {
        return new Response(null, { status: 204, headers: preflightCorsHeaders });
      }
      const corsOrigin2 = request.headers.get("origin");
      const deniedCorsHeaders = corsOrigin2 ? buildSimpleCorsHeaders(options.cors, corsOrigin2) : {};
      return json(403, { error: "CORS not allowed" }, undefined, deniedCorsHeaders);
    }

    // Attach CORS headers to all responses when configured
    const corsOptions = options.cors;
    const corsOrigin = corsOptions ? request.headers.get("origin") : null;
    const responseCorsHeaders =
      corsOptions && corsOrigin
        ? buildSimpleCorsHeaders(corsOptions, corsOrigin)
        : {};

    try {
      if (!url.pathname.startsWith(basePath)) {
        return json(404, { error: "Not found" }, responseCorsHeaders);
      }

      if (method === "POST" && subPath === "/signup") {
        const limited = await checkRateLimit(request);
        if (limited) return limited;
        const body = await safeJson<SignupInput>(request);
        const user = await options.authService.signup(body);
        const publicUser = toPublicUser(user);
        const session = newSession(publicUser);

        return json(200, { user: publicUser }, {
          "set-cookie": serializeCookie(cookieName, sessionCookieValue(session), {
            maxAge: sessionTtlSeconds,
            secure: secureCookie,
          }),
          ...responseCorsHeaders,
        });
      }

      if (method === "POST" && subPath === "/login") {
        const limited = await checkRateLimit(request);
        if (limited) return limited;
        const body = await safeJson<LoginInput>(request);
        const user = await options.authService.login(body);
        if (!user) return json(401, { error: "Invalid credentials" }, responseCorsHeaders);

        const publicUser = toPublicUser(user);
        const session = newSession(publicUser);
        return json(200, { user: publicUser }, {
          "set-cookie": serializeCookie(cookieName, sessionCookieValue(session), {
            maxAge: sessionTtlSeconds,
            secure: secureCookie,
          }),
          ...responseCorsHeaders,
        });
      }

      if (method === "POST" && subPath === "/logout") {
        const session = getSessionFromRequest(request);
        if (session) {
          const cookies = parseCookies(request);
          const token = cookies[cookieName];
          if (token) revokeSession(token);
        }
        return json(200, { ok: true }, {
          "set-cookie": serializeCookie(cookieName, "", {
            maxAge: 0,
            secure: secureCookie,
          }),
        });
      }

      if (method === "POST" && subPath === "/sessions/revoke") {
        const session = getSessionFromRequest(request);
        if (!session) return json(401, { error: "Unauthorized" }, responseCorsHeaders);
        const cookies = parseCookies(request);
        const token = cookies[cookieName];
        if (token) revokeSession(token);
        return json(200, { ok: true }, responseCorsHeaders);
      }

      if (method === "POST" && subPath === "/sessions/revoke-all") {
        const session = getSessionFromRequest(request);
        if (!session) return json(401, { error: "Unauthorized" }, responseCorsHeaders);
        const body = await safeJson<{ tokens: string[] }>(request);
        if (!body.tokens || !Array.isArray(body.tokens)) {
          return json(400, { error: "tokens array is required" }, responseCorsHeaders);
        }
        revokeAllUserTokens(session.userId, body.tokens);
        return json(200, { ok: true }, responseCorsHeaders);
      }

      if (method === "GET" && subPath === "/session") {
        const session = getSessionFromRequest(request);
        if (!session) return json(401, { error: "Unauthorized" }, responseCorsHeaders);
        return json(200, { session }, responseCorsHeaders);
      }

      if (method === "GET" && subPath === "/me") {
        const session = getSessionFromRequest(request);
        if (!session) return json(401, { error: "Unauthorized" }, responseCorsHeaders);

        if (!options.getUser) return json(501, { error: "getUser is not configured" }, responseCorsHeaders);

        const user = await options.getUser(session.userId);
        if (!user) return json(401, { error: "User not found" }, responseCorsHeaders);

        const publicUser = toPublicUser(user);
        return json(200, { user: publicUser }, responseCorsHeaders);
      }

      if (method === "POST" && subPath === "/magic-link/request") {
        const limited = await checkRateLimit(request);
        if (limited) return limited;
        const body = await safeJson<{ email: string; ttlSeconds?: number }>(request);
        await options.authService.issueMagicLinkToken({
          email: body.email,
          ttlSeconds: body.ttlSeconds,
        });

        return json(200, { sent: true }, responseCorsHeaders);
      }

      if (method === "POST" && subPath === "/magic-link/verify") {
        const limited = await checkRateLimit(request);
        if (limited) return limited;
        const body = await safeJson<{ token: string }>(request);
        const user = await options.authService.verifyMagicLinkToken(body.token);
        if (!user) return json(401, { error: "Invalid or expired token" }, responseCorsHeaders);

        const publicUser = toPublicUser(user);
        const session = newSession(publicUser);

        return json(200, { user: publicUser }, {
          "set-cookie": serializeCookie(cookieName, sessionCookieValue(session), {
            maxAge: sessionTtlSeconds,
            secure: secureCookie,
          }),
          ...responseCorsHeaders,
        });
      }

      if (method === "POST" && subPath === "/password-reset/request") {
        const limited = await checkRateLimit(request);
        if (limited) return limited;
        const body = await safeJson<{ email: string; ttlSeconds?: number }>(request);
        if (!extendedAuthService.issuePasswordResetToken) {
          return json(501, { error: "Password reset flow is not configured" }, responseCorsHeaders);
        }

        const token = await extendedAuthService.issuePasswordResetToken({
          email: body.email,
          ttlSeconds: body.ttlSeconds,
        });

        return json(200, { token }, responseCorsHeaders);
      }

      if (method === "POST" && subPath === "/password-reset/reset") {
        const limited = await checkRateLimit(request);
        if (limited) return limited;
        const body = await safeJson<{ token: string; newPassword: string }>(request);
        if (!extendedAuthService.resetPassword) {
          return json(501, { error: "Password reset flow is not configured" }, responseCorsHeaders);
        }

        const ok = await extendedAuthService.resetPassword({
          token: body.token,
          newPassword: body.newPassword,
        });

        if (!ok) return json(401, { error: "Invalid or expired token" }, responseCorsHeaders);
        return json(200, { ok: true }, responseCorsHeaders);
      }

      if (method === "POST" && subPath === "/email-verification/request") {
        const limited = await checkRateLimit(request);
        if (limited) return limited;
        const body = await safeJson<{ email: string; ttlSeconds?: number }>(request);
        if (!extendedAuthService.issueEmailVerificationToken) {
          return json(501, { error: "Email verification flow is not configured" }, responseCorsHeaders);
        }

        const token = await extendedAuthService.issueEmailVerificationToken({
          email: body.email,
          ttlSeconds: body.ttlSeconds,
        });

        return json(200, { token }, responseCorsHeaders);
      }

      if (method === "POST" && subPath === "/email-verification/verify") {
        const limited = await checkRateLimit(request);
        if (limited) return limited;
        const body = await safeJson<{ token: string }>(request);
        if (!extendedAuthService.verifyEmailVerificationToken) {
          return json(501, { error: "Email verification flow is not configured" }, responseCorsHeaders);
        }

        const user = await extendedAuthService.verifyEmailVerificationToken(body.token);
        if (!user) return json(401, { error: "Invalid or expired token" }, responseCorsHeaders);

        const publicUser = toPublicUser(user);
        return json(200, { user: publicUser }, responseCorsHeaders);
      }

      if (method === "GET" && subPath.startsWith("/oauth/") && subPath.endsWith("/authorize")) {
        const provider = subPath.split("/")[2] as OAuthProvider;

        if (!options.getOAuthAuthorizeUrl) {
          return json(501, { error: "OAuth authorize flow is not configured" }, responseCorsHeaders);
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
            ...(Object.fromEntries(Object.entries(responseCorsHeaders).map(([k, v]) => [k, v]))),
          },
        });
      }

      if (method === "GET" && subPath.startsWith("/oauth/") && subPath.endsWith("/callback")) {
        const provider = subPath.split("/")[2] as OAuthProvider;

        if (!options.completeOAuthCallback) {
          return json(501, { error: "OAuth callback flow is not configured" }, responseCorsHeaders);
        }

        const callbackUrl = new URL(request.url);
        const code = callbackUrl.searchParams.get("code")?.trim();
        const receivedState = callbackUrl.searchParams.get("state")?.trim();
        if (!code || !receivedState) {
          return json(400, { error: "Missing OAuth callback code or state" }, responseCorsHeaders);
        }

        const cookies = parseCookies(request);
        const expectedStateRaw = cookies[oauthStateCookieName(provider)];
        const expectedState = expectedStateRaw ? decodeOAuthState(expectedStateRaw) : null;
        if (!expectedState || expectedState !== receivedState) {
          return json(400, { error: "Invalid OAuth state" }, responseCorsHeaders);
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
          {
            ...appendSetCookie(
              {
                "set-cookie": serializeCookie(cookieName, sessionCookieValue(session), {
                  maxAge: sessionTtlSeconds,
                  secure: secureCookie,
                }),
              },
              clearStateCookie,
            ),
            ...responseCorsHeaders,
          },
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
          ...responseCorsHeaders,
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

        return json(200, { account: linked }, responseCorsHeaders);
      }

      if (method === "GET" && subPath === "/linked-accounts") {
        const current = await authenticateFromSession(request);
        const linked = await options.authService.getLinkedAccounts(current.userId);
        return json(200, { accounts: linked }, responseCorsHeaders);
      }

      if (method === "PUT" && subPath === "/roles") {
        const current = await authenticateFromSession(request);
        const body = await safeJson<{ userId?: string; roles: string[] }>(request);
        const targetUserId = body.userId ?? current.userId;

        if (targetUserId !== current.userId && !current.roles.includes("support.write") && !current.roles.includes("billing.write")) {
          return json(403, { error: "Forbidden" }, responseCorsHeaders);
        }

        const roles = await options.authService.setUserRoles(targetUserId, body.roles ?? []);
        return json(200, { userId: targetUserId, roles }, responseCorsHeaders);
      }

      return json(404, { error: "Not found" }, responseCorsHeaders);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal error";
      const status = message === "Unauthorized" ? 401 : 400;
      return json(status, { error: message }, responseCorsHeaders);
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
